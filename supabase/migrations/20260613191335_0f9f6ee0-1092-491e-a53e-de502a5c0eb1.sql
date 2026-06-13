ALTER TABLE public.listings 
  ADD COLUMN IF NOT EXISTS rooms jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance jsonb NOT NULL DEFAULT '{}'::jsonb;