
-- ============== BRANCHES ==============
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  postcode text,
  phone text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches: agency members read" ON public.branches FOR SELECT TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()));
CREATE POLICY "branches: agency members write" ON public.branches FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_branches_agency ON public.branches(agency_id);

-- ============== MEMBER ↔ BRANCH ==============
CREATE TABLE public.agency_member_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.agency_members(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, branch_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_member_branches TO authenticated;
GRANT ALL ON public.agency_member_branches TO service_role;
ALTER TABLE public.agency_member_branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "amb: agency members read" ON public.agency_member_branches FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.branches b WHERE b.id = branch_id AND public.is_agency_member(b.agency_id, auth.uid())));
CREATE POLICY "amb: agency members write" ON public.agency_member_branches FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.branches b WHERE b.id = branch_id AND public.is_agency_member(b.agency_id, auth.uid())))
  WITH CHECK (EXISTS(SELECT 1 FROM public.branches b WHERE b.id = branch_id AND public.is_agency_member(b.agency_id, auth.uid())));

-- ============== ROLE PERMISSIONS ==============
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  role text NOT NULL,
  capability text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, role, capability)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rp: agency members read" ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()));
CREATE POLICY "rp: agency owners write" ON public.role_permissions FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.agencies a WHERE a.id = agency_id AND a.owner_id = auth.uid()))
  WITH CHECK (EXISTS(SELECT 1 FROM public.agencies a WHERE a.id = agency_id AND a.owner_id = auth.uid()));
CREATE TRIGGER trg_rp_updated BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Capability helper
CREATE OR REPLACE FUNCTION public.has_capability(_user uuid, _agency uuid, _capability text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS(SELECT 1 FROM public.agencies a WHERE a.id = _agency AND a.owner_id = _user)
    OR EXISTS(
      SELECT 1 FROM public.agency_members m
      JOIN public.role_permissions rp ON rp.agency_id = m.agency_id AND rp.role = m.role AND rp.capability = _capability
      WHERE m.agency_id = _agency AND m.user_id = _user AND rp.allowed = true
    );
$$;

-- ============== BRANCH ID ON CORE TABLES ==============
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.sales_deals ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_listings_branch ON public.listings(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_branch ON public.leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_properties_branch ON public.properties(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON public.sales_deals(branch_id);

-- ============== SAVED SEARCHES ==============
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  polygon jsonb,
  alert_email boolean NOT NULL DEFAULT true,
  alert_push boolean NOT NULL DEFAULT false,
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('instant','daily','weekly')),
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ss: owner all" ON public.saved_searches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_ss_updated BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_ss_user ON public.saved_searches(user_id);

CREATE TABLE public.saved_search_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  notified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saved_search_id, listing_id)
);
GRANT SELECT ON public.saved_search_matches TO authenticated;
GRANT ALL ON public.saved_search_matches TO service_role;
ALTER TABLE public.saved_search_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ssm: owner read" ON public.saved_search_matches FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.saved_searches s WHERE s.id = saved_search_id AND s.user_id = auth.uid()));

-- ============== REFERENCING ==============
CREATE TABLE public.referencing_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','in_review','approved','declined','withdrawn')),
  current_step int NOT NULL DEFAULT 1,
  applicant jsonb NOT NULL DEFAULT '{}'::jsonb,
  employment jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_landlord jsonb NOT NULL DEFAULT '{}'::jsonb,
  income_monthly numeric(12,2),
  credit_consent boolean NOT NULL DEFAULT false,
  decision text,
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencing_cases TO authenticated;
GRANT ALL ON public.referencing_cases TO service_role;
ALTER TABLE public.referencing_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc: tenant read/write own" ON public.referencing_cases FOR ALL TO authenticated
  USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "rc: agency read" ON public.referencing_cases FOR SELECT TO authenticated
  USING (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()));
CREATE POLICY "rc: agency decide" ON public.referencing_cases FOR UPDATE TO authenticated
  USING (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()));
CREATE TRIGGER trg_rc_updated BEFORE UPDATE ON public.referencing_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_rc_tenant ON public.referencing_cases(tenant_id);
CREATE INDEX idx_rc_agency ON public.referencing_cases(agency_id);

CREATE TABLE public.referencing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.referencing_cases(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  storage_path text NOT NULL,
  file_size int,
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referencing_documents TO authenticated;
GRANT ALL ON public.referencing_documents TO service_role;
ALTER TABLE public.referencing_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rd: case parties read" ON public.referencing_documents FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.referencing_cases c WHERE c.id = case_id
    AND (c.tenant_id = auth.uid() OR (c.agency_id IS NOT NULL AND public.is_agency_member(c.agency_id, auth.uid())))));
CREATE POLICY "rd: case parties write" ON public.referencing_documents FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.referencing_cases c WHERE c.id = case_id
    AND (c.tenant_id = auth.uid() OR (c.agency_id IS NOT NULL AND public.is_agency_member(c.agency_id, auth.uid())))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.referencing_cases c WHERE c.id = case_id
    AND (c.tenant_id = auth.uid() OR (c.agency_id IS NOT NULL AND public.is_agency_member(c.agency_id, auth.uid())))));

-- ============== BANK TRANSACTIONS ==============
CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  posted_at timestamptz NOT NULL DEFAULT now(),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  reference text,
  counterparty text,
  source text NOT NULL DEFAULT 'mock' CHECK (source IN ('mock','truelayer','plaid','manual','tink')),
  raw jsonb,
  matched_rent_schedule_id uuid REFERENCES public.rent_schedule(id) ON DELETE SET NULL,
  matched_tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  matched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt: agency members read" ON public.bank_transactions FOR SELECT TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()));
CREATE POLICY "bt: agency members write" ON public.bank_transactions FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE INDEX idx_bt_agency ON public.bank_transactions(agency_id, posted_at DESC);
CREATE INDEX idx_bt_match ON public.bank_transactions(matched_rent_schedule_id);

-- ============== LISTING MEDIA + AI COPY ==============
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS floorplan_url text,
  ADD COLUMN IF NOT EXISTS tour_url text,
  ADD COLUMN IF NOT EXISTS tour_image_path text,
  ADD COLUMN IF NOT EXISTS ai_copy_short text,
  ADD COLUMN IF NOT EXISTS ai_copy_long text,
  ADD COLUMN IF NOT EXISTS ai_copy_highlights jsonb,
  ADD COLUMN IF NOT EXISTS ai_copy_caption text,
  ADD COLUMN IF NOT EXISTS ai_copy_generated_at timestamptz;
