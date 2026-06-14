
-- Property geolocation
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- Stage + visit linkage on job_media
DO $$ BEGIN
  CREATE TYPE public.job_media_stage AS ENUM ('before','progress','after');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.job_media
  ADD COLUMN IF NOT EXISTS stage public.job_media_stage,
  ADD COLUMN IF NOT EXISTS visit_id uuid;

-- Visits: contractor check-in/out
CREATE TABLE IF NOT EXISTS public.work_order_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  worker_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  worker_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  worker_name text,
  worker_phone text,
  status text NOT NULL DEFAULT 'checked_in', -- checked_in | completed | cancelled
  check_in_at timestamptz NOT NULL DEFAULT now(),
  check_in_lat numeric,
  check_in_lng numeric,
  check_in_accuracy_m numeric,
  check_in_distance_m numeric,
  check_out_at timestamptz,
  check_out_lat numeric,
  check_out_lng numeric,
  check_out_accuracy_m numeric,
  notes text,
  signature_path text,
  duration_minutes integer,
  source text NOT NULL DEFAULT 'internal', -- internal | contractor_login | tokenised
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_visits TO authenticated;
GRANT ALL ON public.work_order_visits TO service_role;
ALTER TABLE public.work_order_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members manage visits" ON public.work_order_visits
  FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));

CREATE POLICY "worker manages own visits" ON public.work_order_visits
  FOR ALL TO authenticated
  USING (worker_user_id = auth.uid() OR worker_contact_id IN (SELECT public.current_user_contact_ids()))
  WITH CHECK (worker_user_id = auth.uid() OR worker_contact_id IN (SELECT public.current_user_contact_ids()));

CREATE TRIGGER trg_visits_updated BEFORE UPDATE ON public.work_order_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_visits_wo ON public.work_order_visits(work_order_id, check_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_agency ON public.work_order_visits(agency_id, status);

-- Tokenised share for contractors without a login
CREATE TABLE IF NOT EXISTS public.work_order_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  contractor_name text,
  contractor_phone text,
  contractor_email text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_share_tokens TO authenticated;
GRANT ALL ON public.work_order_share_tokens TO service_role;
ALTER TABLE public.work_order_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members manage share tokens" ON public.work_order_share_tokens
  FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_wost_token ON public.work_order_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_wost_wo ON public.work_order_share_tokens(work_order_id);
