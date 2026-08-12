CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  identifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_lookup ON public.rate_limits (bucket, identifier, created_at DESC);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_rate_limit(_bucket text, _identifier text, _limit integer, _window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  DELETE FROM public.rate_limits
   WHERE created_at < now() - make_interval(secs => greatest(_window_seconds, 60) * 10);

  SELECT count(*) INTO _count
    FROM public.rate_limits
   WHERE bucket = _bucket
     AND identifier = _identifier
     AND created_at > now() - make_interval(secs => _window_seconds);

  IF _count >= _limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limits (bucket, identifier) VALUES (_bucket, _identifier);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;