
-- Extend compliance_type enum with comprehensive UK obligations
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'smoke_co_alarms';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'mees_epc_upgrade';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'awaabs_law';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'building_safety';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'asbestos_register';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'water_safety';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'right_to_rent_followup';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'tenant_fees_act';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'prescribed_info';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'renters_rights_readiness';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'gdpr_privacy_notice';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'complaints_procedure';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'material_information';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'public_liability';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'landlord_insurance';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'mtd_itsa';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'hhsrs_assessment';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'tenancy_deposit_scheme';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'gas_appliance_servicing';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'window_restrictors';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'blind_cord_safety';
