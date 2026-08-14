-- Public sign-up metadata is untrusted. Only explicit non-privileged product roles
-- may be selected by a new user; platform admin access is service-role provisioned.
CREATE TABLE IF NOT EXISTS public.platform_admin_authorizations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  authorized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 500),
  authorized_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

ALTER TABLE public.platform_admin_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_admin_authorizations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.platform_admin_authorizations TO service_role;

REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, phone) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.role() = 'service_role' THEN
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
      )
      AND (
        _role <> 'admin'::public.app_role
        OR EXISTS (
          SELECT 1 FROM public.platform_admin_authorizations paa
          WHERE paa.user_id = _user_id
            AND paa.revoked_at IS NULL
        )
      )
    WHEN _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
      )
      AND (
        _role <> 'admin'::public.app_role
        OR (
          coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
          AND EXISTS (
            SELECT 1 FROM public.platform_admin_authorizations paa
            WHERE paa.user_id = _user_id
              AND paa.revoked_at IS NULL
          )
        )
      )
  END
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_platform_admin_security_status()
RETURNS TABLE (is_admin_role boolean, is_authorized boolean, is_aal2 boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
    ),
    EXISTS (
      SELECT 1 FROM public.platform_admin_authorizations paa
      WHERE paa.user_id = auth.uid() AND paa.revoked_at IS NULL
    ),
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

REVOKE ALL ON FUNCTION public.current_platform_admin_security_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_platform_admin_security_status() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _requested_role text;
  _name text;
  _slug text;
BEGIN
  _requested_role := lower(coalesce(NEW.raw_user_meta_data ->> 'role', ''));
  _role := CASE _requested_role
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
    nullif(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(NEW.email, '@', 1)
  ), 200);

  INSERT INTO public.profiles (id, full_name, avatar_url, primary_role)
  VALUES (NEW.id, _name, NEW.raw_user_meta_data ->> 'avatar_url', _role);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF _role = 'agent'::public.app_role THEN
    _slug := coalesce(
      nullif(trim(both '-' from lower(regexp_replace(coalesce(_name, 'agency'), '[^a-zA-Z0-9]+', '-', 'g'))), ''),
      'agency'
    )
      || '-' || substr(md5(NEW.id::text), 1, 6);
    INSERT INTO public.agencies (owner_id, name, slug, email, is_published)
    VALUES (NEW.id, coalesce(_name, 'My agency'), _slug, NEW.email, false);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.platform_admin_authorizations IS
  'Fail-closed platform admin allowlist. Provision only after identity verification; admin RLS also requires an aal2 JWT.';