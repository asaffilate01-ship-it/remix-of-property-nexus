
-- ---------- 1. Demo auth users ----------
WITH demo_users (id, email, full_name, role) AS (
  VALUES
    ('a0000001-0000-0000-0000-000000000001'::uuid, 'demo.agent@estately.test',      'Sasha Patel',   'agent'),
    ('a0000001-0000-0000-0000-000000000002'::uuid, 'demo.landlord@estately.test',   'Marcus Reid',   'landlord'),
    ('a0000001-0000-0000-0000-000000000003'::uuid, 'demo.tenant@estately.test',     'Priya Shah',    'tenant'),
    ('a0000001-0000-0000-0000-000000000004'::uuid, 'demo.contractor@estately.test', 'Tom Whitman',   'contractor')
)
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  d.id, 'authenticated', 'authenticated', d.email,
  crypt('Estately!2026', gen_salt('bf')),
  now(),
  jsonb_build_object('provider','email','providers',ARRAY['email']),
  jsonb_build_object('full_name', d.full_name, 'role', d.role),
  now() - interval '40 days', now(),
  '', '', '', ''
FROM demo_users d
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
FROM auth.users u
WHERE u.id IN (
  'a0000001-0000-0000-0000-000000000001'::uuid,
  'a0000001-0000-0000-0000-000000000002'::uuid,
  'a0000001-0000-0000-0000-000000000003'::uuid,
  'a0000001-0000-0000-0000-000000000004'::uuid
)
AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email');

INSERT INTO public.profiles (id, full_name, primary_role) VALUES
  ('a0000001-0000-0000-0000-000000000001','Sasha Patel','agent'),
  ('a0000001-0000-0000-0000-000000000002','Marcus Reid','landlord'),
  ('a0000001-0000-0000-0000-000000000003','Priya Shah','tenant'),
  ('a0000001-0000-0000-0000-000000000004','Tom Whitman','contractor')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('a0000001-0000-0000-0000-000000000001','agent'),
  ('a0000001-0000-0000-0000-000000000002','landlord'),
  ('a0000001-0000-0000-0000-000000000003','tenant'),
  ('a0000001-0000-0000-0000-000000000004','contractor')
ON CONFLICT DO NOTHING;

-- ---------- 2. Agencies ----------
INSERT INTO public.agencies (id, owner_id, name, slug, description, website, phone, email, address, city, postcode, is_published, hmo_module_enabled, sales_module_enabled, lettings_module_enabled, commercial_module_enabled, logo_url, cover_image) VALUES
  ('b0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','Northstar Lettings & HMO','northstar-lettings','Independent letting and HMO specialists across the North West. Calm management, transparent fees, modern tools.','https://northstar.example','0161 555 0101','hello@northstar.example','14 Deansgate','Manchester','M3 2BH',true,true,true,true,false,'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1600&q=80&auto=format&fit=crop'),
  ('b0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001','Beacon & Co','beacon-and-co','Boutique residential sales agency for South West London. Chains closed, not chased.','https://beacon.example','020 7946 0102','sales@beacon.example','7 Northcote Road','London','SW11 6PJ',true,false,true,false,true,'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.agency_members (agency_id, user_id, role) VALUES
  ('b0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','owner'),
  ('b0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001','owner')
ON CONFLICT DO NOTHING;

-- ---------- 3. Contacts ----------
INSERT INTO public.contacts (id, agency_id, contact_type, full_name, company_name, email, phone, postcode, hourly_rate, is_preferred, certifications, insurance_expires_at, rating) VALUES
  ('c0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','gas_engineer','Tom Whitman','Whitman Gas Services','demo.contractor@estately.test','07700 900 010','M14 5RN',65,true,'["Gas Safe 654321","CCN1","CENWAT"]'::jsonb,'2027-04-12',5),
  ('c0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','electrician','Hannah Doyle','Doyle Electrical','hannah@doyle-elec.example','07700 900 011','M20 1AA',70,true,'["NICEIC","EICR Approved"]'::jsonb,'2026-11-30',4),
  ('c0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000001','plumber','Liam Brennan','Brennan Plumbing','liam@brennanplumb.example','07700 900 012','M4 6JG',55,false,'["CIPHE"]'::jsonb,'2026-08-01',4),
  ('c0000001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000001','epc_assessor','Olu Adebayo','GreenCert EPC','olu@greencert.example','07700 900 013','LS1 4DT',NULL,true,'["Domestic Energy Assessor"]'::jsonb,'2026-06-21',5),
  ('c0000001-0000-0000-0000-000000000005','b0000001-0000-0000-0000-000000000001','cleaner','Ana Costa','Sparkle End-of-Tenancy','ana@sparkleclean.example','07700 900 014','M1 3LD',28,true,'[]'::jsonb,NULL,5),
  ('c0000001-0000-0000-0000-000000000006','b0000001-0000-0000-0000-000000000001','locksmith','Reece Akram','LockSafe 24/7','reece@locksafe.example','07700 900 015','M2 4WU',85,false,'["MLA Approved"]'::jsonb,'2026-09-15',4),
  ('c0000001-0000-0000-0000-000000000007','b0000001-0000-0000-0000-000000000001','inventory_clerk','Jess Owens','OwensCheck Inventories','jess@owenscheck.example','07700 900 016','M3 1NQ',NULL,true,'["AIIC Member"]'::jsonb,NULL,5),
  ('c0000001-0000-0000-0000-000000000008','b0000001-0000-0000-0000-000000000002','solicitor','Geeta Mahesh','Mahesh & Partners LLP','geeta@maheshlaw.example','020 7946 0210','SW11 1PQ',NULL,true,'["SRA Regulated"]'::jsonb,'2026-12-31',5),
  ('c0000001-0000-0000-0000-000000000009','b0000001-0000-0000-0000-000000000002','conveyancer','David Holloway','Holloway Conveyancing','david@hollowayconv.example','020 7946 0211','SW18 4SR',NULL,true,'["CLC Licensed"]'::jsonb,'2026-10-20',4)
ON CONFLICT (id) DO NOTHING;

-- ---------- 4. Properties ----------
INSERT INTO public.properties (id, owner_id, agency_id, title, address, city, postcode, property_type, bedrooms, bathrooms, is_hmo, hmo_licence_number, hmo_licence_expires, listing_purpose, notes) VALUES
  ('d0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','Fallowfield 6-bed HMO','42 Egerton Road','Manchester','M14 6BB','terraced',6,2,true,'HMO/2024/00731','2028-03-31','rent','Mandatory licence – Manchester CC'),
  ('d0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','Withington 4-bed semi','11 Burton Road','Manchester','M20 3ED','semi_detached',4,2,false,NULL,NULL,'rent','Family let'),
  ('d0000001-0000-0000-0000-000000000003','a0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','Leeds city-centre apartment','Apt 8, The Maltings, Marsh Lane','Leeds','LS9 8BU','apartment',2,1,false,NULL,NULL,'rent','Concierge building'),
  ('d0000001-0000-0000-0000-000000000004','a0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','Bristol Clifton townhouse','3 Caledonia Place','Bristol','BS8 4DJ','terraced',5,3,false,NULL,NULL,'sale','Grade II – chain free'),
  ('d0000001-0000-0000-0000-000000000005','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000002','Battersea garden flat','12 Cologne Road','London','SW11 2AH','apartment',2,2,false,NULL,NULL,'sale','South-facing garden'),
  ('d0000001-0000-0000-0000-000000000006','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000002','Wandsworth Common 3-bed','58 Routh Road','London','SW18 3SR','terraced',3,1,false,NULL,NULL,'sale','Chain free, EPC C'),
  ('d0000001-0000-0000-0000-000000000007','a0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','Birmingham Jewellery Quarter loft','17 Vyse Street','Birmingham','B18 6JS','apartment',1,1,false,NULL,NULL,'rent','Loft conversion'),
  ('d0000001-0000-0000-0000-000000000008','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','Ancoats commercial unit','Ground floor, 22 Cotton Street','Manchester','M4 5BG','commercial',NULL,NULL,false,NULL,NULL,'rent','Class E unit – cafe / retail')
ON CONFLICT (id) DO NOTHING;

-- ---------- 5. Rooms ----------
INSERT INTO public.rooms (id, property_id, name, rent_pcm, deposit, size_sqm, en_suite, bills_included, status, available_from, description) VALUES
  ('e0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','Room 1 – Ground floor double',725,836,14.2,true,true,'let','2026-01-01','En-suite double, all bills included'),
  ('e0000001-0000-0000-0000-000000000002','d0000001-0000-0000-0000-000000000001','Room 2 – Ground floor single',595,686,9.4,false,true,'available','2026-07-01','Single bed, shared bathroom'),
  ('e0000001-0000-0000-0000-000000000003','d0000001-0000-0000-0000-000000000001','Room 3 – First floor double',695,802,12.8,false,true,'let','2025-09-15','Double, period sash window'),
  ('e0000001-0000-0000-0000-000000000004','d0000001-0000-0000-0000-000000000001','Room 4 – First floor en-suite',750,865,13.6,true,true,'reserved','2026-08-15','Reserved – holding deposit taken'),
  ('e0000001-0000-0000-0000-000000000005','d0000001-0000-0000-0000-000000000001','Room 5 – Loft double',775,895,15.5,true,true,'available','2026-07-15','Loft conversion + en-suite')
ON CONFLICT (id) DO NOTHING;

-- ---------- 6. Listings ----------
INSERT INTO public.listings (id, owner_id, agency_id, property_id, slug, title, description, listing_type, status, price, currency, bedrooms, bathrooms, receptions, address, city, postcode, cover_image, photos, features, is_hmo, bills_included, available_from, purpose, price_qualifier, tenure, epc_rating, floor_area_sqft, marketplace_publish, latitude, longitude, council_tax_band, furnished) VALUES
  ('f0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','fallowfield-hmo-egerton-rd','Fallowfield HMO room — bills inc.','Modern en-suite double in a 6-bed professional HMO. All bills, fast Wi-Fi and weekly cleaning included.','room','published',775,'GBP',1,1,0,'42 Egerton Road','Manchester','M14 6BB','https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&q=80&auto=format&fit=crop','["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80","https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80"]'::jsonb,'["en-suite","bills included","wifi","weekly cleaning","professional only"]'::jsonb,true,true,'2026-07-15','rent','fixed',NULL,'C',NULL,true,53.439400,-2.214700,'B','furnished'),
  ('f0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002','withington-4-bed-semi','4-bed family home, Withington','Bright semi with south-facing garden, modern kitchen and off-street parking. Close to West Didsbury Metrolink.','rent','published',2200,'GBP',4,2,2,'11 Burton Road','Manchester','M20 3ED','https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80&auto=format&fit=crop','["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80","https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80"]'::jsonb,'["garden","parking","modern kitchen","close to transport"]'::jsonb,false,false,'2026-08-01','rent','asking',NULL,'B',1450,true,53.435000,-2.230000,'D','unfurnished'),
  ('f0000001-0000-0000-0000-000000000003','a0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003','leeds-maltings-2-bed','2-bed apartment, The Maltings','Stylish 2-bed with concierge, gym and rooftop terrace. Includes parking space.','rent','published',1450,'GBP',2,1,1,'Apt 8, The Maltings, Marsh Lane','Leeds','LS9 8BU','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80&auto=format&fit=crop','[]'::jsonb,'["concierge","gym","rooftop terrace","parking"]'::jsonb,false,false,'2026-07-01','rent','asking',NULL,'B',780,true,53.798000,-1.530000,'C','part_furnished'),
  ('f0000001-0000-0000-0000-000000000004','a0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000004','bristol-clifton-townhouse','Clifton Georgian townhouse','Grade II listed 5-bed over four floors with original features, garden and city views.','sale','published',1450000,'GBP',5,3,3,'3 Caledonia Place','Bristol','BS8 4DJ','https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&q=80&auto=format&fit=crop','["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80"]'::jsonb,'["grade II listed","garden","period features","chain free"]'::jsonb,false,false,NULL,'sale','guide_price','freehold','D',2580,true,51.452000,-2.620000,'G','unfurnished'),
  ('f0000001-0000-0000-0000-000000000005','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000002','d0000001-0000-0000-0000-000000000005','battersea-garden-flat-cologne','Battersea garden flat — chain free','Beautifully presented 2-bed garden flat with private south-facing patio and modern kitchen.','sale','published',795000,'GBP',2,2,1,'12 Cologne Road','London','SW11 2AH','https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80&auto=format&fit=crop','["https://images.unsplash.com/photo-1600573472556-e636c2acda88?w=1200&q=80","https://images.unsplash.com/photo-1600566753086-00f18fe6ba70?w=1200&q=80"]'::jsonb,'["garden","share of freehold","chain free","wood floors"]'::jsonb,false,false,NULL,'sale','offers_in_region','share_of_freehold','C',915,true,51.461000,-0.169000,'E','unfurnished'),
  ('f0000001-0000-0000-0000-000000000006','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000002','d0000001-0000-0000-0000-000000000006','wandsworth-3-bed-routh','3-bed terrace near Wandsworth Common','Stunning 3-bedroom Victorian terrace, fully refurbished with extension and landscaped garden.','sale','under_offer',1295000,'GBP',3,1,2,'58 Routh Road','London','SW18 3SR','https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80&auto=format&fit=crop','[]'::jsonb,'["extension","landscaped garden","walking distance to common"]'::jsonb,false,false,NULL,'sale','asking','freehold','C',1280,true,51.456000,-0.182000,'F','unfurnished'),
  ('f0000001-0000-0000-0000-000000000007','a0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000007','jq-loft-vyse-street','Jewellery Quarter loft','Industrial-style 1-bed loft with exposed brick, mezzanine bedroom and balcony.','rent','published',1100,'GBP',1,1,1,'17 Vyse Street','Birmingham','B18 6JS','https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80&auto=format&fit=crop','[]'::jsonb,'["loft","mezzanine","balcony","city centre"]'::jsonb,false,false,'2026-07-20','rent','asking',NULL,'C',640,true,52.487000,-1.910000,'C','furnished'),
  ('f0000001-0000-0000-0000-000000000008','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000008','ancoats-cafe-unit-cotton-st','Ancoats Class E unit — cafe / retail','Prominent ground-floor commercial unit on Cotton Street, ideal for cafe, retail or studio use. Class E.','rent','published',32000,'GBP',NULL,1,NULL,'22 Cotton Street','Manchester','M4 5BG','https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=1200&q=80&auto=format&fit=crop','[]'::jsonb,'["class E","high footfall","new lease"]'::jsonb,false,false,'2026-09-01','rent','asking','leasehold','B',1180,true,53.484000,-2.225000,NULL,'unfurnished'),
  ('f0000001-0000-0000-0000-000000000009','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','fallowfield-hmo-single-room','HMO single room — bills inc.','Affordable single room in shared professional house, all bills included.','room','published',595,'GBP',1,0,0,'42 Egerton Road','Manchester','M14 6BB','https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1200&q=80&auto=format&fit=crop','[]'::jsonb,'["bills included","wifi","close to university"]'::jsonb,true,true,'2026-07-01','rent','fixed',NULL,'C',NULL,true,53.439400,-2.214700,'B','furnished')
ON CONFLICT (id) DO NOTHING;

-- ---------- 7. Tenancies ----------
INSERT INTO public.tenancies (id, agency_id, property_id, room_id, tenant_user_id, tenant_name, tenant_email, tenant_phone, start_date, end_date, rent_amount, rent_frequency, deposit, deposit_scheme, deposit_reference, status, notes) VALUES
  ('11110001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000003','Priya Shah','demo.tenant@estately.test','07700 900 200','2026-01-01','2026-12-31',725,'monthly',836,'DPS','DPS/2026/HMO/00112','active','Initial 12-month AST'),
  ('11110001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000003',NULL,'Aiden McCoy','aiden@example.com','07700 900 201','2025-09-15','2026-09-14',695,'monthly',802,'TDS','TDS/2025/8901','active',NULL),
  ('11110001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002',NULL,NULL,'The Okafor Family','okafor@example.com','07700 900 202','2025-06-01','2026-05-31',2200,'monthly',2538,'MyDeposits','MD/2025/5566','active','Family let, 12m AST')
ON CONFLICT (id) DO NOTHING;

-- ---------- 8. Rent schedule ----------
INSERT INTO public.rent_schedule (tenancy_id, period_start, period_end, due_date, amount, status, paid_amount, paid_at)
SELECT
  '11110001-0000-0000-0000-000000000001'::uuid,
  (date '2026-01-01' + (i || ' months')::interval)::date,
  ((date '2026-01-01' + ((i+1) || ' months')::interval) - interval '1 day')::date,
  (date '2026-01-01' + (i || ' months')::interval)::date,
  725,
  (CASE WHEN i < 5 THEN 'paid' ELSE 'due' END)::rent_status,
  CASE WHEN i < 5 THEN 725 ELSE NULL END,
  CASE WHEN i < 5 THEN (date '2026-01-01' + (i || ' months')::interval)::timestamptz ELSE NULL END
FROM generate_series(0,11) AS i
WHERE NOT EXISTS (SELECT 1 FROM public.rent_schedule WHERE tenancy_id = '11110001-0000-0000-0000-000000000001'::uuid);

-- ---------- 9. Compliance records ----------
INSERT INTO public.compliance_records (id, property_id, agency_id, tenancy_id, type, issued_on, expires_on, status, reference, notes) VALUES
  ('22220001-0000-0000-0000-000000000001',NULL,'b0000001-0000-0000-0000-000000000001',NULL,'cmp','2026-01-15','2027-01-14','valid','CMP/PRS/12345','Client Money Protection – Propertymark'),
  ('22220001-0000-0000-0000-000000000002',NULL,'b0000001-0000-0000-0000-000000000001',NULL,'redress','2026-01-15','2027-01-14','valid','TPO/55678','The Property Ombudsman'),
  ('22220001-0000-0000-0000-000000000003',NULL,'b0000001-0000-0000-0000-000000000001',NULL,'aml','2026-02-01','2027-01-31','valid','HMRC/AML/889','HMRC supervision active'),
  ('22220001-0000-0000-0000-000000000004',NULL,'b0000001-0000-0000-0000-000000000001',NULL,'ico','2026-03-01','2027-02-28','valid','ICO/Z1234567','Data Protection registration'),
  ('22220001-0000-0000-0000-000000000005',NULL,'b0000001-0000-0000-0000-000000000001',NULL,'pi_insurance','2026-04-01','2027-03-31','valid','PI/2026/9988','Professional Indemnity – £1m'),
  ('22220001-0000-0000-0000-000000000006',NULL,'b0000001-0000-0000-0000-000000000001',NULL,'complaints_procedure','2026-01-15',NULL,'valid','v3.2','Published in branch & on website'),
  ('22220001-0000-0000-0000-000000000010','d0000001-0000-0000-0000-000000000001',NULL,NULL,'hmo_licence','2023-04-01','2028-03-31','valid','HMO/2024/00731','Manchester CC'),
  ('22220001-0000-0000-0000-000000000011','d0000001-0000-0000-0000-000000000001',NULL,NULL,'gas_safety','2025-08-01','2026-07-31','due_soon','GS-2025-001','Annual CP12'),
  ('22220001-0000-0000-0000-000000000012','d0000001-0000-0000-0000-000000000001',NULL,NULL,'eicr','2024-04-10','2029-04-09','valid','EICR-2024-771',NULL),
  ('22220001-0000-0000-0000-000000000013','d0000001-0000-0000-0000-000000000001',NULL,NULL,'epc','2022-05-12','2032-05-11','valid','EPC-9876543210','Rating C'),
  ('22220001-0000-0000-0000-000000000014','d0000001-0000-0000-0000-000000000001',NULL,NULL,'fire_risk_assessment','2025-06-01','2026-05-31','due_soon','FRA-2025-018',NULL),
  ('22220001-0000-0000-0000-000000000015','d0000001-0000-0000-0000-000000000001',NULL,NULL,'emergency_lighting','2025-06-01','2026-05-31','due_soon','EL-2025-022','Monthly tests recorded'),
  ('22220001-0000-0000-0000-000000000016','d0000001-0000-0000-0000-000000000001',NULL,NULL,'pat','2025-09-01','2026-08-31','valid','PAT-2025-112',NULL),
  ('22220001-0000-0000-0000-000000000017','d0000001-0000-0000-0000-000000000001',NULL,NULL,'legionella','2024-11-01','2026-10-31','valid','LRA-2024-005',NULL),
  ('22220001-0000-0000-0000-000000000018','d0000001-0000-0000-0000-000000000001',NULL,NULL,'smoke_co_alarms','2026-01-01',NULL,'valid','CHECK-2026-01','Quarterly check'),
  ('22220001-0000-0000-0000-000000000020','d0000001-0000-0000-0000-000000000002',NULL,NULL,'gas_safety','2024-10-01','2025-09-30','expired','GS-2024-114','OVERDUE — book renewal'),
  ('22220001-0000-0000-0000-000000000021','d0000001-0000-0000-0000-000000000002',NULL,NULL,'epc','2018-05-01','2028-04-30','valid','EPC-1122334455','Rating B'),
  ('22220001-0000-0000-0000-000000000022','d0000001-0000-0000-0000-000000000003',NULL,NULL,'eicr','2025-02-12','2030-02-11','valid','EICR-2025-301',NULL),
  ('22220001-0000-0000-0000-000000000023','d0000001-0000-0000-0000-000000000007',NULL,NULL,'epc','2023-07-01','2033-06-30','valid','EPC-7733991100','Rating C'),
  ('22220001-0000-0000-0000-000000000030',NULL,NULL,'11110001-0000-0000-0000-000000000001','right_to_rent','2025-12-01',NULL,'valid','RTR-2025-PSH','UK passport verified'),
  ('22220001-0000-0000-0000-000000000031',NULL,NULL,'11110001-0000-0000-0000-000000000001','ast','2025-12-15','2026-12-31','valid','AST-2026-HMO-R1','12m AST signed'),
  ('22220001-0000-0000-0000-000000000032',NULL,NULL,'11110001-0000-0000-0000-000000000001','deposit_protection','2026-01-05','2026-12-31','valid','DPS/2026/HMO/00112','Protected with DPS'),
  ('22220001-0000-0000-0000-000000000033',NULL,NULL,'11110001-0000-0000-0000-000000000001','how_to_rent','2025-12-15',NULL,'valid','HTR-2025','Latest gov.uk guide served'),
  ('22220001-0000-0000-0000-000000000034',NULL,NULL,'11110001-0000-0000-0000-000000000001','inventory','2025-12-30',NULL,'valid','INV-2025-PSH','Owens Inventories – signed')
ON CONFLICT (id) DO NOTHING;

-- ---------- 10. Leads ----------
INSERT INTO public.leads (id, listing_id, agency_id, owner_id, name, email, phone, message, status, source) VALUES
  ('33330001-0000-0000-0000-000000000001','f0000001-0000-0000-0000-000000000005','b0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001','Emily Carter','emily.c@example.com','07700 900 301','Could we arrange a viewing this weekend?','new','marketplace'),
  ('33330001-0000-0000-0000-000000000002','f0000001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000002','Jasper Williams','jasper@example.com','07700 900 302','Cash buyer, would like to view.','qualified','marketplace'),
  ('33330001-0000-0000-0000-000000000003','f0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','Mei Tanaka','mei@example.com','07700 900 303','Looking for a room from August, professional.','viewing_booked','marketplace'),
  ('33330001-0000-0000-0000-000000000004','f0000001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','The Walsh family','walsh@example.com','07700 900 304','Family of 4, two well-behaved cats.','contacted','marketplace'),
  ('33330001-0000-0000-0000-000000000005','f0000001-0000-0000-0000-000000000008','b0000001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','Riverside Coffee Co.','hello@riversidecoffee.example','07700 900 305','Interested in the Ancoats unit for our second site.','new','marketplace'),
  ('33330001-0000-0000-0000-000000000006','f0000001-0000-0000-0000-000000000006','b0000001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001','Alex & Sam','alexsam@example.com','07700 900 306','Offer £1.27m, mortgage AIP attached.','offer','marketplace')
ON CONFLICT (id) DO NOTHING;

-- ---------- 11. Pipeline deals ----------
INSERT INTO public.deals (id, owner_id, agency_id, lead_id, listing_id, title, contact_name, contact_email, contact_phone, stage, value, notes) VALUES
  ('44440001-0000-0000-0000-000000000001','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000002','33330001-0000-0000-0000-000000000001','f0000001-0000-0000-0000-000000000005','Cologne Rd — Emily Carter','Emily Carter','emily.c@example.com','07700 900 301','viewing',795000,'Second viewing Saturday 11am'),
  ('44440001-0000-0000-0000-000000000002','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','33330001-0000-0000-0000-000000000002','f0000001-0000-0000-0000-000000000004','Clifton townhouse — Williams','Jasper Williams','jasper@example.com','07700 900 302','offer',1395000,'Cash buyer, offer £1.395m'),
  ('44440001-0000-0000-0000-000000000003','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000002','33330001-0000-0000-0000-000000000006','f0000001-0000-0000-0000-000000000006','Routh Rd — Alex & Sam','Alex & Sam','alexsam@example.com','07700 900 306','negotiation',1270000,'Asking £1.295m, offer £1.27m'),
  ('44440001-0000-0000-0000-000000000004','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','33330001-0000-0000-0000-000000000003','f0000001-0000-0000-0000-000000000001','HMO Room — Mei Tanaka','Mei Tanaka','mei@example.com','07700 900 303','agreed',775,'Holding deposit taken, AST to issue'),
  ('44440001-0000-0000-0000-000000000005','a0000001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','33330001-0000-0000-0000-000000000005','f0000001-0000-0000-0000-000000000008','Ancoats unit — Riverside Coffee','Riverside Coffee Co.','hello@riversidecoffee.example','07700 900 305','contacted',32000,'Heads of terms drafted')
ON CONFLICT (id) DO NOTHING;

-- ---------- 12. Work orders ----------
INSERT INTO public.work_orders (id, agency_id, property_id, room_id, tenancy_id, contact_id, title, description, status, priority, category, reported_by, scheduled_for, estimated_cost) VALUES
  ('55550001-0000-0000-0000-000000000001','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000001','11110001-0000-0000-0000-000000000001','c0000001-0000-0000-0000-000000000001','Annual gas safety renewal','Fallowfield HMO — full CP12 across boiler, hob and gas fire.','open','high','gas','a0000001-0000-0000-0000-000000000001', now() + interval '7 days', 120),
  ('55550001-0000-0000-0000-000000000002','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002',NULL,'11110001-0000-0000-0000-000000000003','c0000001-0000-0000-0000-000000000003','Leaking under-sink trap','Tenant reports drip from kitchen under-sink waste.','in_progress','medium','plumbing','a0000001-0000-0000-0000-000000000002', now() + interval '2 days', 95),
  ('55550001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001',NULL,NULL,'c0000001-0000-0000-0000-000000000005','End-of-tenancy clean — Room 4','Deep clean before new tenant move-in.','open','low','cleaning','a0000001-0000-0000-0000-000000000001', now() + interval '14 days', 180),
  ('55550001-0000-0000-0000-000000000004','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003',NULL,NULL,'c0000001-0000-0000-0000-000000000002','EICR remedial — kitchen socket','Replace damaged socket flagged on last inspection.','completed','medium','electrical','a0000001-0000-0000-0000-000000000002', now() - interval '3 days', 75)
ON CONFLICT (id) DO NOTHING;
