
-- Survey folders (hierarchical organisation)
CREATE TABLE public.survey_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.survey_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_folders TO authenticated;
GRANT ALL ON public.survey_folders TO service_role;
ALTER TABLE public.survey_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own folders" ON public.survey_folders
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agency members read agency folders" ON public.survey_folders
  FOR SELECT TO authenticated USING (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()));

CREATE TRIGGER survey_folders_updated BEFORE UPDATE ON public.survey_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_survey_folders_user ON public.survey_folders(user_id);
CREATE INDEX idx_survey_folders_parent ON public.survey_folders(parent_id);
CREATE INDEX idx_survey_folders_property ON public.survey_folders(property_id);

-- Captures (photos / videos with geolocation)
CREATE TABLE public.survey_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES public.survey_folders(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('photo','video')),
  storage_path TEXT NOT NULL,
  thumb_path TEXT,
  mime_type TEXT,
  bytes BIGINT,
  duration_ms INT,
  width INT,
  height INT,
  caption TEXT CHECK (caption IS NULL OR length(caption) <= 2000),
  tags TEXT[] NOT NULL DEFAULT '{}',
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  accuracy_m NUMERIC(8,2),
  heading NUMERIC(6,2),
  altitude NUMERIC(8,2),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_captures TO authenticated;
GRANT ALL ON public.survey_captures TO service_role;
ALTER TABLE public.survey_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own captures" ON public.survey_captures
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agency members read agency captures" ON public.survey_captures
  FOR SELECT TO authenticated USING (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid()));

CREATE TRIGGER survey_captures_updated BEFORE UPDATE ON public.survey_captures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_survey_captures_user ON public.survey_captures(user_id);
CREATE INDEX idx_survey_captures_folder ON public.survey_captures(folder_id);
CREATE INDEX idx_survey_captures_property ON public.survey_captures(property_id);
CREATE INDEX idx_survey_captures_work_order ON public.survey_captures(work_order_id);
CREATE INDEX idx_survey_captures_captured_at ON public.survey_captures(captured_at DESC);

-- Storage RLS for the (to-be-created) survey-media bucket
CREATE POLICY "survey owners read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'survey-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "survey owners insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'survey-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "survey owners update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'survey-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "survey owners delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'survey-media' AND auth.uid()::text = (storage.foldername(name))[1]);
