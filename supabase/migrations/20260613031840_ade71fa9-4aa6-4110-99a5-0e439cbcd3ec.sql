
-- ============ EXTEND ROOMS ============
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS size_sqm numeric,
  ADD COLUMN IF NOT EXISTS en_suite boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bills_included boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS description text;

-- ============ TENANCIES ============
CREATE TYPE public.tenancy_status AS ENUM ('draft','active','notice','ended');
CREATE TYPE public.rent_frequency AS ENUM ('weekly','monthly');

CREATE TABLE public.tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  tenant_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_name text NOT NULL,
  tenant_email text,
  tenant_phone text,
  start_date date NOT NULL,
  end_date date,
  rent_amount numeric NOT NULL,
  rent_frequency public.rent_frequency NOT NULL DEFAULT 'monthly',
  deposit numeric DEFAULT 0,
  deposit_scheme text,
  deposit_reference text,
  status public.tenancy_status NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancies TO authenticated;
GRANT ALL ON public.tenancies TO service_role;
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage tenancies" ON public.tenancies
  FOR ALL TO authenticated
  USING (agency_id IS NULL OR public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (agency_id IS NULL OR public.is_agency_member(agency_id, auth.uid()));

CREATE POLICY "Tenant can read own tenancy" ON public.tenancies
  FOR SELECT TO authenticated
  USING (tenant_user_id = auth.uid());

CREATE TRIGGER trg_tenancies_updated BEFORE UPDATE ON public.tenancies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RENT SCHEDULE ============
CREATE TYPE public.rent_status AS ENUM ('due','paid','overdue','waived');

CREATE TABLE public.rent_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  paid_amount numeric DEFAULT 0,
  paid_at timestamptz,
  status public.rent_status NOT NULL DEFAULT 'due',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rent_schedule_tenancy ON public.rent_schedule(tenancy_id);
CREATE INDEX idx_rent_schedule_due ON public.rent_schedule(due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_schedule TO authenticated;
GRANT ALL ON public.rent_schedule TO service_role;
ALTER TABLE public.rent_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage rent schedule" ON public.rent_schedule
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = rent_schedule.tenancy_id
    AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = rent_schedule.tenancy_id
    AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))));

CREATE POLICY "Tenant reads own rent" ON public.rent_schedule
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = rent_schedule.tenancy_id AND t.tenant_user_id = auth.uid()));

CREATE TRIGGER trg_rent_schedule_updated BEFORE UPDATE ON public.rent_schedule
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EXTEND COMPLIANCE_RECORDS ============
ALTER TABLE public.compliance_records
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reference text;

ALTER TABLE public.compliance_records ALTER COLUMN property_id DROP NOT NULL;

-- Drop existing restrictive policy and recreate to cover agency + tenancy scope
DROP POLICY IF EXISTS "Agency members manage compliance" ON public.compliance_records;

CREATE POLICY "Members manage compliance" ON public.compliance_records
  FOR ALL TO authenticated
  USING (
    (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.properties p
      WHERE p.id = compliance_records.property_id
      AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))))
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
    OR (tenancy_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenancies t
      WHERE t.id = compliance_records.tenancy_id
      AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))))
  )
  WITH CHECK (
    (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.properties p
      WHERE p.id = compliance_records.property_id
      AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))))
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
    OR (tenancy_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenancies t
      WHERE t.id = compliance_records.tenancy_id
      AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))))
  );

CREATE POLICY "Tenant reads own tenancy compliance" ON public.compliance_records
  FOR SELECT TO authenticated
  USING (tenancy_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenancies t
    WHERE t.id = compliance_records.tenancy_id AND t.tenant_user_id = auth.uid()));

-- ============ COMPLIANCE RULES REFERENCE ============
CREATE TABLE public.compliance_rules (
  type public.compliance_type PRIMARY KEY,
  label text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('property','tenancy','agency')),
  renewal_months int,
  description text,
  authority text
);

GRANT SELECT ON public.compliance_rules TO authenticated, anon;
GRANT ALL ON public.compliance_rules TO service_role;
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads rules" ON public.compliance_rules FOR SELECT USING (true);

INSERT INTO public.compliance_rules (type, label, scope, renewal_months, description, authority) VALUES
  ('gas_safety','Gas Safety Certificate (CP12)','property',12,'Annual gas safety check by Gas Safe registered engineer.','Gas Safety (Installation and Use) Regs 1998'),
  ('eicr','Electrical Installation Condition Report','property',60,'EICR every 5 years; copy to tenants within 28 days.','Electrical Safety Standards 2020'),
  ('epc','Energy Performance Certificate','property',120,'EPC valid 10 years; rented homes must be E or above (MEES).','MEES Regulations 2018'),
  ('pat','Portable Appliance Testing','property',12,'Test landlord-supplied portable appliances annually.','PUWER 1998'),
  ('legionella','Legionella Risk Assessment','property',24,'Recommended every 2 years; review on system change.','HSG274 / L8 ACoP'),
  ('hmo_licence','HMO Licence','property',60,'Mandatory HMO licence for 5+ occupants forming 2+ households.','Housing Act 2004'),
  ('selective_licence','Selective Licence','property',60,'Some councils require selective licensing in designated areas.','Housing Act 2004 Part 3'),
  ('fire_risk_assessment','Fire Risk Assessment','property',12,'Required for HMOs; reviewed annually or after change.','Regulatory Reform (Fire Safety) Order 2005'),
  ('emergency_lighting','Emergency Lighting Test','property',12,'Annual full discharge test where fitted.','BS 5266-1'),
  ('fire_door_check','Fire Door Inspection','property',12,'Annual fire door check (quarterly in common parts).','Fire Safety Act 2021'),
  ('right_to_rent','Right to Rent Check','tenancy',NULL,'Identity & RtR check before tenancy starts.','Immigration Act 2014'),
  ('ast','Assured Shorthold Tenancy','tenancy',NULL,'Signed AST agreement on file.','Housing Act 1988'),
  ('how_to_rent','How to Rent Guide','tenancy',NULL,'Latest guide issued at tenancy start.','Deregulation Act 2015'),
  ('deposit_protection','Deposit Protection','tenancy',NULL,'Protect within 30 days in DPS/MyDeposits/TDS; serve Prescribed Info.','Housing Act 2004'),
  ('inventory','Check-in Inventory','tenancy',NULL,'Signed inventory & schedule of condition.',NULL),
  ('cmp','Client Money Protection','agency',12,'CMP membership for agencies holding client money.','Client Money Protection Schemes Regs 2019'),
  ('redress','Property Redress Scheme','agency',12,'Membership of TPO or PRS.','Enterprise & Regulatory Reform Act 2013'),
  ('aml','AML Supervision','agency',12,'HMRC AML supervision for sales / high-value letting agents.','Money Laundering Regs 2017'),
  ('pi_insurance','Professional Indemnity Insurance','agency',12,'Active PI cover for the agency.',NULL),
  ('ico','ICO Registration','agency',12,'Annual ICO data protection fee.','Data Protection Act 2018');
