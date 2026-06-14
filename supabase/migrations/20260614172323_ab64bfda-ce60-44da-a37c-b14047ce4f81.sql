
REVOKE EXECUTE ON FUNCTION public.enroll_in_track(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_due_track_steps(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_in_track(uuid, uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_due_track_steps(int) TO service_role;
