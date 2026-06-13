
-- ============== ENUMS ==============
CREATE TYPE public.contact_type AS ENUM (
  'conveyancer','solicitor','plumber','electrician','gas_engineer','builder',
  'cleaner','handyman','locksmith','roofer','painter','gardener',
  'inventory_clerk','epc_assessor','utilities','council','referencing','insurance','other'
);

CREATE TYPE public.work_order_status AS ENUM ('open','in_progress','on_hold','completed','cancelled');
CREATE TYPE public.work_order_priority AS ENUM ('low','medium','high','emergency');
CREATE TYPE public.job_media_kind AS ENUM ('photo','video');

-- ============== CONTACTS ==============
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  contact_type public.contact_type NOT NULL,
  company_name TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  postcode TEXT,
  notes TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  hourly_rate NUMERIC(10,2),
  insurance_expires_at DATE,
  certifications JSONB DEFAULT '[]'::jsonb,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage contacts" ON public.contacts FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE INDEX idx_contacts_agency ON public.contacts(agency_id);
CREATE INDEX idx_contacts_type ON public.contacts(agency_id, contact_type);
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== WORK ORDERS ==============
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  tenancy_id UUID REFERENCES public.tenancies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.work_order_status NOT NULL DEFAULT 'open',
  priority public.work_order_priority NOT NULL DEFAULT 'medium',
  category TEXT,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage work orders" ON public.work_orders FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE POLICY "tenants read work orders for their tenancy" ON public.work_orders FOR SELECT TO authenticated
  USING (
    tenancy_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tenancies t WHERE t.id = work_orders.tenancy_id AND t.tenant_user_id = auth.uid()
    )
  );
CREATE INDEX idx_wo_agency_status ON public.work_orders(agency_id, status);
CREATE INDEX idx_wo_property ON public.work_orders(property_id);
CREATE INDEX idx_wo_contact ON public.work_orders(contact_id);
CREATE TRIGGER trg_wo_updated BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== WORK ORDER UPDATES ==============
CREATE TABLE public.work_order_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  status_change public.work_order_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_updates TO authenticated;
GRANT ALL ON public.work_order_updates TO service_role;
ALTER TABLE public.work_order_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage wo updates" ON public.work_order_updates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = work_order_updates.work_order_id AND public.is_agency_member(w.agency_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.work_orders w WHERE w.id = work_order_updates.work_order_id AND public.is_agency_member(w.agency_id, auth.uid())));
CREATE INDEX idx_wou_wo ON public.work_order_updates(work_order_id, created_at DESC);

-- ============== JOB MEDIA (geo + time stamped) ==============
CREATE TABLE public.job_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind public.job_media_kind NOT NULL DEFAULT 'photo',
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  mime_type TEXT,
  file_size BIGINT,
  caption TEXT,
  captured_at TIMESTAMPTZ,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  accuracy_m NUMERIC(8,2),
  altitude_m NUMERIC(8,2),
  source TEXT NOT NULL DEFAULT 'browser',
  has_exif_gps BOOLEAN NOT NULL DEFAULT false,
  has_overlay BOOLEAN NOT NULL DEFAULT false,
  width INT,
  height INT,
  duration_s NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_media TO authenticated;
GRANT ALL ON public.job_media TO service_role;
ALTER TABLE public.job_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage job media" ON public.job_media FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE POLICY "tenants read job media for their tenancy" ON public.job_media FOR SELECT TO authenticated
  USING (
    work_order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.work_orders w
      JOIN public.tenancies t ON t.id = w.tenancy_id
      WHERE w.id = job_media.work_order_id AND t.tenant_user_id = auth.uid()
    )
  );
CREATE INDEX idx_jm_wo ON public.job_media(work_order_id);
CREATE INDEX idx_jm_property ON public.job_media(property_id);

-- ============== SALES DEALS ==============
CREATE TABLE public.sales_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  seller_conveyancer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  buyer_conveyancer_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  offer_amount NUMERIC(12,2),
  agreed_price NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'offer',
  chain_position TEXT,
  memo_of_sale_at DATE,
  searches_ordered_at DATE,
  enquiries_returned_at DATE,
  mortgage_offer_at DATE,
  exchange_at DATE,
  completion_at DATE,
  fall_through_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_deals TO authenticated;
GRANT ALL ON public.sales_deals TO service_role;
ALTER TABLE public.sales_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage sales deals" ON public.sales_deals FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE INDEX idx_sd_agency_status ON public.sales_deals(agency_id, status);
CREATE TRIGGER trg_sd_updated BEFORE UPDATE ON public.sales_deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== STORAGE POLICIES on job-media bucket ==============
-- Path convention: {agency_id}/{work_order_id or 'general'}/{uuid}.{ext}

CREATE POLICY "job-media agency read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-media'
  AND public.is_agency_member( ((storage.foldername(name))[1])::uuid, auth.uid() )
);

CREATE POLICY "job-media agency insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-media'
  AND public.is_agency_member( ((storage.foldername(name))[1])::uuid, auth.uid() )
);

CREATE POLICY "job-media agency update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'job-media'
  AND public.is_agency_member( ((storage.foldername(name))[1])::uuid, auth.uid() )
);

CREATE POLICY "job-media agency delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'job-media'
  AND public.is_agency_member( ((storage.foldername(name))[1])::uuid, auth.uid() )
);

CREATE POLICY "job-media tenants read own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-media'
  AND EXISTS (
    SELECT 1 FROM public.job_media jm
    JOIN public.work_orders w ON w.id = jm.work_order_id
    JOIN public.tenancies t ON t.id = w.tenancy_id
    WHERE jm.storage_path = storage.objects.name
      AND t.tenant_user_id = auth.uid()
  )
);
