-- 1. Revoke direct client EXECUTE on internal SECURITY DEFINER helpers not called by clients
REVOKE EXECUTE ON FUNCTION public.get_agency_usage(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_agency_entitlements(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_agency_usage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_agency_entitlements(uuid) FROM PUBLIC;

-- 2. Explicitly lock service-role-only tables (defence in depth: no grants, no policies, RLS forced)
REVOKE ALL ON TABLE public.agency_invitations FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.billing_webhook_events FROM anon, authenticated, PUBLIC;
ALTER TABLE public.agency_invitations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events FORCE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.agency_invitations TO service_role;
GRANT ALL ON TABLE public.billing_webhook_events TO service_role;
COMMENT ON TABLE public.agency_invitations IS 'Service-role only: invitation token hashes. No client grants or policies by design; reads/writes go through accept_agency_invitation and server functions.';
COMMENT ON TABLE public.billing_webhook_events IS 'Service-role only: Stripe webhook event ledger. No client grants or policies by design.';

-- 3. Storage: documents uploads must match a real authorization scope
DROP POLICY IF EXISTS "Documents upload scoped to uploader" ON storage.objects;
CREATE POLICY "Documents upload scoped and authorized"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND split_part(name, '/', 1) = auth.uid()::text
  AND owner = auth.uid()
  AND (
    -- personal scope (landlord/tenant own files)
    split_part(name, '/', 2) NOT IN ('property', 'agency', 'tenancy')
    OR (
      split_part(name, '/', 2) = 'property'
      AND EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id::text = split_part(name, '/', 3)
          AND (p.owner_id = auth.uid()
               OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid()))
               OR public.is_property_tenant(p.id, auth.uid()))
      )
    )
    OR (
      split_part(name, '/', 2) = 'agency'
      AND EXISTS (
        SELECT 1 FROM public.agencies a
        WHERE a.id::text = split_part(name, '/', 3)
          AND public.is_agency_member(a.id, auth.uid())
      )
    )
    OR (
      split_part(name, '/', 2) = 'tenancy'
      AND EXISTS (
        SELECT 1 FROM public.tenancies t
        WHERE t.id::text = split_part(name, '/', 3)
          AND (t.tenant_user_id = auth.uid()
               OR (t.agency_id IS NOT NULL AND public.is_agency_member(t.agency_id, auth.uid())))
      )
    )
  )
);

-- 4. Storage: referencing document uploads require the uploader to be a party to a case
DROP POLICY IF EXISTS "Referencing docs upload scoped to uploader" ON storage.objects;
CREATE POLICY "Referencing docs upload case party only"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'referencing-documents'
  AND split_part(name, '/', 1) = auth.uid()::text
  AND owner = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.referencing_cases rc
    WHERE rc.tenant_id = auth.uid()
       OR (rc.agency_id IS NOT NULL AND public.is_agency_member(rc.agency_id, auth.uid()))
  )
);

-- 5. Survey media: bind stored objects to the uploading user and stop fabricated capture metadata
ALTER TABLE public.survey_captures
  DROP CONSTRAINT IF EXISTS survey_captures_storage_path_owner_prefix;
ALTER TABLE public.survey_captures
  ADD CONSTRAINT survey_captures_storage_path_owner_prefix
  CHECK (storage_path IS NULL OR split_part(storage_path, '/', 1) = user_id::text) NOT VALID;
