-- Trigger-only functions: never callable via the API
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.documents_validate_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_agency_add_owner_member() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_autoenroll_tracks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_booking_create_cleaning() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_message_bump_thread() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_thread_add_creator() FROM PUBLIC, anon, authenticated;

-- Privileged service routines: service_role only
REVOKE ALL ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.claim_due_track_steps(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_track_steps(integer) TO service_role;

-- Enrollment is invoked by signed-in agency users from the app
REVOKE ALL ON FUNCTION public.enroll_in_track(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_in_track(uuid, uuid, uuid, jsonb) TO authenticated, service_role;

-- RLS helper functions: signed-in users only (needed by policies)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_capability(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_capability(uuid, uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_agency_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_property_tenant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_property_tenant(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_thread_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_thread_participant(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.current_user_contact_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_contact_ids() TO authenticated, service_role;