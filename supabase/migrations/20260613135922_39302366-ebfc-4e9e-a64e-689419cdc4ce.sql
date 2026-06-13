
-- Document scope enum
DO $$ BEGIN
  CREATE TYPE public.doc_scope AS ENUM ('property','landlord','tenant','tenancy','agency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  scope public.doc_scope NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenant_contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE CASCADE,
  name text NOT NULL,
  folder text NOT NULL DEFAULT 'General',
  mime_type text,
  size_bytes bigint,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_on date,
  retention text,
  tags text[] NOT NULL DEFAULT '{}',
  locked boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_agency ON public.documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_documents_property ON public.documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenancy ON public.documents(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_documents_landlord ON public.documents(landlord_contact_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON public.documents(tenant_contact_id);

-- Enforce exactly one scope target via trigger (CHECK constraints can't reference enum elegantly with NULLs)
CREATE OR REPLACE FUNCTION public.documents_validate_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.scope = 'property' AND NEW.property_id IS NULL THEN RAISE EXCEPTION 'property_id required for property-scoped document'; END IF;
  IF NEW.scope = 'landlord' AND NEW.landlord_contact_id IS NULL THEN RAISE EXCEPTION 'landlord_contact_id required for landlord-scoped document'; END IF;
  IF NEW.scope = 'tenant' AND NEW.tenant_contact_id IS NULL THEN RAISE EXCEPTION 'tenant_contact_id required for tenant-scoped document'; END IF;
  IF NEW.scope = 'tenancy' AND NEW.tenancy_id IS NULL THEN RAISE EXCEPTION 'tenancy_id required for tenancy-scoped document'; END IF;
  IF NEW.scope = 'agency' AND NEW.agency_id IS NULL THEN RAISE EXCEPTION 'agency_id required for agency-scoped document'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS documents_validate_scope_trg ON public.documents;
CREATE TRIGGER documents_validate_scope_trg BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_validate_scope();

DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Agency members manage everything for their agency
CREATE POLICY "Agency members manage documents" ON public.documents
  FOR ALL TO authenticated
  USING (
    (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
    OR (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))))
    OR (tenancy_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))))
    OR (landlord_contact_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = landlord_contact_id AND public.is_agency_member(c.agency_id, auth.uid())))
    OR (tenant_contact_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = tenant_contact_id AND public.is_agency_member(c.agency_id, auth.uid())))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
    OR (property_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))))
    OR (tenancy_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))))
    OR (landlord_contact_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = landlord_contact_id AND public.is_agency_member(c.agency_id, auth.uid())))
    OR (tenant_contact_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = tenant_contact_id AND public.is_agency_member(c.agency_id, auth.uid())))
  );

-- Tenant can read documents on their tenancy
CREATE POLICY "Tenant reads own tenancy documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    tenancy_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenancies t WHERE t.id = tenancy_id AND t.tenant_user_id = auth.uid()
    )
  );

-- Storage policies on documents bucket
CREATE POLICY "Authenticated upload to documents bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Read own-agency document objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND EXISTS (
      SELECT 1 FROM public.documents d WHERE d.storage_path = storage.objects.name
    )
  );

CREATE POLICY "Delete own-agency document objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents' AND EXISTS (
      SELECT 1 FROM public.documents d WHERE d.storage_path = storage.objects.name
    )
  );
