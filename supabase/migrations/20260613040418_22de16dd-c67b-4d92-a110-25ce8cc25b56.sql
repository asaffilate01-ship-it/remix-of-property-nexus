
INSERT INTO public.compliance_rules (type, label, scope, renewal_months, description, authority) VALUES
  ('smoke_co_alarms', 'Smoke & CO Alarms', 'property', 12, 'Working smoke alarm on every storey; CO alarm in every room with fixed combustion appliance (excl. gas cookers). Test on day tenancy starts.', 'Smoke and Carbon Monoxide Alarm (Amendment) Regs 2022'),
  ('hhsrs_assessment', 'HHSRS Hazard Assessment', 'property', 24, 'Housing Health & Safety Rating System review of 29 hazards; refresh on works or complaint.', 'Housing Act 2004 Part 1'),
  ('mees_epc_upgrade', 'MEES EPC Upgrade Plan', 'property', 12, 'Path to EPC C by 2028 for new tenancies and 2030 for all tenancies (proposed). Track works & costs.', 'MEES Regulations 2018 (proposed amendment)'),
  ('awaabs_law', 'Awaab''s Law Hazard Response', 'property', 12, 'Investigate damp/mould within 14 days; written summary in 3 days; emergency hazards in 24 hours.', 'Social Housing (Regulation) Act 2023 / Renters Rights Bill'),
  ('building_safety', 'Building Safety Act Compliance', 'property', 12, 'Higher-risk buildings (18m+ or 7+ storeys): Accountable Person, safety case, golden thread, BSR registration.', 'Building Safety Act 2022'),
  ('asbestos_register', 'Asbestos Management Survey', 'property', 60, 'Required for HMO common parts in pre-2000 buildings. Maintain a register and management plan.', 'Control of Asbestos Regs 2012'),
  ('water_safety', 'Water Safety / Scalding Risk', 'property', 12, 'Hot water stored 60°C and delivered ≤43°C at outlets used by vulnerable tenants. TMV recommended.', 'HSG274 / DHSC scalding guidance'),
  ('gas_appliance_servicing', 'Gas Appliance Service Records', 'property', 12, 'Service records for boiler and any landlord gas appliances per manufacturer schedule.', 'Gas Safety Regs 1998 reg 35'),
  ('window_restrictors', 'Window Restrictors (above ground)', 'property', 24, 'Fit restrictors to upper-floor windows accessible by children in HMOs / family lets.', 'HHSRS / RoSPA guidance'),
  ('blind_cord_safety', 'Blind Cord Safety', 'property', 24, 'No looped blind cords accessible to children; cleats fitted; warning labels.', 'BS EN 13120'),
  ('right_to_rent_followup', 'Right to Rent Follow-up Check', 'tenancy', NULL, 'Time-limited visas: re-check before expiry or within 12 months, whichever sooner. Report to Home Office if no longer eligible.', 'Immigration Act 2014 / 2016'),
  ('tenant_fees_act', 'Tenant Fees Act Compliance', 'tenancy', NULL, 'Only permitted payments charged; holding deposit ≤1 week rent; refundable per schedule.', 'Tenant Fees Act 2019'),
  ('prescribed_info', 'Deposit Prescribed Information', 'tenancy', NULL, 'Serve Prescribed Information within 30 days of receiving deposit, alongside scheme leaflet.', 'Housing Act 2004 sch 10 / SI 2007/797'),
  ('tenancy_deposit_scheme', 'Tenancy Deposit Scheme Membership', 'tenancy', NULL, 'Deposit registered with DPS, MyDeposits or TDS within 30 days. Keep certificate on file.', 'Housing Act 2004 Part 6 Ch 4'),
  ('renters_rights_readiness', 'Renters'' Rights Act Readiness', 'tenancy', NULL, 'Periodic tenancy from day one, no Section 21, new possession grounds, rent increases via Section 13. Update processes & docs.', 'Renters'' Rights Bill 2024'),
  ('gdpr_privacy_notice', 'Tenant Privacy Notice (UK GDPR)', 'tenancy', 24, 'Issue privacy notice covering data processing, retention and subject rights.', 'UK GDPR / DPA 2018'),
  ('public_liability', 'Public Liability Insurance', 'agency', 12, 'Active public liability cover (typically £2m+) for agency premises and visits.', 'Industry standard'),
  ('landlord_insurance', 'Landlord Buildings & Liability Insurance', 'property', 12, 'Buildings cover with let-property endorsement plus liability. Confirm tenant status disclosed.', 'Industry standard'),
  ('mtd_itsa', 'Making Tax Digital for Income Tax', 'agency', 12, 'From Apr 2026 (income >£50k) / Apr 2027 (>£30k): quarterly digital submissions via MTD-compatible software.', 'HMRC Making Tax Digital'),
  ('complaints_procedure', 'In-house Complaints Procedure', 'agency', 24, 'Documented two-stage complaints procedure; signpost to redress scheme after 8 weeks.', 'Property Ombudsman Code / PRS Code'),
  ('material_information', 'NTSELAT Material Information (Parts A/B/C)', 'agency', 12, 'All Part A/B/C material information published with every listing (council tax, tenure, EPC, restrictions, utilities).', 'Digital Markets, Competition & Consumers Act 2024 / CPRs')
ON CONFLICT (type) DO UPDATE SET
  label = EXCLUDED.label,
  scope = EXCLUDED.scope,
  renewal_months = EXCLUDED.renewal_months,
  description = EXCLUDED.description,
  authority = EXCLUDED.authority;
