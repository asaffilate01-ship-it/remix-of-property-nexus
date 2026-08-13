-- Agency SaaS subscriptions, trials and server-enforced plan limits.
CREATE TABLE IF NOT EXISTS public.agency_subscriptions (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'starter'
    CHECK (plan_code IN ('starter', 'growth', 'unlimited')),
  status text NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),
  stripe_environment text CHECK (stripe_environment IN ('sandbox', 'live')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  stripe_checkout_session_id text,
  checkout_expires_at timestamptz,
  branch_quantity integer NOT NULL DEFAULT 1 CHECK (branch_quantity > 0),
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agency_subscriptions_stripe_customer_uq
  ON public.agency_subscriptions (stripe_environment, stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agency_subscriptions_stripe_subscription_uq
  ON public.agency_subscriptions (stripe_environment, stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.agency_subscriptions TO authenticated;
GRANT ALL ON public.agency_subscriptions TO service_role;

DROP POLICY IF EXISTS "Agency members read subscription" ON public.agency_subscriptions;
CREATE POLICY "Agency members read subscription"
  ON public.agency_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agencies a
      WHERE a.id = agency_id
        AND (a.owner_id = auth.uid() OR public.is_agency_member(a.id, auth.uid()))
    )
  );

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id text PRIMARY KEY,
  stripe_environment text NOT NULL CHECK (stripe_environment IN ('sandbox', 'live')),
  event_type text NOT NULL,
  object_id text,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed')),
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.billing_webhook_events TO service_role;

-- Branch count changes affect Stripe quantity. Force writes through the
-- authenticated server functions so browser clients cannot bypass billing sync.
REVOKE INSERT, UPDATE, DELETE ON public.branches FROM authenticated;
DROP POLICY IF EXISTS "branches: agency members write" ON public.branches;

CREATE OR REPLACE FUNCTION public.start_agency_subscription_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agency_subscriptions (
    agency_id, plan_code, status, trial_start, trial_end
  ) VALUES (
    NEW.id, 'starter', 'trialing', now(), now() + interval '30 days'
  ) ON CONFLICT (agency_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agencies_start_subscription_trial ON public.agencies;
DROP TRIGGER IF EXISTS aa_agencies_start_subscription_trial ON public.agencies;
CREATE TRIGGER aa_agencies_start_subscription_trial
AFTER INSERT ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.start_agency_subscription_trial();

INSERT INTO public.agency_subscriptions (
  agency_id, plan_code, status, trial_start, trial_end
)
SELECT id, 'starter', 'trialing', now(), now() + interval '30 days'
FROM public.agencies
ON CONFLICT (agency_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_agency_listing_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub public.agency_subscriptions%ROWTYPE;
  listing_limit integer;
  live_count integer;
  is_live boolean;
  was_live boolean := false;
BEGIN
  is_live := NEW.marketplace_publish = true
    AND NEW.status::text IN ('published', 'under_offer', 'let_agreed');

  IF TG_OP = 'UPDATE' THEN
    was_live := OLD.marketplace_publish = true
      AND OLD.status::text IN ('published', 'under_offer', 'let_agreed');
  END IF;

  IF NOT is_live OR (
    TG_OP = 'UPDATE'
    AND was_live
    AND NEW.agency_id IS NOT DISTINCT FROM OLD.agency_id
    AND NEW.branch_id IS NOT DISTINCT FROM OLD.branch_id
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO sub
  FROM public.agency_subscriptions
  WHERE agency_id = NEW.agency_id
  FOR UPDATE;

  IF NOT FOUND OR sub.status NOT IN ('trialing', 'active', 'past_due') THEN
    RAISE EXCEPTION 'An active subscription is required to publish listings'
      USING ERRCODE = 'P0001';
  END IF;

  IF sub.status = 'trialing' AND (sub.trial_end IS NULL OR sub.trial_end <= now()) THEN
    RAISE EXCEPTION 'The subscription trial has expired'
      USING ERRCODE = 'P0001';
  END IF;

  listing_limit := CASE sub.plan_code
    WHEN 'starter' THEN 3
    WHEN 'growth' THEN 10
    ELSE NULL
  END;

  IF listing_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO live_count
  FROM public.listings l
  WHERE l.agency_id = NEW.agency_id
    AND l.branch_id IS NOT DISTINCT FROM NEW.branch_id
    AND l.marketplace_publish = true
    AND l.status::text IN ('published', 'under_offer', 'let_agreed')
    AND l.id <> NEW.id;

  IF live_count >= listing_limit THEN
    RAISE EXCEPTION 'Your % plan allows % live listings per branch', sub.plan_code, listing_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_enforce_subscription_entitlement ON public.listings;
CREATE TRIGGER listings_enforce_subscription_entitlement
BEFORE INSERT OR UPDATE OF status, marketplace_publish, agency_id, branch_id
ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_agency_listing_entitlement();

CREATE OR REPLACE FUNCTION public.enforce_agency_user_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub public.agency_subscriptions%ROWTYPE;
  user_limit integer;
  current_users integer;
BEGIN
  -- The existing agency creation trigger inserts the owner as a member. The
  -- owner always consumes the first seat and must not be blocked while the
  -- sibling trial trigger is still running.
  IF EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = NEW.agency_id AND a.owner_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO sub
  FROM public.agency_subscriptions
  WHERE agency_id = NEW.agency_id
  FOR UPDATE;

  IF NOT FOUND OR sub.status NOT IN ('trialing', 'active', 'past_due') THEN
    RAISE EXCEPTION 'An active subscription is required to add team members'
      USING ERRCODE = 'P0001';
  END IF;

  IF sub.status = 'trialing' AND (sub.trial_end IS NULL OR sub.trial_end <= now()) THEN
    RAISE EXCEPTION 'The subscription trial has expired'
      USING ERRCODE = 'P0001';
  END IF;

  user_limit := CASE sub.plan_code
    WHEN 'starter' THEN 3
    WHEN 'growth' THEN 10
    ELSE NULL
  END;
  IF user_limit IS NULL THEN RETURN NEW; END IF;

  SELECT count(DISTINCT user_id) INTO current_users
  FROM (
    SELECT a.owner_id AS user_id
    FROM public.agencies a WHERE a.id = NEW.agency_id
    UNION
    SELECT m.user_id
    FROM public.agency_members m WHERE m.agency_id = NEW.agency_id
  ) users;

  IF current_users >= user_limit AND NOT EXISTS (
    SELECT 1 FROM public.agency_members m
    WHERE m.agency_id = NEW.agency_id AND m.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Your % plan allows % agency team seats', sub.plan_code, user_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agency_members_enforce_subscription_entitlement ON public.agency_members;
CREATE TRIGGER agency_members_enforce_subscription_entitlement
BEFORE INSERT OR UPDATE OF agency_id, user_id ON public.agency_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_agency_user_entitlement();

CREATE OR REPLACE FUNCTION public.get_agency_entitlements(_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub public.agency_subscriptions%ROWTYPE;
  has_access boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = _agency_id
      AND (a.owner_id = auth.uid() OR public.is_agency_member(a.id, auth.uid()))
  ) AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO sub FROM public.agency_subscriptions WHERE agency_id = _agency_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  has_access := sub.status IN ('active', 'past_due')
    OR (sub.status = 'trialing' AND sub.trial_end > now());

  RETURN jsonb_build_object(
    'planCode', sub.plan_code,
    'status', sub.status,
    'hasAccess', has_access,
    'trialEnd', sub.trial_end,
    'maxLiveListingsPerBranch', CASE sub.plan_code WHEN 'starter' THEN 3 WHEN 'growth' THEN 10 ELSE NULL END,
    'maxTeamSeats', CASE sub.plan_code WHEN 'starter' THEN 3 WHEN 'growth' THEN 10 ELSE NULL END,
    'hmo', has_access,
    'sales', has_access,
    'reports', has_access,
    'api', false,
    'whiteLabel', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_agency_entitlements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_agency_entitlements(uuid) TO authenticated, service_role;

CREATE TRIGGER agency_subscriptions_updated_at
BEFORE UPDATE ON public.agency_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER billing_webhook_events_updated_at
BEFORE UPDATE ON public.billing_webhook_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
