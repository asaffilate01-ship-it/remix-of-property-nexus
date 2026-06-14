
-- 1) Trigger: ensure owner is always an agency_members row
CREATE OR REPLACE FUNCTION public.fn_agency_add_owner_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agency_members (agency_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (agency_id, user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS agencies_add_owner_member ON public.agencies;
CREATE TRIGGER agencies_add_owner_member
AFTER INSERT ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.fn_agency_add_owner_member();

-- 2) Extend handle_new_user to seed an agency for agents
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _name text;
  _slug text;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));

  INSERT INTO public.profiles (id, full_name, avatar_url, primary_role)
  VALUES (
    NEW.id,
    _name,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'landlord')
  );

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'landlord');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role) ON CONFLICT DO NOTHING;

  IF _role = 'agent' THEN
    _slug := lower(regexp_replace(coalesce(_name,'agency'), '[^a-zA-Z0-9]+', '-', 'g'))
             || '-' || substr(md5(NEW.id::text), 1, 6);
    INSERT INTO public.agencies (owner_id, name, slug, email, is_published)
    VALUES (NEW.id, coalesce(_name,'My agency'), _slug, NEW.email, false);
  END IF;

  RETURN NEW;
END $$;

-- 3) Backfill: missing owner memberships
INSERT INTO public.agency_members (agency_id, user_id, role)
SELECT a.id, a.owner_id, 'owner'
FROM public.agencies a
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_members m
  WHERE m.agency_id = a.id AND m.user_id = a.owner_id
)
ON CONFLICT DO NOTHING;

-- 4) Backfill: agents without an agency get one
INSERT INTO public.agencies (owner_id, name, slug, is_published)
SELECT
  ur.user_id,
  COALESCE(p.full_name, 'My agency'),
  lower(regexp_replace(COALESCE(p.full_name,'agency'), '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || substr(md5(ur.user_id::text), 1, 6),
  false
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'agent'
  AND NOT EXISTS (SELECT 1 FROM public.agencies a WHERE a.owner_id = ur.user_id);
