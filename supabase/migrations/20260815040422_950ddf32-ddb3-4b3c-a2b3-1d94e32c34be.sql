REVOKE EXECUTE ON FUNCTION public.start_agency_subscription_trial() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_agency_listing_entitlement() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_agency_user_entitlement() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_bank_transaction(uuid, uuid) FROM anon;