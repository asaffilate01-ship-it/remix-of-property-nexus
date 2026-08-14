CREATE OR REPLACE FUNCTION public.ensure_user_workspace()
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _u auth.users%ROWTYPE;
  _role public.app_role;
  _requested text;
  _name text;
  _slug text;
  _existing public.app_role;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT primary_role INTO _existing FROM public.profiles WHERE id = _uid;
  IF _existing IS NOT NULL THEN
    RETURN _existing;
  END IF;

  SELECT * INTO _u FROM auth.users WHERE id = _uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  _requested := lower(coalesce(_u.raw_user_meta_data ->> 'role', ''));
  _role := CASE _requested
    WHEN 'landlord' THEN 'landlord'::public.app_role
    WHEN 'agent' THEN 'agent'::public.app_role
    WHEN 'tenant' THEN 'tenant'::public.app_role
    WHEN 'buyer' THEN 'buyer'::public.app_role
    WHEN 'conveyancer' THEN 'conveyancer'::public.app_role
    WHEN 'contractor' THEN 'contractor'::public.app_role
    WHEN 'inventory_clerk' THEN 'inventory_clerk'::public.app_role
    WHEN 'utility_provider' THEN 'utility_provider'::public.app_role
    ELSE 'landlord'::public.app_role
  END;

  _name := left(coalesce(
    nullif(trim(_u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(_u.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(_u.email, 'member@estately'), '@', 1)
  ), 200);

  INSERT INTO public.profiles (id, full_name, avatar_url, primary_role)
  VALUES (_uid, _name, _u.raw_user_meta_data ->> 'avatar_url', _role)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'agent'::public.app_role
     AND NOT EXISTS (SELECT 1 FROM public.agencies a WHERE a.owner_id = _uid)
     AND NOT EXISTS (SELECT 1 FROM public.agency_members m WHERE m.user_id = _uid) THEN
    _slug := coalesce(
      nullif(trim(both '-' from lower(regexp_replace(coalesce(_name, 'agency'), '[^a-zA-Z0-9]+', '-', 'g'))), ''),
      'agency'
    ) || '-' || substr(md5(_uid::text), 1, 6);
    INSERT INTO public.agencies (owner_id, name, slug, email, is_published)
    VALUES (_uid, coalesce(_name, 'My agency'), _slug, _u.email, false);
  END IF;

  RETURN _role;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_user_workspace() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_workspace() TO authenticated;