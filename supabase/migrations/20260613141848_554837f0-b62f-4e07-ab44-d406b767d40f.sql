
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated read own or agency colleagues"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.agency_members m1
    JOIN public.agency_members m2 ON m2.agency_id = m1.agency_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.owner_id = auth.uid() AND (
      a.owner_id = profiles.id
      OR EXISTS (SELECT 1 FROM public.agency_members m WHERE m.agency_id = a.id AND m.user_id = profiles.id)
    )
  )
  OR public.has_role(auth.uid(),'admin')
);

DROP POLICY IF EXISTS "Agency members manage tenancies" ON public.tenancies;
CREATE POLICY "Agency members manage tenancies"
ON public.tenancies FOR ALL TO authenticated
USING (
  (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
  OR (agency_id IS NULL AND property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.properties p WHERE p.id = tenancies.property_id AND p.owner_id = auth.uid()
  ))
  OR public.has_role(auth.uid(),'admin')
)
WITH CHECK (
  (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()))
  OR (agency_id IS NULL AND property_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.properties p WHERE p.id = tenancies.property_id AND p.owner_id = auth.uid()
  ))
  OR public.has_role(auth.uid(),'admin')
);

DROP POLICY IF EXISTS "Agency members manage rent schedule" ON public.rent_schedule;
CREATE POLICY "Agency members manage rent schedule"
ON public.rent_schedule FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenancies t
    LEFT JOIN public.properties p ON p.id = t.property_id
    WHERE t.id = rent_schedule.tenancy_id
      AND (
        (t.agency_id IS NOT NULL AND public.is_agency_member(t.agency_id, auth.uid()))
        OR (t.agency_id IS NULL AND p.owner_id = auth.uid())
      )
  )
  OR public.has_role(auth.uid(),'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenancies t
    LEFT JOIN public.properties p ON p.id = t.property_id
    WHERE t.id = rent_schedule.tenancy_id
      AND (
        (t.agency_id IS NOT NULL AND public.is_agency_member(t.agency_id, auth.uid()))
        OR (t.agency_id IS NULL AND p.owner_id = auth.uid())
      )
  )
  OR public.has_role(auth.uid(),'admin')
);

ALTER TABLE public.compliance_records
  ADD CONSTRAINT compliance_records_scope_required
  CHECK (property_id IS NOT NULL OR agency_id IS NOT NULL OR tenancy_id IS NOT NULL) NOT VALID;

DROP POLICY IF EXISTS "Admins manage all roles" ON public.user_roles;
CREATE POLICY "Admins manage all roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated upload to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Read own-agency document objects" ON storage.objects;
DROP POLICY IF EXISTS "Delete own-agency document objects" ON storage.objects;

CREATE POLICY "Documents upload scoped to uploader"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Documents read with authorization"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.storage_path = storage.objects.name AND (
      (d.agency_id IS NOT NULL AND public.is_agency_member(d.agency_id, auth.uid()))
      OR d.landlord_user_id = auth.uid()
      OR d.tenant_user_id = auth.uid()
      OR (d.tenancy_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tenancies t WHERE t.id = d.tenancy_id AND (
          t.tenant_user_id = auth.uid()
          OR (t.agency_id IS NOT NULL AND public.is_agency_member(t.agency_id, auth.uid()))
        )
      ))
      OR (d.property_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.properties p WHERE p.id = d.property_id AND (
          p.owner_id = auth.uid()
          OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid()))
        )
      ))
      OR public.has_role(auth.uid(),'admin')
    )
  )
);

CREATE POLICY "Documents delete with authorization"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.storage_path = storage.objects.name AND (
      (d.agency_id IS NOT NULL AND public.is_agency_member(d.agency_id, auth.uid()))
      OR d.landlord_user_id = auth.uid()
      OR (d.tenancy_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tenancies t WHERE t.id = d.tenancy_id AND (
          t.agency_id IS NOT NULL AND public.is_agency_member(t.agency_id, auth.uid())
        )
      ))
      OR (d.property_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.properties p WHERE p.id = d.property_id AND (
          p.owner_id = auth.uid()
          OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid()))
        )
      ))
      OR public.has_role(auth.uid(),'admin')
    )
  )
);

CREATE POLICY "Referencing docs upload scoped to uploader"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'referencing-documents'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Referencing docs read authorized"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'referencing-documents'
  AND EXISTS (
    SELECT 1 FROM public.referencing_documents rd
    JOIN public.referencing_cases rc ON rc.id = rd.case_id
    WHERE rd.storage_path = storage.objects.name AND (
      rc.tenant_id = auth.uid()
      OR (rc.agency_id IS NOT NULL AND public.is_agency_member(rc.agency_id, auth.uid()))
      OR public.has_role(auth.uid(),'admin')
    )
  )
);

CREATE POLICY "Referencing docs delete authorized"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'referencing-documents'
  AND EXISTS (
    SELECT 1 FROM public.referencing_documents rd
    JOIN public.referencing_cases rc ON rc.id = rd.case_id
    WHERE rd.storage_path = storage.objects.name AND (
      (rc.agency_id IS NOT NULL AND public.is_agency_member(rc.agency_id, auth.uid()))
      OR public.has_role(auth.uid(),'admin')
    )
  )
);
