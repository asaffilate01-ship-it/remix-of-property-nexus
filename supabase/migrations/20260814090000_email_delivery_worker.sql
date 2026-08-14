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
  -- Recover jobs abandoned by a terminated worker.
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
