GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_contact_ids() TO anon, authenticated;