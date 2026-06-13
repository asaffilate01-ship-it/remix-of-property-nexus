
REVOKE EXECUTE ON FUNCTION public.has_capability(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, uuid, text) TO authenticated, service_role;
