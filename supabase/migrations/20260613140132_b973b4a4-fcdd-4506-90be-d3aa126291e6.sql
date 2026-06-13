
DROP POLICY IF EXISTS "Agency members manage documents" ON public.documents;
DROP POLICY IF EXISTS "Members and owners manage documents" ON public.documents;
DROP POLICY IF EXISTS "Tenant reads own tenancy documents" ON public.documents;

ALTER TABLE public.documents DROP COLUMN IF EXISTS landlord_contact_id;
ALTER TABLE public.documents DROP COLUMN IF EXISTS tenant_contact_id;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS landlord_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tenant_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_landlord_user ON public.documents(landlord_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_user ON public.documents(tenant_user_id);

CREATE OR REPLACE FUNCTION public.documents_validate_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.scope = 'property' AND NEW.property_id IS NULL THEN RAISE EXCEPTION 'property_id required'; END IF;
  IF NEW.scope = 'landlord' AND NEW.landlord_user_id IS NULL THEN RAISE EXCEPTION 'landlord_user_id required'; END IF;
  IF NEW.scope = 'tenant' AND NEW.tenant_user_id IS NULL THEN RAISE EXCEPTION 'tenant_user_id required'; END IF;
  IF NEW.scope = 'tenancy' AND NEW.tenancy_id IS NULL THEN RAISE EXCEPTION 'tenancy_id required'; END IF;
  IF NEW.scope = 'agency' AND NEW.agency_id IS NULL THEN RAISE EXCEPTION 'agency_id required'; END IF;
  RETURN NEW;
END $$;

CREATE POLICY "Members and owners manage documents" ON public.documents
  FOR ALL TO authenticated
  USING (
    (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
    OR (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))))
    OR (tenancy_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))))
    OR (landlord_user_id IS NOT NULL AND landlord_user_id = auth.uid())
    OR (tenant_user_id IS NOT NULL AND tenant_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
    OR (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))))
    OR (tenancy_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))))
    OR (landlord_user_id IS NOT NULL AND landlord_user_id = auth.uid())
    OR (tenant_user_id IS NOT NULL AND tenant_user_id = auth.uid())
  );

CREATE POLICY "Tenant reads own tenancy documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    tenancy_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND t.tenant_user_id = auth.uid()
    )
  );
