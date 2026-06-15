
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, dedupe_key)
);

CREATE INDEX idx_alerts_agency_unread ON public.alerts(agency_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_alerts_user_unread ON public.alerts(user_id, created_at DESC) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view agency alerts" ON public.alerts
  FOR SELECT TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "members update agency alerts" ON public.alerts
  FOR UPDATE TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()) OR user_id = auth.uid());

CREATE POLICY "members insert agency alerts" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));

CREATE POLICY "members delete agency alerts" ON public.alerts
  FOR DELETE TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()));

CREATE TRIGGER trg_alerts_updated BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
