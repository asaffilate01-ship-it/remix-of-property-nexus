-- Keep at most one active checkout per rent line. The application reuses an
-- open Stripe session and closes failed or expired attempts before retrying.
WITH duplicate_pending AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY rent_schedule_id
           ORDER BY created_at DESC, id DESC
         ) AS position
  FROM public.rent_invoices
  WHERE status = 'pending'
)
UPDATE public.rent_invoices AS invoice
SET status = 'expired'
FROM duplicate_pending
WHERE invoice.id = duplicate_pending.id
  AND duplicate_pending.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS rent_invoices_one_pending_per_schedule_idx
  ON public.rent_invoices (rent_schedule_id)
  WHERE status = 'pending';

ALTER TABLE public.bank_transactions
  DROP CONSTRAINT IF EXISTS bank_transactions_source_check;
ALTER TABLE public.bank_transactions
  ADD CONSTRAINT bank_transactions_source_check
  CHECK (source IN ('mock', 'truelayer', 'plaid', 'manual', 'tink', 'stripe'));

CREATE UNIQUE INDEX IF NOT EXISTS bank_transactions_stripe_session_uq
  ON public.bank_transactions (source, reference)
  WHERE source = 'stripe' AND reference IS NOT NULL;

-- Settle the invoice, rent line and bank ledger atomically. Only the service
-- role used by the verified webhook may execute this function.
CREATE OR REPLACE FUNCTION public.record_stripe_rent_payment(
  _invoice_id uuid,
  _rent_schedule_id uuid,
  _tenancy_id uuid,
  _provider_session_id text,
  _provider_payment_intent text,
  _amount numeric,
  _currency text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_row public.rent_invoices%ROWTYPE;
  agency uuid;
BEGIN
  IF _amount <= 0 OR upper(_currency) <> 'GBP' THEN
    RAISE EXCEPTION 'Unexpected Stripe payment amount or currency';
  END IF;

  SELECT * INTO invoice_row
  FROM public.rent_invoices
  WHERE id = _invoice_id
  FOR UPDATE;

  IF NOT FOUND
    OR invoice_row.rent_schedule_id <> _rent_schedule_id
    OR invoice_row.tenancy_id <> _tenancy_id
    OR invoice_row.amount <> _amount
    OR upper(invoice_row.currency) <> upper(_currency)
    OR invoice_row.provider <> 'stripe' THEN
    RAISE EXCEPTION 'Stripe payment does not match the invoice';
  END IF;

  IF invoice_row.status = 'paid' THEN
    IF invoice_row.provider_session_id IS DISTINCT FROM _provider_session_id THEN
      RAISE EXCEPTION 'Invoice was paid by a different Stripe session';
    END IF;
    RETURN;
  END IF;

  IF invoice_row.status <> 'pending'
    OR invoice_row.provider_session_id IS DISTINCT FROM _provider_session_id THEN
    RAISE EXCEPTION 'Stripe invoice is not payable';
  END IF;

  SELECT t.agency_id INTO agency
  FROM public.tenancies t
  WHERE t.id = _tenancy_id;
  IF agency IS NULL THEN
    RAISE EXCEPTION 'Invoice tenancy has no agency';
  END IF;

  UPDATE public.rent_invoices
  SET status = 'paid',
      paid_at = now(),
      provider_payment_intent = _provider_payment_intent
  WHERE id = _invoice_id;

  UPDATE public.rent_schedule
  SET status = 'paid',
      paid_at = now(),
      paid_amount = _amount
  WHERE id = _rent_schedule_id
    AND tenancy_id = _tenancy_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rent schedule does not match the invoice tenancy';
  END IF;

  INSERT INTO public.bank_transactions (
    agency_id,
    amount,
    currency,
    source,
    reference,
    posted_at,
    matched_tenancy_id,
    matched_rent_schedule_id,
    matched_at
  ) VALUES (
    agency,
    _amount,
    upper(_currency),
    'stripe',
    _provider_session_id,
    now(),
    _tenancy_id,
    _rent_schedule_id,
    now()
  ) ON CONFLICT (source, reference)
    WHERE source = 'stripe' AND reference IS NOT NULL
    DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_stripe_rent_payment(uuid, uuid, uuid, text, text, numeric, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_rent_payment(uuid, uuid, uuid, text, text, numeric, text)
  TO service_role;