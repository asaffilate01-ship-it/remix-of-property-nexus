ALTER TABLE public.email_outbox
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS provider_message_id text;

CREATE INDEX IF NOT EXISTS email_outbox_delivery_idx
  ON public.email_outbox (status, next_attempt_at, created_at);

CREATE OR REPLACE FUNCTION public.claim_email_outbox(_limit integer DEFAULT 25)
RETURNS SETOF public.email_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_outbox
  SET status = 'queued', locked_at = NULL
  WHERE status = 'processing'
    AND locked_at < now() - interval '15 minutes'
    AND attempts < 5;

  UPDATE public.email_outbox
  SET status = 'failed', locked_at = NULL, error = coalesce(error, 'retry_limit_reached')
  WHERE status = 'processing'
    AND locked_at < now() - interval '15 minutes'
    AND attempts >= 5;

  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.email_outbox
    WHERE status = 'queued'
      AND next_attempt_at <= now()
      AND attempts < 5
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT greatest(1, least(coalesce(_limit, 25), 100))
  )
  UPDATE public.email_outbox AS outbox
  SET status = 'processing',
      attempts = outbox.attempts + 1,
      locked_at = now(),
      last_attempt_at = now(),
      error = NULL
  FROM candidates
  WHERE outbox.id = candidates.id
  RETURNING outbox.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_email_outbox(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_outbox(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_signature_request_emails(_instance_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  instance_row public.template_instances%ROWTYPE;
  queued_count integer;
BEGIN
  SELECT * INTO instance_row
  FROM public.template_instances
  WHERE id = _instance_id
  FOR UPDATE;

  IF instance_row.id IS NULL THEN
    RAISE EXCEPTION 'Signing request was not found';
  END IF;
  IF NOT public.is_agency_member(instance_row.agency_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF instance_row.status IN ('void', 'signed') THEN
    RAISE EXCEPTION 'Signing request is not deliverable';
  END IF;

  INSERT INTO public.email_outbox (
    queue_name, template_name, recipient_email, template_data, idempotency_key
  )
  SELECT
    'transactional_emails',
    'signature-request',
    signature.signer_email,
    jsonb_build_object(
      'instance_id', instance_row.id,
      'recipient', signature.signer_name,
      'document_title', coalesce(instance_row.title, 'Document'),
      'signing_path', '/sign/' || signature.token,
      'expires_on', instance_row.expires_on
    ),
    'signature:' || instance_row.id::text || ':' || signature.id::text
  FROM public.template_signatures AS signature
  WHERE signature.instance_id = instance_row.id
    AND signature.status = 'pending'
  ON CONFLICT (idempotency_key) DO NOTHING;

  SELECT count(*)::integer INTO queued_count
  FROM public.email_outbox
  WHERE idempotency_key LIKE 'signature:' || instance_row.id::text || ':%';

  IF queued_count > 0 THEN
    UPDATE public.template_instances
    SET status = 'delivery_queued', updated_at = now()
    WHERE id = instance_row.id;
  END IF;

  RETURN queued_count;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_signature_request_emails(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.queue_signature_request_emails(uuid) TO authenticated;

ALTER TABLE public.email_outbox
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;

CREATE TABLE IF NOT EXISTS public.email_delivery_events (
  svix_id text PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN (
    'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced',
    'email.complained', 'email.suppressed', 'email.failed', 'email.opened', 'email.clicked'
  )),
  provider_message_id text NOT NULL,
  recipient_hash text NOT NULL CHECK (recipient_hash ~ '^[0-9a-f]{64}$'),
  event_created_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_delivery_events TO authenticated;
GRANT ALL ON public.email_delivery_events TO service_role;

CREATE INDEX IF NOT EXISTS email_delivery_events_provider_idx
  ON public.email_delivery_events (provider_message_id, event_created_at DESC);

ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_delivery_events_admin_read" ON public.email_delivery_events;
CREATE POLICY "email_delivery_events_admin_read" ON public.email_delivery_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email_hash text PRIMARY KEY CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  masked_email text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('email.bounced', 'email.complained', 'email.suppressed')),
  provider_message_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_suppressions TO authenticated;
GRANT ALL ON public.email_suppressions TO service_role;

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_suppressions_admin_read" ON public.email_suppressions;
CREATE POLICY "email_suppressions_admin_read" ON public.email_suppressions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_email_delivery_event(
  _svix_id text,
  _event_type text,
  _provider_message_id text,
  _recipient_hash text,
  _masked_email text,
  _event_created_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF _event_type NOT IN (
    'email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced',
    'email.complained', 'email.suppressed', 'email.failed', 'email.opened', 'email.clicked'
  ) OR _recipient_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid email delivery event';
  END IF;

  INSERT INTO public.email_delivery_events (
    svix_id, event_type, provider_message_id, recipient_hash, event_created_at
  ) VALUES (
    _svix_id, _event_type, _provider_message_id, _recipient_hash, _event_created_at
  )
  ON CONFLICT (svix_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 0 THEN
    RETURN false;
  END IF;

  IF _event_type IN ('email.bounced', 'email.complained', 'email.suppressed') THEN
    INSERT INTO public.email_suppressions (
      email_hash, masked_email, reason, provider_message_id, active, updated_at
    ) VALUES (
      _recipient_hash, left(_masked_email, 320), _event_type, _provider_message_id, true, now()
    )
    ON CONFLICT (email_hash) DO UPDATE SET
      masked_email = excluded.masked_email,
      reason = excluded.reason,
      provider_message_id = excluded.provider_message_id,
      active = true,
      updated_at = now();
  END IF;

  UPDATE public.email_outbox
  SET status = CASE
        WHEN _event_type = 'email.bounced' THEN 'bounced'
        WHEN _event_type = 'email.complained' THEN 'complained'
        WHEN _event_type = 'email.suppressed' THEN 'suppressed'
        WHEN _event_type = 'email.failed' THEN 'failed'
        WHEN _event_type = 'email.delivery_delayed' THEN 'delivery_delayed'
        WHEN _event_type IN ('email.delivered', 'email.opened', 'email.clicked') THEN 'delivered'
        WHEN _event_type = 'email.sent' THEN 'sent'
        ELSE status
      END,
      last_event_at = _event_created_at,
      error = CASE
        WHEN _event_type IN ('email.bounced', 'email.complained', 'email.suppressed', 'email.failed')
          THEN replace(_event_type, 'email.', 'provider_')
        WHEN _event_type IN ('email.delivered', 'email.opened', 'email.clicked') THEN NULL
        ELSE error
      END
  WHERE provider_message_id = _provider_message_id
    AND (last_event_at IS NULL OR last_event_at <= _event_created_at)
    AND NOT (
      status IN ('bounced', 'complained', 'suppressed')
      AND _event_type NOT IN ('email.bounced', 'email.complained', 'email.suppressed')
    );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_email_delivery_event(text, text, text, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_email_delivery_event(text, text, text, text, text, timestamptz)
  TO service_role;