
-- Enums
DO $$ BEGIN
  CREATE TYPE public.track_trigger_event AS ENUM (
    'manual','lead_created','listing_created','viewing_booked','viewing_completed',
    'offer_received','offer_accepted','tenancy_started','tenancy_ending',
    'contact_created','deal_created'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.track_entity_type AS ENUM ('lead','listing','viewing','offer','tenancy','contact','deal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.track_action_type AS ENUM ('send_email','create_task','create_alert','send_sms','add_tag','assign_to','webhook','wait');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.track_delay_unit AS ENUM ('minutes','hours','days');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.track_run_status AS ENUM ('running','completed','cancelled','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.track_step_status AS ENUM ('pending','done','skipped','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- track_templates
CREATE TABLE public.track_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger_event public.track_trigger_event NOT NULL DEFAULT 'manual',
  entity_type public.track_entity_type NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_templates TO authenticated;
GRANT ALL ON public.track_templates TO service_role;
ALTER TABLE public.track_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency members manage templates" ON public.track_templates
  FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE TRIGGER trg_track_templates_updated BEFORE UPDATE ON public.track_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- track_steps
CREATE TABLE public.track_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.track_templates(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  delay_amount int NOT NULL DEFAULT 0,
  delay_unit public.track_delay_unit NOT NULL DEFAULT 'days',
  action_type public.track_action_type NOT NULL,
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  condition jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, step_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_steps TO authenticated;
GRANT ALL ON public.track_steps TO service_role;
ALTER TABLE public.track_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage steps via template" ON public.track_steps
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.track_templates t WHERE t.id = template_id AND public.is_agency_member(t.agency_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.track_templates t WHERE t.id = template_id AND public.is_agency_member(t.agency_id, auth.uid())));
CREATE TRIGGER trg_track_steps_updated BEFORE UPDATE ON public.track_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- track_runs
CREATE TABLE public.track_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.track_templates(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  entity_type public.track_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  status public.track_run_status NOT NULL DEFAULT 'running',
  started_by uuid REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_runs TO authenticated;
GRANT ALL ON public.track_runs TO service_role;
ALTER TABLE public.track_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members manage runs" ON public.track_runs
  FOR ALL TO authenticated
  USING (public.is_agency_member(agency_id, auth.uid()))
  WITH CHECK (public.is_agency_member(agency_id, auth.uid()));
CREATE TRIGGER trg_track_runs_updated BEFORE UPDATE ON public.track_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_track_runs_entity ON public.track_runs (entity_type, entity_id);
CREATE INDEX idx_track_runs_status ON public.track_runs (status);

-- track_run_steps
CREATE TABLE public.track_run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.track_runs(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.track_steps(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  scheduled_for timestamptz NOT NULL,
  executed_at timestamptz,
  status public.track_step_status NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_run_steps TO authenticated;
GRANT ALL ON public.track_run_steps TO service_role;
ALTER TABLE public.track_run_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view/update run steps via run" ON public.track_run_steps
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.track_runs r WHERE r.id = run_id AND public.is_agency_member(r.agency_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.track_runs r WHERE r.id = run_id AND public.is_agency_member(r.agency_id, auth.uid())));
CREATE TRIGGER trg_track_run_steps_updated BEFORE UPDATE ON public.track_run_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_track_run_steps_due ON public.track_run_steps (status, scheduled_for) WHERE status = 'pending';

-- Enrollment function: creates a run + schedules all steps
CREATE OR REPLACE FUNCTION public.enroll_in_track(_template_id uuid, _entity_id uuid, _started_by uuid DEFAULT NULL, _context jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tpl public.track_templates%ROWTYPE;
  _run_id uuid;
  _cum interval := interval '0';
  _step RECORD;
BEGIN
  SELECT * INTO _tpl FROM public.track_templates WHERE id = _template_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template not found or inactive'; END IF;

  INSERT INTO public.track_runs (template_id, agency_id, entity_type, entity_id, started_by, context)
  VALUES (_tpl.id, _tpl.agency_id, _tpl.entity_type, _entity_id, _started_by, _context)
  RETURNING id INTO _run_id;

  FOR _step IN SELECT * FROM public.track_steps WHERE template_id = _tpl.id ORDER BY step_order
  LOOP
    _cum := _cum + (_step.delay_amount || ' ' || _step.delay_unit::text)::interval;
    INSERT INTO public.track_run_steps (run_id, step_id, step_order, scheduled_for)
    VALUES (_run_id, _step.id, _step.step_order, now() + _cum);
  END LOOP;

  RETURN _run_id;
END;
$$;

-- Auto-enroll trigger on common events
CREATE OR REPLACE FUNCTION public.fn_autoenroll_tracks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event public.track_trigger_event;
  _entity public.track_entity_type;
  _agency uuid;
  _tpl RECORD;
BEGIN
  IF TG_TABLE_NAME = 'leads' THEN _event := 'lead_created'; _entity := 'lead'; _agency := NEW.agency_id;
  ELSIF TG_TABLE_NAME = 'listings' THEN _event := 'listing_created'; _entity := 'listing'; _agency := NEW.agency_id;
  ELSIF TG_TABLE_NAME = 'viewings' THEN _event := 'viewing_booked'; _entity := 'viewing'; _agency := NEW.agency_id;
  ELSIF TG_TABLE_NAME = 'offers' THEN _event := 'offer_received'; _entity := 'offer'; _agency := NEW.agency_id;
  ELSIF TG_TABLE_NAME = 'tenancies' THEN _event := 'tenancy_started'; _entity := 'tenancy'; _agency := NEW.agency_id;
  ELSIF TG_TABLE_NAME = 'contacts' THEN _event := 'contact_created'; _entity := 'contact'; _agency := NEW.agency_id;
  ELSE RETURN NEW;
  END IF;

  IF _agency IS NULL THEN RETURN NEW; END IF;

  FOR _tpl IN SELECT id FROM public.track_templates
    WHERE agency_id = _agency AND is_active AND trigger_event = _event AND entity_type = _entity
  LOOP
    PERFORM public.enroll_in_track(_tpl.id, NEW.id, NULL, jsonb_build_object('auto', true));
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_autoenroll_leads AFTER INSERT ON public.leads FOR EACH ROW EXECUTE FUNCTION public.fn_autoenroll_tracks();
CREATE TRIGGER trg_autoenroll_listings AFTER INSERT ON public.listings FOR EACH ROW EXECUTE FUNCTION public.fn_autoenroll_tracks();
CREATE TRIGGER trg_autoenroll_viewings AFTER INSERT ON public.viewings FOR EACH ROW EXECUTE FUNCTION public.fn_autoenroll_tracks();
CREATE TRIGGER trg_autoenroll_offers AFTER INSERT ON public.offers FOR EACH ROW EXECUTE FUNCTION public.fn_autoenroll_tracks();
CREATE TRIGGER trg_autoenroll_tenancies AFTER INSERT ON public.tenancies FOR EACH ROW EXECUTE FUNCTION public.fn_autoenroll_tracks();
CREATE TRIGGER trg_autoenroll_contacts AFTER INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.fn_autoenroll_tracks();

-- Processor: claims due steps, returns them for the worker to dispatch
CREATE OR REPLACE FUNCTION public.claim_due_track_steps(_limit int DEFAULT 25)
RETURNS TABLE (
  run_step_id uuid, run_id uuid, step_id uuid, step_order int,
  template_id uuid, agency_id uuid, entity_type public.track_entity_type, entity_id uuid,
  action_type public.track_action_type, action_config jsonb, context jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT rs.id
    FROM public.track_run_steps rs
    JOIN public.track_runs r ON r.id = rs.run_id
    WHERE rs.status = 'pending' AND rs.scheduled_for <= now() AND r.status = 'running'
    ORDER BY rs.scheduled_for
    FOR UPDATE OF rs SKIP LOCKED
    LIMIT _limit
  ),
  claimed AS (
    UPDATE public.track_run_steps rs
    SET status = 'pending', executed_at = now()
    FROM due WHERE rs.id = due.id
    RETURNING rs.id AS run_step_id, rs.run_id, rs.step_id, rs.step_order
  )
  SELECT c.run_step_id, c.run_id, c.step_id, c.step_order,
         r.template_id, r.agency_id, r.entity_type, r.entity_id,
         s.action_type, s.action_config, r.context
  FROM claimed c
  JOIN public.track_runs r ON r.id = c.run_id
  JOIN public.track_steps s ON s.id = c.step_id;
END;
$$;
