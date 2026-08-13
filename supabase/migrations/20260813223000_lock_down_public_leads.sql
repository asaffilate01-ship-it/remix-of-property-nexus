-- Public enquiries now pass through validated, rate-limited server functions.
-- Remove the direct browser-to-database insert path so bots cannot bypass them.
REVOKE INSERT ON public.leads FROM anon;

DROP POLICY IF EXISTS "Anyone can submit leads" ON public.leads;

-- Service-role server functions bypass RLS. Authenticated workspace users retain
-- their existing read/update/delete policies, but cannot forge public enquiries.
