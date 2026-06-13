
-- VIEWINGS
DO $$ BEGIN
  CREATE TYPE public.viewing_status AS ENUM ('pending','confirmed','completed','no_show','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.viewing_feedback AS ENUM ('positive','negative','neutral','offer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.viewings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  applicant_name text NOT NULL,
  applicant_email text,
  applicant_phone text,
  agent_name text,
  agent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  status public.viewing_status NOT NULL DEFAULT 'pending',
  feedback public.viewing_feedback,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viewings_scheduled ON public.viewings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_viewings_listing ON public.viewings(listing_id);
CREATE INDEX IF NOT EXISTS idx_viewings_agency ON public.viewings(agency_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.viewings TO authenticated;
GRANT ALL ON public.viewings TO service_role;
ALTER TABLE public.viewings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and agency members view viewings" ON public.viewings FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners insert viewings" ON public.viewings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners and agency members update viewings" ON public.viewings FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())));
CREATE POLICY "Owners delete viewings" ON public.viewings FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_viewings_updated BEFORE UPDATE ON public.viewings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OFFERS
DO $$ BEGIN
  CREATE TYPE public.offer_status AS ENUM ('pending','accepted','rejected','withdrawn','countered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  buyer_email text,
  buyer_phone text,
  amount numeric(12,2) NOT NULL,
  financing text,
  position_in_chain integer,
  status public.offer_status NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_listing ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_agency ON public.offers(agency_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and agency members view offers" ON public.offers FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners insert offers" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners and agency members update offers" ON public.offers FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())));
CREATE POLICY "Owners delete offers" ON public.offers FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TENANCY EVENTS (lifecycle audit log)
DO $$ BEGIN
  CREATE TYPE public.tenancy_event_kind AS ENUM (
    'lead_captured','viewing_booked','viewing_completed','offer_made','offer_accepted',
    'references_requested','references_passed','tenancy_drafted','ast_signed',
    'deposit_received','deposit_protected','prescribed_info_served',
    'moved_in','rent_paid','renewal_offered','renewed',
    'notice_served','moved_out','deposit_returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tenancy_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind public.tenancy_event_kind NOT NULL,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenancy_events_tenancy ON public.tenancy_events(tenancy_id, occurred_at DESC);

GRANT SELECT, INSERT ON public.tenancy_events TO authenticated;
GRANT ALL ON public.tenancy_events TO service_role;
ALTER TABLE public.tenancy_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenancy stakeholders view events" ON public.tenancy_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenancies t
    LEFT JOIN public.properties p ON p.id = t.property_id
    WHERE t.id = tenancy_events.tenancy_id AND (
      (t.agency_id IS NOT NULL AND public.is_agency_member(t.agency_id, auth.uid()))
      OR (t.agency_id IS NULL AND p.owner_id = auth.uid())
      OR t.tenant_user_id = auth.uid()
      OR public.has_role(auth.uid(),'admin')
    )
  ));

CREATE POLICY "Tenancy stakeholders insert events" ON public.tenancy_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenancies t
    LEFT JOIN public.properties p ON p.id = t.property_id
    WHERE t.id = tenancy_events.tenancy_id AND (
      (t.agency_id IS NOT NULL AND public.is_agency_member(t.agency_id, auth.uid()))
      OR (t.agency_id IS NULL AND p.owner_id = auth.uid())
      OR public.has_role(auth.uid(),'admin')
    )
  ));
