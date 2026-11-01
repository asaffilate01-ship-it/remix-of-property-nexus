-- HM Land Registry Price Paid Data: England and Wales completed sales.
-- OGL v3; category B is retained for provenance but excluded from standard comps.
-- Import via service-role-only apply_deal_hmlr_changes; never from browser clients.
BEGIN;

CREATE TABLE public.deal_hmlr_sales (
  transaction_id text PRIMARY KEY CHECK (length(transaction_id) BETWEEN 1 AND 120),
  source_release_on date NOT NULL,
  record_status char(1) NOT NULL CHECK (record_status IN ('A','C','D')),
  sold_at date,
  price numeric(14,2),
  postcode text,
  outcode text,
  property_code char(1),
  new_build char(1),
  tenure char(1),
  paon text,
  saon text,
  street text,
  locality text,
  town text,
  district text,
  county text,
  category char(1),
  imported_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    record_status = 'D'
    OR (
      sold_at IS NOT NULL AND price BETWEEN 1000 AND 100000000
      AND postcode IS NOT NULL AND outcode IS NOT NULL
      AND property_code IN ('D','S','T','F','O')
      AND category IN ('A','B')
    )
  )
);
CREATE INDEX deal_hmlr_sales_region_date_idx
 ON public.deal_hmlr_sales(outcode, sold_at DESC)
 WHERE record_status <> 'D' AND category = 'A';
CREATE INDEX deal_hmlr_sales_postcode_date_idx
 ON public.deal_hmlr_sales(postcode, sold_at DESC)
 WHERE record_status <> 'D' AND category = 'A';

ALTER TABLE public.deal_hmlr_sales ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.deal_hmlr_sales TO authenticated;
GRANT ALL ON public.deal_hmlr_sales TO service_role;

CREATE POLICY "hmlr prices only for authorised sourcing staff"
  ON public.deal_hmlr_sales FOR SELECT TO authenticated
  USING (EXISTS(
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = (SELECT auth.uid()) AND r.role IN ('agent','admin')
  ));

-- Batches are applied atomically and sorted by release; a later monthly deletion
-- cannot be undone by a historical backfill or an out-of-order retry.
CREATE OR REPLACE FUNCTION public.apply_deal_hmlr_changes(
  _release_on date,
  _changes jsonb
)
RETURNS TABLE(applied integer, ignored integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  entry jsonb;
  transaction text;
  status char(1);
  post text;
  outward text;
  amount numeric;
  sold date;
  changed integer := 0;
  ignored_count integer := 0;
  current_release date;
BEGIN
  IF _release_on IS NULL OR _release_on > current_date + 1
    OR _release_on < DATE '1995-01-01'
    OR jsonb_typeof(_changes) <> 'array'
    OR jsonb_array_length(_changes) < 1 OR jsonb_array_length(_changes) > 400 THEN
    RAISE EXCEPTION 'Invalid HM Land Registry import batch';
  END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(_changes)
  LOOP
    transaction := NULLIF(trim(entry->>'transaction_id'), '');
    status := entry->>'record_status';
    IF transaction IS NULL OR length(transaction) > 120
      OR transaction !~ '^[A-Za-z0-9-]+$'
      OR status NOT IN ('A','C','D') THEN
      RAISE EXCEPTION 'Invalid Price Paid transaction identifier or status';
    END IF;
    SELECT s.source_release_on INTO current_release
      FROM public.deal_hmlr_sales s WHERE s.transaction_id = transaction FOR UPDATE;
    IF FOUND AND current_release > _release_on THEN
      ignored_count := ignored_count + 1;
      CONTINUE;
    END IF;
    IF status = 'D' THEN
      INSERT INTO public.deal_hmlr_sales
        (transaction_id, source_release_on, record_status, imported_at)
      VALUES (transaction, _release_on, 'D', now())
      ON CONFLICT (transaction_id) DO UPDATE SET
        source_release_on = EXCLUDED.source_release_on, record_status='D',
        price=NULL, sold_at=NULL, postcode=NULL, outcode=NULL,
        property_code=NULL, paon=NULL, saon=NULL, street=NULL,
        locality=NULL, town=NULL, district=NULL, county=NULL, category=NULL,
        imported_at=now();
    ELSE
      post := upper(regexp_replace(trim(coalesce(entry->>'postcode','')), '\s', '', 'g'));
      outward := regexp_replace(post, '[0-9][A-Z]{2}$', '');
      amount := (entry->>'price')::numeric;
      sold := (entry->>'sold_at')::date;
      IF post !~ '^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$'
        OR length(outward) NOT BETWEEN 2 AND 4
        OR amount NOT BETWEEN 1000 AND 100000000
        OR sold NOT BETWEEN DATE '1995-01-01' AND _release_on + 1
        OR entry->>'property_code' NOT IN ('D','S','T','F','O')
        OR entry->>'category' NOT IN ('A','B') THEN
        RAISE EXCEPTION 'Invalid Price Paid sale evidence';
      END IF;
      INSERT INTO public.deal_hmlr_sales(
        transaction_id, source_release_on, record_status, sold_at, price,
        postcode, outcode, property_code, new_build, tenure,
        paon, saon, street, locality, town, district, county, category
      ) VALUES (
        transaction, _release_on, status, sold, amount,
        post, outward, entry->>'property_code',
        NULLIF(entry->>'new_build',''), NULLIF(entry->>'tenure',''),
        left(coalesce(entry->>'paon',''), 250),
        left(coalesce(entry->>'saon',''), 250),
        left(coalesce(entry->>'street',''), 250),
        left(coalesce(entry->>'locality',''), 200),
        left(coalesce(entry->>'town',''), 150),
        left(coalesce(entry->>'district',''), 150),
        left(coalesce(entry->>'county',''), 150),
        entry->>'category'
      )
      ON CONFLICT(transaction_id) DO UPDATE SET
        source_release_on=EXCLUDED.source_release_on,
        record_status=EXCLUDED.record_status,
        sold_at=EXCLUDED.sold_at,
        price=EXCLUDED.price,
        postcode=EXCLUDED.postcode,
        outcode=EXCLUDED.outcode,
        property_code=EXCLUDED.property_code,
        new_build=EXCLUDED.new_build,
        tenure=EXCLUDED.tenure,
        paon=EXCLUDED.paon,
        saon=EXCLUDED.saon,
        street=EXCLUDED.street,
        locality=EXCLUDED.locality,
        town=EXCLUDED.town,
        district=EXCLUDED.district,
        county=EXCLUDED.county,
        category=EXCLUDED.category,
        imported_at=now();
    END IF;
    changed := changed + 1;
    current_release := NULL;
  END LOOP;
  RETURN QUERY SELECT changed, ignored_count;
END
$function$;
REVOKE ALL ON FUNCTION public.apply_deal_hmlr_changes(date, jsonb)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_deal_hmlr_changes(date, jsonb)
 TO service_role;

COMMIT;
