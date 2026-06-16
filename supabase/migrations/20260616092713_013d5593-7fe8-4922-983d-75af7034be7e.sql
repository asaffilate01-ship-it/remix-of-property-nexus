
-- 1) Tighten tenants policy
DROP POLICY IF EXISTS "Agency members manage tenants" ON public.tenants;
CREATE POLICY "Agency members manage tenants"
ON public.tenants FOR ALL TO authenticated
USING (
  (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
  OR (user_id IS NOT NULL AND user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
  OR (user_id IS NOT NULL AND user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2) Tighten documents policy — remove null-agency tenancy loophole
DROP POLICY IF EXISTS "Members and owners manage documents" ON public.documents;
CREATE POLICY "Members and owners manage documents"
ON public.documents FOR ALL TO authenticated
USING (
  (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
  OR (property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = documents.property_id
      AND (p.owner_id = auth.uid()
           OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))
  ))
  OR (tenancy_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tenancies t
    WHERE t.id = documents.tenancy_id
      AND t.agency_id IS NOT NULL
      AND public.is_agency_member(t.agency_id, auth.uid())
  ))
  OR (landlord_user_id IS NOT NULL AND landlord_user_id = auth.uid())
  OR (tenant_user_id IS NOT NULL AND tenant_user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
  OR (property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = documents.property_id
      AND (p.owner_id = auth.uid()
           OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))
  ))
  OR (tenancy_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tenancies t
    WHERE t.id = documents.tenancy_id
      AND t.agency_id IS NOT NULL
      AND public.is_agency_member(t.agency_id, auth.uid())
  ))
  OR (landlord_user_id IS NOT NULL AND landlord_user_id = auth.uid())
  OR (tenant_user_id IS NOT NULL AND tenant_user_id = auth.uid())
);

-- 3) Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.holiday_bookings;
ALTER PUBLICATION supabase_realtime DROP TABLE public.property_blocks;

-- 4) Allow agency members to read survey-media files for their agency
DROP POLICY IF EXISTS "survey agency members read" ON storage.objects;
CREATE POLICY "survey agency members read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'survey-media'
  AND EXISTS (
    SELECT 1 FROM public.survey_captures sc
    WHERE (sc.storage_path = storage.objects.name OR sc.thumb_path = storage.objects.name)
      AND sc.agency_id IS NOT NULL
      AND public.is_agency_member(sc.agency_id, auth.uid())
  )
);
