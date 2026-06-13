ALTER TABLE public.tenancies
  ADD COLUMN IF NOT EXISTS bio jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tenant_compliance jsonb NOT NULL DEFAULT '{}'::jsonb;