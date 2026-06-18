
CREATE OR REPLACE FUNCTION public.is_property_tenant(_property uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenancies t
    WHERE t.property_id = _property AND t.tenant_user_id = _user
  )
$$;

DROP POLICY IF EXISTS "Tenants view their property" ON public.properties;
CREATE POLICY "Tenants view their property"
ON public.properties FOR SELECT
USING (public.is_property_tenant(id, auth.uid()));
