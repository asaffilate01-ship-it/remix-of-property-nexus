-- Seed demo referencing cases
INSERT INTO public.referencing_cases (id, tenant_id, agency_id, property_id, status, current_step, applicant, employment, previous_landlord, income_monthly, credit_consent, decision, notes, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111101','a0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002','submitted',1,
   '{"name":"Priya Shah","dob":"1992-04-18","email":"demo.tenant@estately.test","phone":"07700 900 200","address":"42 Egerton Road, Manchester M14 6BB","years_at":"1","previous_address":"","id_type":"passport"}',
   '{"employer":"TechFlow Ltd","role":"Product Designer","salary":"52000","contract":"permanent"}',
   '{"name":"Marcus Reid","email":"demo.landlord@estately.test","rent_paid":"725","arrears":"no"}',
   4333, true, NULL, NULL, now() - interval '2 days', now() - interval '2 days'),

  ('11111111-1111-1111-1111-111111111102','a0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002','in_review',1,
   '{"name":"Aiden McCoy","dob":"1988-11-03","email":"aiden@example.com","phone":"07700 900 201","address":"11 Burton Road, Manchester M20 3ED","years_at":"2","previous_address":"Flat 2, Oxford Road, Manchester","id_type":"driving_licence"}',
   '{"employer":"Greenfield Consulting","role":"Senior Consultant","salary":"68000","contract":"permanent"}',
   '{"name":"Sarah Mitchell","email":"sarah.m@example.com","rent_paid":"2200","arrears":"no"}',
   5667, true, NULL, 'Waiting for employer reference response', now() - interval '5 days', now() - interval '1 day'),

  ('11111111-1111-1111-1111-111111111103','a0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000002','d0000001-0000-0000-0000-000000000005','approved',1,
   '{"name":"James Patel","dob":"1990-07-22","email":"james.patel@example.com","phone":"07700 900 203","address":"12 Cologne Road, London SW11 2AH","years_at":"3","previous_address":"","id_type":"passport"}',
   '{"employer":"Barclays","role":"Risk Analyst","salary":"62000","contract":"permanent"}',
   '{"name":"Olu Adebayo","email":"olu@greencert.example","rent_paid":"1950","arrears":"no"}',
   5167, true, 'Passed — income 2.6x rent, clean landlord ref, right-to-rent verified.', 'Strong applicant. Recommended.', now() - interval '8 days', now() - interval '6 days'),

  ('11111111-1111-1111-1111-111111111104','a0000001-0000-0000-0000-000000000003','b0000001-0000-0000-0000-000000000002','d0000001-0000-0000-0000-000000000006','declined',1,
   '{"name":"Olivia Brown","dob":"1995-01-15","email":"olivia.brown@example.com","phone":"07700 900 204","address":"58 Routh Road, London SW18 3SR","years_at":"0","previous_address":"7 Northcote Road, London","id_type":"brp"}',
   '{"employer":"Freelance","role":"Photographer","salary":"24000","contract":"self_employed"}',
   '{"name":"David Holloway","email":"david@hollowayconv.example","rent_paid":"1800","arrears":"yes"}',
   2000, true, 'Declined — insufficient income (1.1x rent) and adverse landlord reference.', 'Income too low for rent level. Previous arrears confirmed by landlord.', now() - interval '10 days', now() - interval '9 days')
ON CONFLICT (id) DO NOTHING;