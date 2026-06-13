
-- Extend listing_purpose enum
ALTER TYPE public.listing_purpose ADD VALUE IF NOT EXISTS 'both';
ALTER TYPE public.listing_purpose ADD VALUE IF NOT EXISTS 'short_let';

-- Property features + short-let fields
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nightly_rate numeric,
  ADD COLUMN IF NOT EXISTS min_stay_nights integer,
  ADD COLUMN IF NOT EXISTS cleaning_fee numeric;

-- Room number on rooms
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS room_number text;

-- Cleaning jobs table
CREATE TABLE IF NOT EXISTS public.cleaning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 90,
  assignee_name text,
  assignee_user_id uuid,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_jobs TO authenticated;
GRANT ALL ON public.cleaning_jobs TO service_role;

ALTER TABLE public.cleaning_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and agency manage cleaning jobs"
  ON public.cleaning_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = cleaning_jobs.property_id
        AND (
          p.owner_id = auth.uid()
          OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid()))
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = cleaning_jobs.property_id
        AND (
          p.owner_id = auth.uid()
          OR (p.agency_id IS NOT NULL AND public.is_agency_member(p.agency_id, auth.uid()))
        )
    )
  );

CREATE TRIGGER cleaning_jobs_updated_at
  BEFORE UPDATE ON public.cleaning_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS cleaning_jobs_property_idx ON public.cleaning_jobs(property_id, scheduled_at);
