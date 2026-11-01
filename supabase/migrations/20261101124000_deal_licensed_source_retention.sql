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

COMMIT;
