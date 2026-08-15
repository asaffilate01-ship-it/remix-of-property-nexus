REVOKE ALL ON FUNCTION public.start_agency_subscription_trial() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_agency_listing_entitlement() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_agency_user_entitlement() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_bank_transaction(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_bank_transaction(uuid, uuid) TO authenticated, service_role;