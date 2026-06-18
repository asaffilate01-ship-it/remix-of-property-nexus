
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS epc_rating text,
  ADD COLUMN IF NOT EXISTS tenure text,
  ADD COLUMN IF NOT EXISTS furnished text,
  ADD COLUMN IF NOT EXISTS council_tax_band text,
  ADD COLUMN IF NOT EXISTS floor_area_sqft numeric,
  ADD COLUMN IF NOT EXISTS bills_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS cover_image text,
  ADD COLUMN IF NOT EXISTS photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS price_qualifier text;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS website_publish boolean NOT NULL DEFAULT true;
