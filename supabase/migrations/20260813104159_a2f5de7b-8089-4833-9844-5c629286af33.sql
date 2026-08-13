-- 1. Explicit, staff-controlled user linkage for contacts
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz;

CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON public.contacts(user_id);

-- Replace unverified email matching with verified account linkage
CREATE OR REPLACE FUNCTION public.current_user_contact_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id
  FROM public.contacts c
  WHERE c.user_id IS NOT NULL AND c.user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_user_contact_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_contact_ids() TO authenticated, service_role;

-- 2. Bind publicly submitted leads to the referenced listing's real owner/agency
CREATE OR REPLACE FUNCTION public.fn_leads_bind_to_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _agency uuid;
  _owner uuid;
BEGIN
  IF NEW.listing_id IS NOT NULL THEN
    SELECT l.agency_id, l.owner_id INTO _agency, _owner
    FROM public.listings l WHERE l.id = NEW.listing_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown listing';
    END IF;

    NEW.agency_id := _agency;
    NEW.owner_id := _owner;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_leads_bind_to_listing() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_leads_bind_to_listing ON public.leads;
CREATE TRIGGER trg_leads_bind_to_listing
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.fn_leads_bind_to_listing();