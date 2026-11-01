-- Gabley deal sourcing: compliance approval, multi-agency data isolation and
-- auditable commission claims. No client-money or automated payouts.
BEGIN;

CREATE TABLE IF NOT EXISTS public.deal_agency_compliance (
  agency_id uuid PRIMARY KEY REFERENCES public.agencies(id) ON DELETE CASCADE,
  aml_registration_ref text NOT NULL CHECK (length(trim(aml_registration_ref)) >= 5),
  redress_membership_ref text NOT NULL CHECK (length(trim(redress_membership_ref)) >= 5),
  terms_of_business_ref text NOT NULL CHECK (length(trim(terms_of_business_ref)) >= 5),
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  reviewed_notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((approved_by IS NULL) = (approved_at IS NULL))
);
ALTER TABLE public.deal_agency_compliance ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.deal_agency_compliance TO authenticated;
GRANT ALL ON public.deal_agency_compliance TO service_role;

CREATE POLICY "deal compliance agency read" ON public.deal_agency_compliance
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = deal_agency_compliance.agency_id
      AND (a.owner_id = (SELECT auth.uid()) OR public.is_agency_member(a.id, (SELECT auth.uid())))
  )
);
CREATE POLICY "deal compliance agency submit" ON public.deal_agency_compliance
FOR INSERT TO authenticated WITH CHECK (
  submitted_by = (SELECT auth.uid()) AND approved_by IS NULL AND approved_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = deal_agency_compliance.agency_id AND a.owner_id = (SELECT auth.uid())
  )
);
CREATE POLICY "deal compliance agency revise" ON public.deal_agency_compliance
FOR UPDATE TO authenticated
USING (approved_at IS NULL AND EXISTS (
  SELECT 1 FROM public.agencies a
  WHERE a.id = deal_agency_compliance.agency_id AND a.owner_id = (SELECT auth.uid())
))
WITH CHECK (approved_at IS NULL AND approved_by IS NULL AND submitted_by = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_deal_compliance_self_approval()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user <> 'service_role'
    AND (NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Platform review required to approve an estate agency compliance dossier';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deal_compliance_approval_guard
BEFORE INSERT OR UPDATE ON public.deal_agency_compliance
FOR EACH ROW EXECUTE FUNCTION public.prevent_deal_compliance_self_approval();

CREATE OR REPLACE FUNCTION public.enforce_deal_match_agency_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.deal_opportunities d WHERE d.id = NEW.opportunity_id AND d.agency_id = NEW.agency_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.investor_profiles i WHERE i.id = NEW.investor_profile_id AND i.agency_id = NEW.agency_id
  ) THEN
    RAISE EXCEPTION 'Deal and buyer must belong to the same agency';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deal_match_agency_scope
BEFORE INSERT OR UPDATE OF agency_id, opportunity_id, investor_profile_id ON public.deal_matches
FOR EACH ROW EXECUTE FUNCTION public.enforce_deal_match_agency_scope();

CREATE OR REPLACE FUNCTION public.enforce_deal_introduction_compliance()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status IN ('introduced','offer','matched') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.deal_agency_compliance c
      WHERE c.agency_id = NEW.agency_id AND c.approved_at >= now() - interval '12 months'
        AND length(trim(c.aml_registration_ref)) >= 5
        AND length(trim(c.redress_membership_ref)) >= 5
        AND length(trim(c.terms_of_business_ref)) >= 5
    ) THEN
      RAISE EXCEPTION 'Estate agency AML, redress and terms review must be approved before introduction';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deal_introduction_regulatory_gate
BEFORE INSERT OR UPDATE OF status ON public.deal_matches
FOR EACH ROW EXECUTE FUNCTION public.enforce_deal_introduction_compliance();

-- Commission records are invoices/receipts, not a payment gateway.
CREATE TABLE IF NOT EXISTS public.deal_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL UNIQUE REFERENCES public.deal_opportunities(id) ON DELETE RESTRICT,
  match_id uuid REFERENCES public.deal_matches(id) ON DELETE SET NULL,
  fee_payer text NOT NULL CHECK (fee_payer IN ('buyer','seller','split')),
  fee_vat_treatment text NOT NULL CHECK (fee_vat_treatment IN ('inclusive','exclusive','not_applicable')),
  fee_amount numeric(14,2) NOT NULL CHECK (fee_amount >= 0),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','invoiced','paid','cancelled')),
  completion_evidence_ref text,
  invoice_reference text,
  receipt_reference text,
  paid_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'paid' OR
    (paid_at IS NOT NULL AND length(trim(coalesce(receipt_reference,''))) >= 5)),
  CHECK (status NOT IN ('invoiced','paid') OR
    (length(trim(coalesce(invoice_reference,''))) >= 5 AND
     length(trim(coalesce(completion_evidence_ref,''))) >= 5))
);
CREATE INDEX deal_commissions_agency_status_idx ON public.deal_commissions (agency_id,status,updated_at DESC);
ALTER TABLE public.deal_commissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.deal_commissions TO authenticated;
GRANT ALL ON public.deal_commissions TO service_role;

CREATE POLICY "deal commissions authorised agency" ON public.deal_commissions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = deal_commissions.agency_id
      AND (a.owner_id = (SELECT auth.uid()) OR public.is_agency_member(a.id, (SELECT auth.uid())))
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles u
    WHERE u.user_id = (SELECT auth.uid()) AND u.role IN ('agent','admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = deal_commissions.agency_id
      AND (a.owner_id = (SELECT auth.uid()) OR public.is_agency_member(a.id, (SELECT auth.uid())))
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles u
    WHERE u.user_id = (SELECT auth.uid()) AND u.role IN ('agent','admin')
  )
);

CREATE OR REPLACE FUNCTION public.enforce_deal_commission_evidence()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE opportunity public.deal_opportunities%ROWTYPE;
BEGIN
  SELECT * INTO opportunity FROM public.deal_opportunities
    WHERE id = NEW.opportunity_id AND agency_id = NEW.agency_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission must reference an opportunity in this agency';
  END IF;
  IF NEW.fee_amount <> opportunity.proposed_fee
    OR NEW.fee_payer <> opportunity.fee_payer
    OR NEW.fee_vat_treatment <> opportunity.fee_vat_treatment THEN
    RAISE EXCEPTION 'Commission must match signed and disclosed deal terms';
  END IF;
  IF NEW.match_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.deal_matches m
    WHERE m.id = NEW.match_id AND m.opportunity_id = NEW.opportunity_id
      AND m.agency_id = NEW.agency_id AND m.status IN ('introduced','offer','matched')
  ) THEN
    RAISE EXCEPTION 'Commission buyer match is not authorised';
  END IF;
  IF NEW.status IN ('invoiced','paid') THEN
    IF opportunity.status <> 'completed' OR opportunity.fee_disclosed IS NOT TRUE
      OR opportunity.seller_authority_confirmed IS NOT TRUE THEN
      RAISE EXCEPTION 'Completed deal and disclosed terms required to invoice commission';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.deal_agency_compliance c
      WHERE c.agency_id = NEW.agency_id AND c.approved_at >= now() - interval '12 months'
    ) THEN
      RAISE EXCEPTION 'Estate agency compliance approval required to invoice commission';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER deal_commission_evidence_gate
BEFORE INSERT OR UPDATE ON public.deal_commissions
FOR EACH ROW EXECUTE FUNCTION public.enforce_deal_commission_evidence();

CREATE TRIGGER deal_compliance_updated_at
BEFORE UPDATE ON public.deal_agency_compliance
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER deal_commissions_updated_at
BEFORE UPDATE ON public.deal_commissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Idempotent shortlist creation per marketplace listing and agency.
CREATE UNIQUE INDEX IF NOT EXISTS deal_opportunities_public_listing_uq
ON public.deal_opportunities (agency_id, (analysis->>'listingId'))
WHERE analysis ? 'listingId';

COMMIT;
