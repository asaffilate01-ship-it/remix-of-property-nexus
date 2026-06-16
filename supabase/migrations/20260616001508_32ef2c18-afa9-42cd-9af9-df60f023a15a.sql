
CREATE TABLE public.tenancy_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_lead boolean NOT NULL DEFAULT false,
  rent_share numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenancy_id, tenant_id)
);

CREATE INDEX idx_tenancy_tenants_tenancy ON public.tenancy_tenants(tenancy_id);
CREATE INDEX idx_tenancy_tenants_tenant ON public.tenancy_tenants(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancy_tenants TO authenticated;
GRANT ALL ON public.tenancy_tenants TO service_role;

ALTER TABLE public.tenancy_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members manage co-tenants on their agency tenancies"
ON public.tenancy_tenants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenancies t
    WHERE t.id = tenancy_tenants.tenancy_id
      AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenancies t
    WHERE t.id = tenancy_tenants.tenancy_id
      AND (t.agency_id IS NULL OR public.is_agency_member(t.agency_id, auth.uid()))
  )
);
