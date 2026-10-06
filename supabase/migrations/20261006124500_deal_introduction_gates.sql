-- Commercial/readiness gates for Gabley deal sourcing and buyer introductions.
BEGIN;

ALTER TABLE public.deal_opportunities
  ADD COLUMN IF NOT EXISTS fee_payer text NOT NULL DEFAULT 'buyer'
    CHECK (fee_payer IN ('buyer','seller','split')),
  ADD COLUMN IF NOT EXISTS fee_vat_treatment text NOT NULL DEFAULT 'inclusive'
    CHECK (fee_vat_treatment IN ('inclusive','exclusive','not_applicable')),
  ADD COLUMN IF NOT EXISTS fee_disclosed_at timestamptz,
  ADD COLUMN IF NOT EXISTS seller_authority_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_authority_confirmed_at timestamptz;

ALTER TABLE public.deal_matches
  ADD COLUMN IF NOT EXISTS buyer_terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buyer_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS introduced_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_deal_match_introduction_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  opportunity public.deal_opportunities%ROWTYPE;
BEGIN
  IF NEW.status IN ('introduced','offer','matched') THEN
    SELECT * INTO opportunity
    FROM public.deal_opportunities
    WHERE id=NEW.opportunity_id AND agency_id=NEW.agency_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Deal opportunity not found' USING ERRCODE='P0001';
    END IF;
    IF opportunity.fee_disclosed IS NOT TRUE OR opportunity.fee_disclosed_at IS NULL THEN
      RAISE EXCEPTION 'Fee disclosure must be recorded before buyer introduction' USING ERRCODE='P0001';
    END IF;
    IF opportunity.seller_authority_confirmed IS NOT TRUE OR opportunity.seller_authority_confirmed_at IS NULL THEN
      RAISE EXCEPTION 'Seller authority must be recorded before buyer introduction' USING ERRCODE='P0001';
    END IF;
    IF NEW.buyer_terms_accepted IS NOT TRUE OR NEW.buyer_terms_accepted_at IS NULL THEN
      RAISE EXCEPTION 'Buyer terms must be accepted before buyer introduction' USING ERRCODE='P0001';
    END IF;
    IF NEW.introduced_at IS NULL THEN NEW.introduced_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_match_introduction_gate ON public.deal_matches;
CREATE TRIGGER deal_match_introduction_gate
BEFORE INSERT OR UPDATE OF status,buyer_terms_accepted,buyer_terms_accepted_at
ON public.deal_matches
FOR EACH ROW EXECUTE FUNCTION public.enforce_deal_match_introduction_gate();

CREATE OR REPLACE FUNCTION public.enforce_deal_opportunity_progression_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('matched','offer','conveyancing','completed') THEN
    IF NEW.fee_disclosed IS NOT TRUE OR NEW.fee_disclosed_at IS NULL THEN
      RAISE EXCEPTION 'Fee disclosure must be recorded before deal progression' USING ERRCODE='P0001';
    END IF;
    IF NEW.seller_authority_confirmed IS NOT TRUE OR NEW.seller_authority_confirmed_at IS NULL THEN
      RAISE EXCEPTION 'Seller authority must be recorded before deal progression' USING ERRCODE='P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_opportunity_progression_gate ON public.deal_opportunities;
CREATE TRIGGER deal_opportunity_progression_gate
BEFORE INSERT OR UPDATE OF status,fee_disclosed,fee_disclosed_at,seller_authority_confirmed,seller_authority_confirmed_at
ON public.deal_opportunities
FOR EACH ROW EXECUTE FUNCTION public.enforce_deal_opportunity_progression_gate();

COMMIT;
