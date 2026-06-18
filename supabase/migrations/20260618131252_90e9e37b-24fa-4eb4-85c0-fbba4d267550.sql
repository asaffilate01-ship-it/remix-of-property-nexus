
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS bio jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tenant_compliance jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.buyer_property_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.buyer_profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'interested'
    CHECK (status IN ('interested','viewing_booked','offer_made','mou_signed','exchanged','completed','withdrawn')),
  mou_signed_on date,
  mou_amount numeric,
  mou_doc_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, property_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_property_interests TO authenticated;
GRANT ALL ON public.buyer_property_interests TO service_role;

ALTER TABLE public.buyer_property_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage buyer interests"
  ON public.buyer_property_interests
  FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
    OR EXISTS (SELECT 1 FROM public.buyer_profiles b WHERE b.id = buyer_property_interests.buyer_id AND public.is_agency_member(b.agency_id, auth.uid()))
  )
  WITH CHECK (
    created_by = auth.uid()
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
    OR EXISTS (SELECT 1 FROM public.buyer_profiles b WHERE b.id = buyer_property_interests.buyer_id AND public.is_agency_member(b.agency_id, auth.uid()))
  );

CREATE TRIGGER trg_buyer_property_interests_updated
  BEFORE UPDATE ON public.buyer_property_interests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_bpi_buyer ON public.buyer_property_interests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bpi_property ON public.buyer_property_interests(property_id);
