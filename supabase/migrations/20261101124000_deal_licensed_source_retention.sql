-- PropertyData source-result minimisation. This is separate from and
-- ordered AFTER the official PPD ingestion migration. Source lists/caches
-- must be refreshed or deleted no later than the commercial 60-day deadline.
-- The cron purges raw API-derived evidence two days before its expiry.
BEGIN;

CREATE OR REPLACE FUNCTION public.expire_deal_licensed_market_evidence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  affected integer := 0;
BEGIN
  UPDATE public.deal_opportunities AS d
  SET
    -- An asking price copied from a licensed portal feed is not a durable
    -- independently verified valuation. Remove it on expiry.
    asking_price = NULL,
    -- For raw research cases, remove listing-title/postcode and stale price.
    title = CASE
      WHEN d.status = 'research' AND d.fee_disclosed = false
       AND d.seller_authority_confirmed = false
      THEN 'Expired licensed property research'
      ELSE d.title
    END,
    postcode = CASE
      WHEN d.status = 'research' AND d.fee_disclosed = false
       AND d.seller_authority_confirmed = false
      THEN NULL
      ELSE d.postcode
    END,
    purchase_price = CASE
      WHEN d.status = 'research' AND d.fee_disclosed = false
       AND d.seller_authority_confirmed = false
      THEN 0
      ELSE d.purchase_price
    END,
    -- References to the provider's inventory are subject to the same TTL,
    -- whereas user-entered non-portal document references are retained.
    source_refs = coalesce((
      SELECT jsonb_agg(s.value)
      FROM jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(d.source_refs) = 'array'
          THEN d.source_refs ELSE '[]'::jsonb END
      ) AS s(value)
      WHERE s.value NOT LIKE 'PropertyData:%'
    ), '[]'::jsonb),
    -- Preserve only derived underwriting, explicit user contract data and
    -- an expiry marker; never persist portal-specific raw API fields past TTL.
    analysis = (
      coalesce(d.analysis, '{}'::jsonb)
      - 'externalProvider' - 'externalListingId'
      - 'externalDataExpiresAt' - 'sourcedAt'
      - 'sourceUrl' - 'sourcePortal' - 'sourceList'
      - 'priceReductionPercent' - 'publishedPriceAtCapture'
      - 'detailedPropertyType' - 'sourceRights'
      - 'bedrooms' - 'subjectFloorAreaSqft' - 'propertyType'
    ) || jsonb_build_object(
      'licensedEvidenceExpired', true,
      'licensedEvidenceExpiredAt', now(),
      'requiresRescout', true
    )
  WHERE d.analysis->>'externalProvider' = 'propertydata'
    AND (
      CASE
        WHEN NULLIF(d.analysis->>'externalDataExpiresAt','') IS NULL THEN true
        WHEN d.analysis->>'externalDataExpiresAt' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T'
          THEN (d.analysis->>'externalDataExpiresAt')::timestamptz <= now() + interval '2 days'
        -- Invalid/suspect provider timestamps are treated as expired.
        ELSE true
      END
    );
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END
$function$;

REVOKE ALL ON FUNCTION public.expire_deal_licensed_market_evidence()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_deal_licensed_market_evidence()
  TO service_role;


-- Direct PostgREST updates must not circumvent the server's external-source
-- freshness check. Do not introduce a buyer from expired research evidence.
CREATE OR REPLACE FUNCTION public.deal_licensed_evidence_is_stale(_analysis jsonb)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public, pg_temp
AS $fn$
SELECT
  coalesce(_analysis->>'licensedEvidenceExpired','false') = 'true'
  OR (
    _analysis->>'externalProvider' = 'propertydata'
    AND CASE
      WHEN _analysis->>'externalDataExpiresAt' ~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T'
      THEN (_analysis->>'externalDataExpiresAt')::timestamptz <= now()
      ELSE true
    END
  )
$fn$;

CREATE OR REPLACE FUNCTION public.block_expired_licensed_buyer_introductions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $trigger$
DECLARE source_analysis jsonb;
BEGIN
  IF NEW.status IN ('introduced','offer','matched') THEN
    SELECT d.analysis INTO source_analysis FROM public.deal_opportunities d
      WHERE d.id = NEW.opportunity_id AND d.agency_id = NEW.agency_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sourcing opportunity is no longer available'; END IF;
    IF public.deal_licensed_evidence_is_stale(source_analysis) THEN
      RAISE EXCEPTION 'Licensed source evidence has expired; re-source and re-review before introducing buyers';
    END IF;
  END IF;
  RETURN NEW;
END
$trigger$;
CREATE TRIGGER deal_source_freshness_match_gate
BEFORE INSERT OR UPDATE OF status ON public.deal_matches
FOR EACH ROW EXECUTE FUNCTION public.block_expired_licensed_buyer_introductions();

CREATE OR REPLACE FUNCTION public.block_expired_licensed_deal_progression()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $trigger$
BEGIN
  IF NEW.status IN ('matched','offer','conveyancing','completed')
     AND public.deal_licensed_evidence_is_stale(NEW.analysis) THEN
    RAISE EXCEPTION 'Licensed property source evidence is stale; re-source before progressing this deal';
  END IF;
  RETURN NEW;
END
$trigger$;
CREATE TRIGGER deal_source_freshness_opportunity_gate
BEFORE INSERT OR UPDATE OF status,analysis ON public.deal_opportunities
FOR EACH ROW EXECUTE FUNCTION public.block_expired_licensed_deal_progression();

COMMIT;
