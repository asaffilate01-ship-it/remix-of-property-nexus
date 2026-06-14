
-- =========================================================
-- 1. template_instances: expiry + reminder + entity refs + sign token
-- =========================================================
ALTER TABLE public.template_instances
  ADD COLUMN IF NOT EXISTS expires_on date,
  ADD COLUMN IF NOT EXISTS reminder_days integer[] NOT NULL DEFAULT '{30,14,7,1}',
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booking_id uuid,
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS signers_meta jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

-- =========================================================
-- 2. template_signatures (one row per signer)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.template_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.template_instances(id) ON DELETE CASCADE,
  signer_role text NOT NULL,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed','declined','expired')),
  signed_at timestamptz,
  signed_ip text,
  signed_ua text,
  signature_image_path text,
  typed_signature text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_signatures TO authenticated;
GRANT ALL ON public.template_signatures TO service_role;
ALTER TABLE public.template_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members read signatures"
  ON public.template_signatures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.template_instances ti WHERE ti.id = instance_id AND public.is_agency_member(ti.agency_id, auth.uid())));
CREATE POLICY "Agency members write signatures"
  ON public.template_signatures FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.template_instances ti WHERE ti.id = instance_id AND public.is_agency_member(ti.agency_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.template_instances ti WHERE ti.id = instance_id AND public.is_agency_member(ti.agency_id, auth.uid())));
CREATE INDEX IF NOT EXISTS idx_tsig_instance ON public.template_signatures(instance_id);
CREATE INDEX IF NOT EXISTS idx_tsig_token ON public.template_signatures(token);
CREATE TRIGGER trg_tsig_updated BEFORE UPDATE ON public.template_signatures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3. holiday_bookings
-- =========================================================
CREATE TABLE IF NOT EXISTS public.holiday_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL,
  guest_name text NOT NULL,
  guest_email text,
  guest_phone text,
  guests_count integer NOT NULL DEFAULT 1,
  check_in date NOT NULL,
  check_out date NOT NULL CHECK (check_out > check_in),
  nightly_rate numeric(10,2),
  total numeric(10,2),
  cleaning_fee numeric(10,2),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('enquiry','provisional','confirmed','checked_in','checked_out','cancelled')),
  source text DEFAULT 'direct',
  external_ref text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holiday_bookings TO authenticated;
GRANT ALL ON public.holiday_bookings TO service_role;
ALTER TABLE public.holiday_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and agency manage bookings"
  ON public.holiday_bookings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())) OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))));
CREATE INDEX IF NOT EXISTS idx_bk_property_dates ON public.holiday_bookings(property_id, check_in, check_out);
CREATE TRIGGER trg_bk_updated BEFORE UPDATE ON public.holiday_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.template_instances
  ADD CONSTRAINT template_instances_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.holiday_bookings(id) ON DELETE SET NULL;

-- =========================================================
-- 4. property_blocks (owner-use / maintenance)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.property_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('owner','maintenance','other')),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_blocks TO authenticated;
GRANT ALL ON public.property_blocks TO service_role;
ALTER TABLE public.property_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and agency manage blocks"
  ON public.property_blocks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())) OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND (p.owner_id = auth.uid() OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid())))));
CREATE INDEX IF NOT EXISTS idx_pb_prop ON public.property_blocks(property_id, start_date, end_date);
CREATE TRIGGER trg_pb_updated BEFORE UPDATE ON public.property_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5. cleaning_jobs: link to bookings + kind
-- =========================================================
ALTER TABLE public.cleaning_jobs
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.holiday_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'standard';

-- auto-create cleaning job after a booking is added/confirmed
CREATE OR REPLACE FUNCTION public.fn_booking_create_cleaning()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('confirmed','checked_in','checked_out') THEN
    INSERT INTO public.cleaning_jobs (property_id, scheduled_at, duration_minutes, status, kind, booking_id, notes, created_by)
    SELECT NEW.property_id, (NEW.check_out::timestamptz + interval '11 hours'), 120, 'scheduled', 'turnover', NEW.id,
           'Turnover after ' || NEW.guest_name, COALESCE(NEW.created_by, auth.uid())
    WHERE NOT EXISTS (SELECT 1 FROM public.cleaning_jobs WHERE booking_id = NEW.id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_bk_make_cleaning ON public.holiday_bookings;
CREATE TRIGGER trg_bk_make_cleaning AFTER INSERT ON public.holiday_bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_booking_create_cleaning();

-- =========================================================
-- 6. Seed new system templates
-- =========================================================
INSERT INTO public.templates (code, name, category, jurisdiction, authority, description, body, fields, signers, pages, is_system)
VALUES
('hmo-joint-ast', 'HMO Joint AST', 'Lettings', 'England & Wales', 'Housing Act 1988',
 'Joint and several Assured Shorthold Tenancy for HMO sharers.',
 'This Joint Assured Shorthold Tenancy is made between {{landlord_name}} ("Landlord") and the tenants listed below ("Tenants"), all of whom shall be jointly and severally liable. PROPERTY: {{property_address}}. TERM: {{term_months}} months commencing {{start_date}} and ending {{end_date}}. RENT: £{{rent_amount}} per {{rent_period}} payable jointly. DEPOSIT: £{{deposit_amount}} protected with {{deposit_scheme}}. TENANTS: {{tenant_names}}. The Tenants agree to all clauses of the standard AST attached hereto and accept joint and several liability for the full rent and any damage.',
 '[{"key":"landlord_name","label":"Landlord name","type":"text","required":true},{"key":"property_address","label":"Property address","type":"text","required":true},{"key":"tenant_names","label":"Tenants (one per line)","type":"textarea","required":true},{"key":"term_months","label":"Term (months)","type":"number","required":true},{"key":"start_date","label":"Start date","type":"date","required":true},{"key":"end_date","label":"End date","type":"date","required":true},{"key":"rent_amount","label":"Rent (£)","type":"number","required":true},{"key":"rent_period","label":"Period","type":"select","options":["month","week"],"required":true},{"key":"deposit_amount","label":"Deposit (£)","type":"number","required":true},{"key":"deposit_scheme","label":"Deposit scheme","type":"select","options":["DPS","mydeposits","TDS"],"required":true}]'::jsonb,
 ARRAY['landlord','tenants'], 8, true),

('hmo-room-licence', 'HMO Room-only Licence', 'Lettings', 'England & Wales', 'Housing Act 2004',
 'Licence for a single room in a House in Multiple Occupation with shared facilities.',
 'This Room Licence Agreement is made between {{landlord_name}} ("Licensor") and {{tenant_name}} ("Licensee"). ROOM: {{room_name}} at {{property_address}}. SHARED FACILITIES: {{shared_facilities}}. TERM: {{term_months}} months from {{start_date}}. LICENCE FEE: £{{rent_amount}} per {{rent_period}}. DEPOSIT: £{{deposit_amount}}. The Licensee has exclusive use of the Room and shared use of the facilities listed. Licensor retains the right to access for cleaning and inspection on 24 hours notice.',
 '[{"key":"landlord_name","label":"Landlord","type":"text","required":true},{"key":"tenant_name","label":"Licensee","type":"text","required":true},{"key":"property_address","label":"Property address","type":"text","required":true},{"key":"room_name","label":"Room","type":"text","required":true},{"key":"shared_facilities","label":"Shared facilities","type":"text"},{"key":"term_months","label":"Term (months)","type":"number","required":true},{"key":"start_date","label":"Start","type":"date","required":true},{"key":"rent_amount","label":"Fee (£)","type":"number","required":true},{"key":"rent_period","label":"Period","type":"select","options":["month","week"],"required":true},{"key":"deposit_amount","label":"Deposit (£)","type":"number","required":true}]'::jsonb,
 ARRAY['landlord','tenant'], 4, true),

('holiday-let', 'Holiday Let Agreement', 'Holiday lets', 'England & Wales', 'Furnished Holiday Letting',
 'Short-term holiday rental agreement for furnished holiday lets.',
 'This Holiday Let Agreement is between {{owner_name}} ("Owner") and {{guest_name}} ("Guest"). PROPERTY: {{property_address}}. STAY: from {{check_in}} (15:00) to {{check_out}} (10:00). NUMBER OF GUESTS: {{guests_count}}. TOTAL: £{{total}} inclusive of cleaning fee £{{cleaning_fee}}. CANCELLATION: Full refund if cancelled 30+ days before arrival; 50% within 30 days; no refund within 7 days. The Guest agrees to use the property for holiday purposes only and to leave it in a clean and tidy condition.',
 '[{"key":"owner_name","label":"Owner","type":"text","required":true},{"key":"guest_name","label":"Lead guest","type":"text","required":true},{"key":"property_address","label":"Property","type":"text","required":true},{"key":"check_in","label":"Check-in","type":"date","required":true},{"key":"check_out","label":"Check-out","type":"date","required":true},{"key":"guests_count","label":"Guests","type":"number","required":true},{"key":"total","label":"Total (£)","type":"number","required":true},{"key":"cleaning_fee","label":"Cleaning fee (£)","type":"number"}]'::jsonb,
 ARRAY['owner','guest'], 3, true),

('seller-mou', 'Seller Memorandum of Understanding', 'Sales', 'England & Wales', NULL,
 'MoU between vendor and agency setting commission and instruction terms.',
 'This Memorandum of Understanding is made between {{seller_name}} ("Seller") and {{agency_name}} ("Agent") regarding the marketing and sale of {{property_address}}. ASKING PRICE: £{{asking_price}}. COMMISSION: {{commission_pct}}% (plus VAT) of the final sale price, payable on completion. AGENCY TYPE: {{agency_type}}. TERM: {{term_weeks}} weeks from {{start_date}}. The Agent will market the property on Rightmove, Zoopla and PrimeLocation and provide weekly updates. The Seller warrants they have legal title to sell.',
 '[{"key":"seller_name","label":"Seller","type":"text","required":true},{"key":"agency_name","label":"Agency","type":"text","required":true},{"key":"property_address","label":"Property","type":"text","required":true},{"key":"asking_price","label":"Asking price (£)","type":"number","required":true},{"key":"commission_pct","label":"Commission %","type":"number","required":true},{"key":"agency_type","label":"Agency type","type":"select","options":["Sole agency","Sole selling rights","Multi-agency"],"required":true},{"key":"term_weeks","label":"Term (weeks)","type":"number","required":true},{"key":"start_date","label":"Start","type":"date","required":true}]'::jsonb,
 ARRAY['seller','agent'], 4, true),

('sales-agency-agreement', 'Sales Agency Agreement', 'Sales', 'England & Wales', 'Estate Agents Act 1979',
 'Full estate-agency instruction agreement compliant with the Estate Agents Act 1979.',
 'This Sales Agency Agreement is made between {{seller_name}} ("Client") and {{agency_name}} ("Agent"). PROPERTY: {{property_address}}. ASKING PRICE: £{{asking_price}}. COMMISSION: {{commission_pct}}% + VAT on completion. SOLE/MULTI: {{agency_type}}. TERM: {{term_weeks}} weeks; 14 days written notice to terminate thereafter. The Agent confirms compliance with the Estate Agents Act 1979 and the Consumer Protection from Unfair Trading Regulations 2008. The Client confirms they are the legal owner and have all consents required to sell.',
 '[{"key":"seller_name","label":"Client","type":"text","required":true},{"key":"agency_name","label":"Agent","type":"text","required":true},{"key":"property_address","label":"Property","type":"text","required":true},{"key":"asking_price","label":"Asking (£)","type":"number","required":true},{"key":"commission_pct","label":"Commission %","type":"number","required":true},{"key":"agency_type","label":"Type","type":"select","options":["Sole agency","Sole selling rights","Multi-agency"],"required":true},{"key":"term_weeks","label":"Term (weeks)","type":"number","required":true}]'::jsonb,
 ARRAY['seller','agent'], 6, true),

('maintenance-contractor', 'Maintenance Contractor Agreement', 'Operations', 'UK-wide', NULL,
 'Engages a contractor for one-off or ongoing maintenance work.',
 'This Maintenance Contractor Agreement is made between {{client_name}} ("Client") and {{contractor_name}} ("Contractor"). SCOPE: {{scope}}. RATE: £{{rate}} per {{rate_unit}}. ESTIMATED VALUE: £{{estimated_value}}. START: {{start_date}}. COMPLETION: {{completion_date}}. INSURANCE: Contractor warrants £{{insurance_amount}} public liability cover. The Contractor will perform the works in a workmanlike manner and comply with all applicable Health & Safety legislation. Payment within 14 days of invoice.',
 '[{"key":"client_name","label":"Client","type":"text","required":true},{"key":"contractor_name","label":"Contractor","type":"text","required":true},{"key":"scope","label":"Scope of works","type":"textarea","required":true},{"key":"rate","label":"Rate (£)","type":"number","required":true},{"key":"rate_unit","label":"Per","type":"select","options":["hour","day","job"],"required":true},{"key":"estimated_value","label":"Estimated total (£)","type":"number"},{"key":"start_date","label":"Start","type":"date","required":true},{"key":"completion_date","label":"Completion","type":"date"},{"key":"insurance_amount","label":"PL insurance (£)","type":"number","required":true}]'::jsonb,
 ARRAY['client','contractor'], 3, true),

('third-party-services', '3rd-Party Services Contract', 'Operations', 'UK-wide', NULL,
 'Generic services agreement for cleaners, gardeners, utility brokers etc.',
 'This Services Agreement is made between {{client_name}} ("Client") and {{provider_name}} ("Provider"). SERVICE: {{service_description}}. FREQUENCY: {{frequency}}. FEE: £{{fee_amount}} per {{fee_period}}. TERM: {{term_months}} months from {{start_date}}, rolling thereafter with 30 days notice. The Provider warrants their work to be of reasonable skill and care and holds appropriate insurance. The Client will provide safe access and clear instructions.',
 '[{"key":"client_name","label":"Client","type":"text","required":true},{"key":"provider_name","label":"Provider","type":"text","required":true},{"key":"service_description","label":"Service description","type":"textarea","required":true},{"key":"frequency","label":"Frequency","type":"select","options":["Weekly","Fortnightly","Monthly","Ad-hoc"],"required":true},{"key":"fee_amount","label":"Fee (£)","type":"number","required":true},{"key":"fee_period","label":"Per","type":"select","options":["visit","month","year"],"required":true},{"key":"term_months","label":"Term (months)","type":"number","required":true},{"key":"start_date","label":"Start","type":"date","required":true}]'::jsonb,
 ARRAY['client','provider'], 3, true)
ON CONFLICT (agency_id, code, version) DO NOTHING;

-- =========================================================
-- 7. Realtime
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.holiday_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.property_blocks;
