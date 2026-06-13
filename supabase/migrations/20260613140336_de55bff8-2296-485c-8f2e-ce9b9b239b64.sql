
CREATE TABLE IF NOT EXISTS public.referencing_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.referencing_cases(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('id_verification','credit_check','right_to_rent','employer_reference','landlord_reference','affordability','aml_pep_sanctions','open_banking')),
  provider text NOT NULL DEFAULT 'simulated',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','passed','failed','review','expired','cancelled')),
  score integer,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_ref text,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ref_checks_case ON public.referencing_checks(case_id);
CREATE INDEX IF NOT EXISTS idx_ref_checks_external ON public.referencing_checks(external_ref) WHERE external_ref IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencing_checks TO authenticated;
GRANT ALL ON public.referencing_checks TO service_role;

ALTER TABLE public.referencing_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rch: case parties read" ON public.referencing_checks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.referencing_cases c
    WHERE c.id = case_id AND (
      c.tenant_id = auth.uid()
      OR (c.agency_id IS NOT NULL AND public.is_agency_member(c.agency_id, auth.uid()))
    )
  ));

CREATE POLICY "rch: agency manage" ON public.referencing_checks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.referencing_cases c
    WHERE c.id = case_id AND c.agency_id IS NOT NULL AND public.is_agency_member(c.agency_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.referencing_cases c
    WHERE c.id = case_id AND c.agency_id IS NOT NULL AND public.is_agency_member(c.agency_id, auth.uid())
  ));

DROP TRIGGER IF EXISTS trg_ref_checks_updated ON public.referencing_checks;
CREATE TRIGGER trg_ref_checks_updated BEFORE UPDATE ON public.referencing_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
