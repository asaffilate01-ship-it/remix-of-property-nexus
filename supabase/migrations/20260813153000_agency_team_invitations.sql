-- Secure, expiring agency team invitations with subscription seat reservations.
CREATE TABLE IF NOT EXISTS public.agency_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(trim(email)) AND length(email) BETWEEN 3 AND 254),
  role text NOT NULL DEFAULT 'agent'
    CHECK (role IN ('manager', 'agent', 'accounts', 'viewer')),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS agency_invitations_one_pending_email_uq
  ON public.agency_invitations (agency_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS agency_invitations_agency_created_idx
  ON public.agency_invitations (agency_id, created_at DESC);

ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agency_invitations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.agency_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_agency_invitation_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub public.agency_subscriptions%ROWTYPE;
  seat_limit integer;
  occupied_seats integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = NEW.agency_id AND a.owner_id = NEW.invited_by
  ) THEN
    RAISE EXCEPTION 'Only the agency owner can invite team members'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO sub
  FROM public.agency_subscriptions
  WHERE agency_id = NEW.agency_id
  FOR UPDATE;

  IF NOT FOUND OR sub.status NOT IN ('trialing', 'active', 'past_due') THEN
    RAISE EXCEPTION 'An active subscription is required to invite team members'
      USING ERRCODE = 'P0001';
  END IF;
  IF sub.status = 'trialing' AND (sub.trial_end IS NULL OR sub.trial_end <= now()) THEN
    RAISE EXCEPTION 'The subscription trial has expired'
      USING ERRCODE = 'P0001';
  END IF;

  seat_limit := CASE sub.plan_code
    WHEN 'starter' THEN 3
    WHEN 'growth' THEN 10
    ELSE NULL
  END;
  IF seat_limit IS NULL THEN RETURN NEW; END IF;

  SELECT
    (SELECT count(DISTINCT members.user_id)
      FROM (
        SELECT a.owner_id AS user_id FROM public.agencies a WHERE a.id = NEW.agency_id
        UNION
        SELECT m.user_id FROM public.agency_members m WHERE m.agency_id = NEW.agency_id
      ) members)
    +
    (SELECT count(*) FROM public.agency_invitations i
      WHERE i.agency_id = NEW.agency_id
        AND i.accepted_at IS NULL
        AND i.revoked_at IS NULL
        AND i.expires_at > now())
  INTO occupied_seats;

  IF occupied_seats >= seat_limit THEN
    RAISE EXCEPTION 'Your % plan allows % agency team seats', sub.plan_code, seat_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agency_invitations_enforce_entitlement ON public.agency_invitations;
CREATE TRIGGER agency_invitations_enforce_entitlement
BEFORE INSERT ON public.agency_invitations
FOR EACH ROW EXECUTE FUNCTION public.enforce_agency_invitation_entitlement();

REVOKE ALL ON FUNCTION public.enforce_agency_invitation_entitlement() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_agency_invitation(
  _token_hash text,
  _user_id uuid,
  _email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation public.agency_invitations%ROWTYPE;
BEGIN
  SELECT * INTO invitation
  FROM public.agency_invitations
  WHERE token_hash = _token_hash
  FOR UPDATE;

  IF NOT FOUND
    OR invitation.accepted_at IS NOT NULL
    OR invitation.revoked_at IS NOT NULL
    OR invitation.expires_at <= now() THEN
    RAISE EXCEPTION 'This invitation is invalid or has expired'
      USING ERRCODE = 'P0001';
  END IF;
  IF lower(trim(_email)) <> invitation.email THEN
    RAISE EXCEPTION 'Sign in with the email address that was invited'
      USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.owner_id = _user_id AND a.id <> invitation.agency_id
  ) OR EXISTS (
    SELECT 1 FROM public.agency_members m
    WHERE m.user_id = _user_id AND m.agency_id <> invitation.agency_id
  ) THEN
    RAISE EXCEPTION 'This account already belongs to another agency'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.agency_members (agency_id, user_id, role)
  VALUES (invitation.agency_id, _user_id, invitation.role)
  ON CONFLICT (agency_id, user_id)
  DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.profiles
  SET primary_role = 'agent'::public.app_role
  WHERE id = _user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'agent'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.agency_invitations
  SET accepted_at = now(), accepted_by = _user_id
  WHERE id = invitation.id;

  RETURN invitation.agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_agency_invitation(text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_agency_invitation(text, uuid, text)
  TO service_role;
