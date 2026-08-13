CREATE TABLE IF NOT EXISTS public.email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name text NOT NULL DEFAULT 'transactional_emails',
  template_name text,
  recipient_email text NOT NULL,
  subject text,
  html text,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  error text,
  sent_at timestamptz,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_outbox TO authenticated;
GRANT ALL ON public.email_outbox TO service_role;

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_outbox_admin_read" ON public.email_outbox;
CREATE POLICY "email_outbox_admin_read" ON public.email_outbox
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS email_outbox_status_idx ON public.email_outbox (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.enqueue_email(
  queue_name text,
  template_name text,
  recipient_email text,
  template_data jsonb DEFAULT '{}'::jsonb,
  idempotency_key text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.email_outbox (queue_name, template_name, recipient_email, template_data, idempotency_key)
  VALUES (queue_name, template_name, recipient_email, coalesce(template_data,'{}'::jsonb), idempotency_key)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_email(
  queue_name text,
  payload jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.email_outbox (queue_name, template_name, recipient_email, subject, html, template_data, idempotency_key)
  VALUES (
    queue_name,
    payload->>'template_name',
    payload->>'recipient_email',
    payload->>'subject',
    payload->>'html',
    coalesce(payload->'template_data','{}'::jsonb),
    payload->>'idempotency_key'
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_email(text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, text, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;