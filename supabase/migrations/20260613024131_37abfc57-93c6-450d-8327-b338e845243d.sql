
-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('admin','agent','landlord','tenant','buyer');
CREATE TYPE public.listing_type AS ENUM ('sale','rent','room');
CREATE TYPE public.listing_status AS ENUM ('draft','published','under_offer','let_agreed','sold','withdrawn');
CREATE TYPE public.lead_status AS ENUM ('new','contacted','qualified','viewing_booked','offer','closed_won','closed_lost');
CREATE TYPE public.deal_stage AS ENUM ('lead','contacted','viewing','offer','negotiation','agreed','completed','lost');
CREATE TYPE public.compliance_type AS ENUM ('hmo_licence','gas_safety','eicr','epc','fire_alarm','legionella','pat','insurance','deposit_protection');
CREATE TYPE public.compliance_status AS ENUM ('valid','due_soon','expired','missing');

-- ===== updated_at helper =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  primary_role public.app_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Admin policy on user_roles using has_role
CREATE POLICY "Admins manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== handle_new_user trigger =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, primary_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'landlord')
  );
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'landlord');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== AGENCIES =====
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postcode TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencies TO authenticated;
GRANT SELECT ON public.agencies TO anon;
GRANT ALL ON public.agencies TO service_role;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published agencies are public" ON public.agencies FOR SELECT USING (is_published = true OR auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners insert agency" ON public.agencies FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update agency" ON public.agencies FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners delete agency" ON public.agencies FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER agencies_updated_at BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== AGENCY MEMBERS =====
CREATE TABLE public.agency_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_members TO authenticated;
GRANT ALL ON public.agency_members TO service_role;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_agency_member(_agency UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.agencies a WHERE a.id=_agency AND a.owner_id=_user
    UNION ALL
    SELECT 1 FROM public.agency_members m WHERE m.agency_id=_agency AND m.user_id=_user
  )
$$;

CREATE POLICY "Members see own agency" ON public.agency_members FOR SELECT USING (public.is_agency_member(agency_id, auth.uid()));
CREATE POLICY "Agency owner manages members" ON public.agency_members FOR ALL USING (EXISTS(SELECT 1 FROM public.agencies a WHERE a.id=agency_id AND a.owner_id=auth.uid())) WITH CHECK (EXISTS(SELECT 1 FROM public.agencies a WHERE a.id=agency_id AND a.owner_id=auth.uid()));

-- ===== PROPERTIES =====
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postcode TEXT,
  property_type TEXT,
  bedrooms INT,
  bathrooms INT,
  is_hmo BOOLEAN NOT NULL DEFAULT false,
  hmo_licence_number TEXT,
  hmo_licence_expires DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and agency see properties" ON public.properties FOR SELECT USING (auth.uid()=owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners insert properties" ON public.properties FOR INSERT WITH CHECK (auth.uid()=owner_id);
CREATE POLICY "Owners update properties" ON public.properties FOR UPDATE USING (auth.uid()=owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())));
CREATE POLICY "Owners delete properties" ON public.properties FOR DELETE USING (auth.uid()=owner_id);
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== ROOMS =====
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rent_pcm NUMERIC(10,2),
  deposit NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'vacant',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rooms follow property access" ON public.rooms FOR ALL USING (EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND (p.owner_id=auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())) OR public.has_role(auth.uid(),'admin')))) WITH CHECK (EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND (p.owner_id=auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))));
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== LISTINGS =====
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  listing_type public.listing_type NOT NULL,
  status public.listing_status NOT NULL DEFAULT 'draft',
  price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'GBP',
  bedrooms INT,
  bathrooms INT,
  address TEXT,
  city TEXT,
  postcode TEXT,
  cover_image TEXT,
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_hmo BOOLEAN NOT NULL DEFAULT false,
  bills_included BOOLEAN NOT NULL DEFAULT false,
  available_from DATE,
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT ON public.listings TO anon;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published listings public" ON public.listings FOR SELECT USING (status IN ('published','under_offer','let_agreed') OR auth.uid()=owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners insert listings" ON public.listings FOR INSERT WITH CHECK (auth.uid()=owner_id);
CREATE POLICY "Owners update listings" ON public.listings FOR UPDATE USING (auth.uid()=owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())));
CREATE POLICY "Owners delete listings" ON public.listings FOR DELETE USING (auth.uid()=owner_id);
CREATE TRIGGER listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_type ON public.listings(listing_type);
CREATE INDEX idx_listings_city ON public.listings(city);

-- ===== LEADS =====
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT,
  status public.lead_status NOT NULL DEFAULT 'new',
  source TEXT DEFAULT 'marketplace',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners and agencies see leads" ON public.leads FOR SELECT USING (auth.uid()=owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners and agencies update leads" ON public.leads FOR UPDATE USING (auth.uid()=owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())));
CREATE POLICY "Owners delete leads" ON public.leads FOR DELETE USING (auth.uid()=owner_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== DEALS =====
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  stage public.deal_stage NOT NULL DEFAULT 'lead',
  value NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and agency members see deals" ON public.deals FOR SELECT USING (auth.uid()=owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners insert deals" ON public.deals FOR INSERT WITH CHECK (auth.uid()=owner_id);
CREATE POLICY "Owners update deals" ON public.deals FOR UPDATE USING (auth.uid()=owner_id OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())));
CREATE POLICY "Owners delete deals" ON public.deals FOR DELETE USING (auth.uid()=owner_id);
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== COMPLIANCE =====
CREATE TABLE public.compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  type public.compliance_type NOT NULL,
  issued_on DATE,
  expires_on DATE,
  status public.compliance_status NOT NULL DEFAULT 'valid',
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_records TO authenticated;
GRANT ALL ON public.compliance_records TO service_role;
ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Compliance follows property" ON public.compliance_records FOR ALL USING (EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND (p.owner_id=auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())) OR public.has_role(auth.uid(),'admin')))) WITH CHECK (EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND (p.owner_id=auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))));
CREATE TRIGGER compliance_updated_at BEFORE UPDATE ON public.compliance_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
