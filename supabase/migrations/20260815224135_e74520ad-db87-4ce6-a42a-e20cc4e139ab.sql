-- Operational UK GDPR rights workflow.
CREATE TABLE public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_type text NOT NULL CHECK (request_type IN (
    'access', 'portability', 'erasure', 'restriction', 'objection'
  )),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'identity_verification', 'in_progress', 'completed', 'refused', 'withdrawn'
  )),
  details text CHECK (details IS NULL OR length(details) <= 2000),
  response_summary text CHECK (response_summary IS NULL OR length(response_summary) <= 4000),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  identity_verified_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT privacy_request_due_after_submission CHECK (due_at >= submitted_at)
);

CREATE UNIQUE INDEX privacy_requests_one_active_type_per_user
  ON public.privacy_requests (user_id, request_type)
  WHERE status IN ('submitted', 'identity_verification', 'in_progress');
CREATE INDEX privacy_requests_user_submitted_idx
  ON public.privacy_requests (user_id, submitted_at DESC);
CREATE INDEX privacy_requests_ops_due_idx
  ON public.privacy_requests (status, due_at)
  WHERE status IN ('submitted', 'identity_verification', 'in_progress');

CREATE TABLE public.privacy_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.privacy_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('submitted', 'status_changed')),
  from_status text,
  to_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX privacy_request_events_request_created_idx
  ON public.privacy_request_events (request_id, created_at);

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_request_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.privacy_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.privacy_request_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.privacy_requests TO authenticated;
GRANT INSERT (user_id, request_type, details) ON public.privacy_requests TO authenticated;
GRANT UPDATE (status, response_summary) ON public.privacy_requests TO authenticated;
GRANT SELECT ON public.privacy_request_events TO authenticated;
GRANT ALL ON public.privacy_requests, public.privacy_request_events TO service_role;

CREATE POLICY privacy_requests_select_own_or_admin
  ON public.privacy_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY privacy_requests_submit_own
  ON public.privacy_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY privacy_requests_admin_update
  ON public.privacy_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY privacy_request_events_select_own_or_admin
  ON public.privacy_request_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.privacy_requests request
      WHERE request.id = privacy_request_events.request_id
        AND request.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.log_privacy_request_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.privacy_request_events (
      request_id, actor_id, event_type, from_status, to_status
    ) VALUES (NEW.id, auth.uid(), 'submitted', NULL, NEW.status);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.privacy_request_events (
      request_id, actor_id, event_type, from_status, to_status
    ) VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_privacy_request_event() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_privacy_request_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NOT (
    (OLD.status = 'submitted' AND NEW.status IN ('identity_verification', 'refused', 'withdrawn'))
    OR (OLD.status = 'identity_verification' AND NEW.status IN ('in_progress', 'refused', 'withdrawn'))
    OR (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'refused'))
  ) THEN
    RAISE EXCEPTION 'Invalid privacy request status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status IN ('completed', 'refused')
    AND nullif(btrim(NEW.response_summary), '') IS NULL THEN
    RAISE EXCEPTION 'A response summary is required to close a privacy request'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'in_progress' THEN
    NEW.identity_verified_at := now();
  END IF;

  IF NEW.status IN ('completed', 'refused', 'withdrawn') THEN
    NEW.completed_at := coalesce(NEW.completed_at, now());
  ELSE
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_privacy_request_transition()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER privacy_requests_validate_transition
  BEFORE UPDATE ON public.privacy_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_privacy_request_transition();

CREATE TRIGGER privacy_requests_updated_at
  BEFORE UPDATE ON public.privacy_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER privacy_requests_event_log
  AFTER INSERT OR UPDATE OF status ON public.privacy_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_privacy_request_event();

CREATE OR REPLACE FUNCTION public.withdraw_privacy_request(_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _changed integer;
BEGIN
  UPDATE public.privacy_requests
  SET status = 'withdrawn', completed_at = now()
  WHERE id = _request_id
    AND user_id = auth.uid()
    AND status IN ('submitted', 'identity_verification');

  GET DIAGNOSTICS _changed = ROW_COUNT;
  RETURN _changed = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_privacy_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_privacy_request(uuid) TO authenticated;

COMMENT ON TABLE public.privacy_requests IS
  'UK GDPR data-subject requests with one-month target dates and fail-closed user/admin RLS.';
COMMENT ON TABLE public.privacy_request_events IS
  'Append-only status history for privacy request operational evidence.';