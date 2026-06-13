
CREATE POLICY "listing-photos owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "listing-photos owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-photos' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "listing-photos owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "listing-photos read all" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'listing-photos');
