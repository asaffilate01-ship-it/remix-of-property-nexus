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
