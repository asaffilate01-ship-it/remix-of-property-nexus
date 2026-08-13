-- Match a bank credit to one rent item atomically. The function performs its
-- own tenant/agency/user checks so callers cannot cross agency boundaries.
CREATE OR REPLACE FUNCTION public.match_bank_transaction(
  _transaction_id uuid,
  _rent_schedule_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transaction_row public.bank_transactions%ROWTYPE;
  rent_row public.rent_schedule%ROWTYPE;
  tenancy_agency_id uuid;
BEGIN
  SELECT * INTO transaction_row
  FROM public.bank_transactions
  WHERE id = _transaction_id
  FOR UPDATE;

  SELECT rs.* INTO rent_row
  FROM public.rent_schedule rs
  WHERE rs.id = _rent_schedule_id
  FOR UPDATE;

  SELECT t.agency_id INTO tenancy_agency_id
  FROM public.tenancies t
  WHERE t.id = rent_row.tenancy_id;

  IF transaction_row.id IS NULL OR rent_row.id IS NULL THEN
    RETURN false;
  END IF;
  IF transaction_row.agency_id <> tenancy_agency_id THEN
    RAISE EXCEPTION 'Payment and rent item belong to different agencies';
  END IF;
  IF NOT public.is_agency_member(transaction_row.agency_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;
  IF transaction_row.matched_rent_schedule_id IS NOT NULL OR rent_row.status = 'paid' THEN
    RETURN false;
  END IF;
  IF transaction_row.amount <> rent_row.amount THEN
    RAISE EXCEPTION 'Payment amount does not match rent due';
  END IF;

  UPDATE public.bank_transactions
  SET matched_rent_schedule_id = rent_row.id,
      matched_tenancy_id = rent_row.tenancy_id,
      matched_at = now()
  WHERE id = transaction_row.id;

  UPDATE public.rent_schedule
  SET status = 'paid',
      paid_amount = transaction_row.amount,
      paid_at = transaction_row.posted_at,
      updated_at = now()
  WHERE id = rent_row.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.match_bank_transaction(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_bank_transaction(uuid, uuid) TO authenticated;
