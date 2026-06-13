
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS marketplace_publish boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS latitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6),
  ADD COLUMN IF NOT EXISTS council_tax_band text,
  ADD COLUMN IF NOT EXISTS furnished text;

CREATE INDEX IF NOT EXISTS idx_listings_marketplace ON public.listings (marketplace_publish) WHERE marketplace_publish = true;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS cover_image text;
