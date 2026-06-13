
-- ============ 1. EXTEND COMPLIANCE_RECORDS ============
-- Add new item types covering UK landlord/tenant/agent/HMO requirements.
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'pat';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'legionella';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'selective_licence';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'fire_risk_assessment';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'emergency_lighting';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'fire_door_check';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'right_to_rent';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'ast';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'how_to_rent';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'deposit_protection';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'inventory';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'cmp';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'redress';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'aml';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'pi_insurance';
ALTER TYPE public.compliance_type ADD VALUE IF NOT EXISTS 'ico';
