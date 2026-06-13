
-- Enums
DO $$ BEGIN
  CREATE TYPE public.property_type AS ENUM ('residential_sale','residential_let','hmo','commercial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.listing_purpose AS ENUM ('sale','rent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.price_qualifier AS ENUM ('asking','offers_over','offers_in_region','guide_price','poa','fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tenure_type AS ENUM ('freehold','leasehold','share_of_freehold','commonhold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Properties: add classification
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_type public.property_type NOT NULL DEFAULT 'residential_let',
  ADD COLUMN IF NOT EXISTS listing_purpose public.listing_purpose NOT NULL DEFAULT 'rent';

-- Listings: sales + commercial fields
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS purpose public.listing_purpose NOT NULL DEFAULT 'rent',
  ADD COLUMN IF NOT EXISTS price_qualifier public.price_qualifier,
  ADD COLUMN IF NOT EXISTS tenure public.tenure_type,
  ADD COLUMN IF NOT EXISTS bedrooms int,
  ADD COLUMN IF NOT EXISTS bathrooms int,
  ADD COLUMN IF NOT EXISTS receptions int,
  ADD COLUMN IF NOT EXISTS epc_rating text,
  ADD COLUMN IF NOT EXISTS floor_area_sqft numeric,
  ADD COLUMN IF NOT EXISTS lease_term_months int,
  ADD COLUMN IF NOT EXISTS service_charge_pa numeric,
  ADD COLUMN IF NOT EXISTS business_rates_pa numeric;

-- Agencies: module toggles
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS hmo_module_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_module_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lettings_module_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS commercial_module_enabled boolean NOT NULL DEFAULT false;

-- Index for marketplace filtering
CREATE INDEX IF NOT EXISTS listings_purpose_idx ON public.listings(purpose);
CREATE INDEX IF NOT EXISTS properties_type_idx ON public.properties(property_type);
