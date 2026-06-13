ALTER POLICY "Owners update listings"
ON public.listings
WITH CHECK (
  (auth.uid() = owner_id)
  OR (
    agency_id IS NOT NULL
    AND is_agency_member(agency_id, auth.uid())
  )
);