
-- =========================================
-- PROPERTY TYPES LOOKUP
-- =========================================
CREATE TABLE public.property_types (
  code text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('residential','commercial','land','other')),
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.property_types TO authenticated, anon;
GRANT ALL ON public.property_types TO service_role;
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read property types" ON public.property_types FOR SELECT USING (true);

INSERT INTO public.property_types (code, label, category, sort_order) VALUES
  ('detached','Detached house','residential',10),
  ('semi-detached','Semi-detached house','residential',20),
  ('terraced','Terraced house','residential',30),
  ('end-of-terrace','End of terrace house','residential',35),
  ('flat','Flat / Apartment','residential',40),
  ('maisonette','Maisonette','residential',50),
  ('bungalow','Bungalow','residential',60),
  ('cottage','Cottage','residential',70),
  ('mews','Mews house','residential',80),
  ('townhouse','Townhouse','residential',90),
  ('park-home','Park home','residential',100),
  ('studio','Studio','residential',110),
  ('hmo','HMO (House in Multiple Occupation)','residential',120),
  ('block-of-flats','Block of flats','residential',130),
  ('new-build','New build','residential',140),
  ('shared-ownership','Shared ownership','residential',150),
  ('retirement','Retirement property','residential',160),
  ('office','Office','commercial',200),
  ('retail','Retail unit','commercial',210),
  ('industrial','Industrial unit','commercial',220),
  ('warehouse','Warehouse','commercial',230),
  ('mixed-use','Mixed use','commercial',240),
  ('hospitality','Pub / Restaurant / Hotel','commercial',250),
  ('healthcare','Healthcare premises','commercial',260),
  ('leisure','Leisure facility','commercial',270),
  ('land-residential','Residential development land','land',300),
  ('land-commercial','Commercial development land','land',310),
  ('land-agricultural','Agricultural land','land',320),
  ('garage','Garage / Parking','other',400),
  ('other','Other','other',999);

ALTER TABLE public.properties ADD COLUMN property_type_code text REFERENCES public.property_types(code);
ALTER TABLE public.listings ADD COLUMN property_type_code text REFERENCES public.property_types(code);
CREATE INDEX idx_properties_ptype ON public.properties(property_type_code);
CREATE INDEX idx_listings_ptype ON public.listings(property_type_code);

-- =========================================
-- TENANTS
-- =========================================
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  dob date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenants_agency ON public.tenants(agency_id);
CREATE INDEX idx_tenants_user ON public.tenants(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage tenants" ON public.tenants FOR ALL
  USING (agency_id IS NULL OR public.is_agency_member(agency_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (agency_id IS NULL OR public.is_agency_member(agency_id, auth.uid()) OR user_id = auth.uid());

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill: create a tenant per existing tenancy and link
ALTER TABLE public.tenancies ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

INSERT INTO public.tenants (id, agency_id, user_id, full_name, email, phone)
SELECT gen_random_uuid(), t.agency_id, t.tenant_user_id, t.tenant_name, t.tenant_email, t.tenant_phone
FROM public.tenancies t
WHERE t.tenant_name IS NOT NULL;

UPDATE public.tenancies te
SET tenant_id = tn.id
FROM public.tenants tn
WHERE te.tenant_name = tn.full_name
  AND (te.agency_id IS NOT DISTINCT FROM tn.agency_id)
  AND te.tenant_id IS NULL;

CREATE INDEX idx_tenancies_tenant ON public.tenancies(tenant_id);

-- =========================================
-- BUYER PROFILES
-- =========================================
CREATE TABLE public.buyer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  budget_min numeric,
  budget_max numeric,
  areas text[] NOT NULL DEFAULT '{}',
  property_type_codes text[] NOT NULL DEFAULT '{}',
  bedrooms_min int,
  finance_status text CHECK (finance_status IN ('cash','mortgage','aip','unknown')) DEFAULT 'unknown',
  chain_status text CHECK (chain_status IN ('no-chain','in-chain','first-time-buyer','unknown')) DEFAULT 'unknown',
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_buyers_agency ON public.buyer_profiles(agency_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_profiles TO authenticated;
GRANT ALL ON public.buyer_profiles TO service_role;
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage buyers" ON public.buyer_profiles FOR ALL
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE TRIGGER trg_buyers_updated BEFORE UPDATE ON public.buyer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- SELLER PROFILES
-- =========================================
CREATE TABLE public.seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  asking_price numeric,
  reason text,
  target_completion date,
  chain_status text CHECK (chain_status IN ('no-chain','in-chain','onward-purchase','unknown')) DEFAULT 'unknown',
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sellers_agency ON public.seller_profiles(agency_id);
CREATE INDEX idx_sellers_property ON public.seller_profiles(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_profiles TO authenticated;
GRANT ALL ON public.seller_profiles TO service_role;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage sellers" ON public.seller_profiles FOR ALL
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE TRIGGER trg_sellers_updated BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- TEMPLATES
-- =========================================
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'UK-wide',
  authority text,
  description text,
  body text NOT NULL DEFAULT '',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  signers text[] NOT NULL DEFAULT '{}',
  pages int NOT NULL DEFAULT 1,
  is_system boolean NOT NULL DEFAULT false,
  version int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, code, version)
);
CREATE INDEX idx_templates_agency ON public.templates(agency_id);
CREATE INDEX idx_templates_category ON public.templates(category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read system or own-agency templates" ON public.templates FOR SELECT
  USING (
    (is_system = true AND agency_id IS NULL)
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
  );
CREATE POLICY "Agency members write templates" ON public.templates FOR INSERT
  WITH CHECK (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()));
CREATE POLICY "Agency members update templates" ON public.templates FOR UPDATE
  USING (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()));
CREATE POLICY "Agency members delete templates" ON public.templates FOR DELETE
  USING (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()));
CREATE TRIGGER trg_templates_updated BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed system templates
INSERT INTO public.templates (agency_id, code, name, category, jurisdiction, authority, description, signers, pages, is_system, fields) VALUES
  (NULL,'ast','Assured Shorthold Tenancy (AST)','Tenancy','England & Wales','Housing Act 1988','Standard fixed-term AST including prescribed information and break clauses.', ARRAY['Landlord','Tenant','Agent'], 14, true, '[{"key":"start_date","label":"Start date","type":"date","required":true},{"key":"end_date","label":"End date","type":"date","required":true},{"key":"rent_amount","label":"Monthly rent","type":"number","required":true},{"key":"deposit","label":"Deposit","type":"number"}]'::jsonb),
  (NULL,'section21','Section 21 Notice','Notices','England & Wales','Housing Act 1988 s.21','Two-month no-fault possession notice (Form 6A).', ARRAY['Landlord','Agent'], 3, true, '[{"key":"notice_date","label":"Notice date","type":"date","required":true},{"key":"expiry_date","label":"Expiry date","type":"date","required":true}]'::jsonb),
  (NULL,'section8','Section 8 Notice','Notices','England & Wales','Housing Act 1988 s.8','Possession notice citing statutory grounds.', ARRAY['Landlord','Agent'], 4, true, '[{"key":"grounds","label":"Grounds","type":"textarea","required":true}]'::jsonb),
  (NULL,'deposit-prescribed','Deposit Prescribed Information','Deposits','England & Wales','Housing Act 2004','Mandatory deposit protection prescribed information.', ARRAY['Landlord','Tenant'], 6, true, '[{"key":"scheme","label":"Protection scheme","type":"select","options":["DPS","MyDeposits","TDS"],"required":true},{"key":"reference","label":"Protection reference","type":"text"}]'::jsonb),
  (NULL,'right-to-rent','Right to Rent Check Record','Right to Rent','England','Immigration Act 2014','Statutory right to rent check record for English tenancies.', ARRAY['Agent'], 2, true, '[{"key":"check_date","label":"Check date","type":"date","required":true},{"key":"doc_type","label":"Document type","type":"text","required":true}]'::jsonb),
  (NULL,'inventory','Inventory & Schedule of Condition','Inventory','UK-wide',NULL,'Move-in inventory with room-by-room schedule of condition.', ARRAY['Landlord','Tenant','Agent'], 12, true, '[]'::jsonb),
  (NULL,'gas-safety-reminder','Gas Safety Renewal Reminder','Compliance','UK-wide','Gas Safety (Installation and Use) Regulations 1998','Landlord notification that the annual gas safety check is due.', ARRAY['Landlord'], 1, true, '[]'::jsonb),
  (NULL,'epc-request','EPC Request','Compliance','UK-wide','Energy Performance of Buildings Regulations 2012','Order/refresh of the Energy Performance Certificate.', ARRAY['Landlord','Agent'], 1, true, '[]'::jsonb),
  (NULL,'work-order','Maintenance Work Order','Maintenance','UK-wide',NULL,'Instruction to a contractor with scope, access, and pricing.', ARRAY['Agent','Contractor'], 2, true, '[{"key":"scope","label":"Scope","type":"textarea","required":true},{"key":"budget","label":"Budget","type":"number"}]'::jsonb),
  (NULL,'memo-of-sale','Sales Memorandum','Sales','UK-wide',NULL,'Memorandum of sale issued to both solicitors at offer acceptance.', ARRAY['Agent','Buyer','Vendor'], 3, true, '[{"key":"agreed_price","label":"Agreed price","type":"number","required":true}]'::jsonb),
  (NULL,'offer-letter','Offer Letter','Sales','UK-wide',NULL,'Formal offer notification to vendor.', ARRAY['Agent'], 1, true, '[{"key":"offer_amount","label":"Offer amount","type":"number","required":true}]'::jsonb),
  (NULL,'completion-statement','Completion Statement','Sales','UK-wide',NULL,'Statement of monies on completion for the vendor.', ARRAY['Agent','Vendor'], 2, true, '[]'::jsonb);

-- =========================================
-- TEMPLATE INSTANCES
-- =========================================
CREATE TABLE public.template_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE RESTRICT,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.sales_deals(id) ON DELETE SET NULL,
  recipient_contact_ids uuid[] NOT NULL DEFAULT '{}',
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','void')),
  pdf_storage_path text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tinst_agency ON public.template_instances(agency_id);
CREATE INDEX idx_tinst_template ON public.template_instances(template_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_instances TO authenticated;
GRANT ALL ON public.template_instances TO service_role;
ALTER TABLE public.template_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage template instances" ON public.template_instances FOR ALL
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE TRIGGER trg_tinst_updated BEFORE UPDATE ON public.template_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
