-- Gabley deal intelligence add-on. Property/deal data remains in Gabley;
-- Omniqora stores intelligence runs and DOMUREVA stores regeneration/funding cases.
BEGIN;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS omniqora_tenant_id uuid;

CREATE TABLE IF NOT EXISTS public.deal_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 240),
  postcode text,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','seller','agent','auction','omniqora_scout','domureva')),
  asking_price numeric(14,2) CHECK (asking_price IS NULL OR asking_price >= 0),
  purchase_price numeric(14,2) NOT NULL CHECK (purchase_price >= 0),
  conservative_exit_value numeric(14,2) NOT NULL CHECK (conservative_exit_value >= 0),
  works_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (works_cost >= 0),
  other_costs numeric(14,2) NOT NULL DEFAULT 0 CHECK (other_costs >= 0),
  investor_profit_target numeric(14,2) NOT NULL DEFAULT 0 CHECK (investor_profit_target >= 0),
  proposed_fee numeric(14,2) NOT NULL DEFAULT 0 CHECK (proposed_fee >= 0),
  fee_disclosed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'research'
    CHECK (status IN ('research','seller_contact','qualified','deal_room','matched','offer','conveyancing','completed','rejected','archived')),
  ai_run_id uuid,
  domureva_case_ref text,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deal_opportunities_agency_status_idx
  ON public.deal_opportunities(agency_id,status,updated_at DESC);

CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES public.buyers(id) ON DELETE CASCADE,
  investor_ref text NOT NULL,
  min_budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (min_budget >= 0),
  max_budget numeric(14,2) NOT NULL CHECK (max_budget >= min_budget),
  areas text[] NOT NULL DEFAULT '{}',
  strategies text[] NOT NULL DEFAULT '{}',
  funding_status text NOT NULL DEFAULT 'unknown'
    CHECK (funding_status IN ('unknown','cash_verified','aip','bridging_ready','mortgage','other')),
  completion_days integer CHECK (completion_days IS NULL OR completion_days BETWEEN 1 AND 365),
  min_profit_target numeric(14,2) CHECK (min_profit_target IS NULL OR min_profit_target >= 0),
  min_yield numeric(7,4) CHECK (min_yield IS NULL OR min_yield >= 0),
  accepts_refurbishment boolean NOT NULL DEFAULT false,
  accepts_council_scheme boolean NOT NULL DEFAULT false,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id,investor_ref)
);

CREATE INDEX IF NOT EXISTS investor_profiles_agency_active_idx
  ON public.investor_profiles(agency_id,active,max_budget);

CREATE TABLE IF NOT EXISTS public.deal_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.deal_opportunities(id) ON DELETE CASCADE,
  investor_profile_id uuid NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested','reviewed','introduced','declined','offer','matched')),
  human_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  human_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id,investor_profile_id)
);

ALTER TABLE public.deal_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_matches ENABLE ROW LEVEL SECURITY;

GRANT SELECT,INSERT,UPDATE,DELETE ON public.deal_opportunities TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.investor_profiles TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.deal_matches TO authenticated;
GRANT ALL ON public.deal_opportunities,public.investor_profiles,public.deal_matches TO service_role;

DROP POLICY IF EXISTS "deal opportunities agency access" ON public.deal_opportunities;
CREATE POLICY "deal opportunities agency access" ON public.deal_opportunities
FOR ALL TO authenticated
USING (EXISTS(
  SELECT 1 FROM public.agencies a
  WHERE a.id=agency_id AND (a.owner_id=auth.uid() OR public.is_agency_member(a.id,auth.uid()))
))
WITH CHECK (EXISTS(
  SELECT 1 FROM public.agencies a
  WHERE a.id=agency_id AND (a.owner_id=auth.uid() OR public.is_agency_member(a.id,auth.uid()))
));

DROP POLICY IF EXISTS "investor profiles agency access" ON public.investor_profiles;
CREATE POLICY "investor profiles agency access" ON public.investor_profiles
FOR ALL TO authenticated
USING (EXISTS(
  SELECT 1 FROM public.agencies a
  WHERE a.id=agency_id AND (a.owner_id=auth.uid() OR public.is_agency_member(a.id,auth.uid()))
))
WITH CHECK (EXISTS(
  SELECT 1 FROM public.agencies a
  WHERE a.id=agency_id AND (a.owner_id=auth.uid() OR public.is_agency_member(a.id,auth.uid()))
));

DROP POLICY IF EXISTS "deal matches agency access" ON public.deal_matches;
CREATE POLICY "deal matches agency access" ON public.deal_matches
FOR ALL TO authenticated
USING (EXISTS(
  SELECT 1 FROM public.agencies a
  WHERE a.id=agency_id AND (a.owner_id=auth.uid() OR public.is_agency_member(a.id,auth.uid()))
))
WITH CHECK (EXISTS(
  SELECT 1 FROM public.agencies a
  WHERE a.id=agency_id AND (a.owner_id=auth.uid() OR public.is_agency_member(a.id,auth.uid()))
));

DROP TRIGGER IF EXISTS deal_opportunities_updated_at ON public.deal_opportunities;
CREATE TRIGGER deal_opportunities_updated_at BEFORE UPDATE ON public.deal_opportunities
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS investor_profiles_updated_at ON public.investor_profiles;
CREATE TRIGGER investor_profiles_updated_at BEFORE UPDATE ON public.investor_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS deal_matches_updated_at ON public.deal_matches;
CREATE TRIGGER deal_matches_updated_at BEFORE UPDATE ON public.deal_matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
