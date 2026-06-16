
CREATE TABLE public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  subject text NOT NULL,
  tenancy_id uuid REFERENCES public.tenancies(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  work_order_id uuid REFERENCES public.work_orders(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_threads TO authenticated;
GRANT ALL ON public.message_threads TO service_role;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.thread_participants (
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_participants TO authenticated;
GRANT ALL ON public.thread_participants TO service_role;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: is user a participant?
CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.thread_participants WHERE thread_id=_thread AND user_id=_user)
$$;

-- Threads policies
CREATE POLICY "participants read threads" ON public.message_threads FOR SELECT TO authenticated
  USING (public.is_thread_participant(id, auth.uid())
         OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id, auth.uid())));
CREATE POLICY "users create threads" ON public.message_threads FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "creator updates threads" ON public.message_threads FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- Participants policies
CREATE POLICY "read own participation" ON public.thread_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_thread_participant(thread_id, auth.uid()));
CREATE POLICY "add participants" ON public.thread_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS(SELECT 1 FROM public.message_threads t WHERE t.id=thread_id AND t.created_by=auth.uid())
  );
CREATE POLICY "remove participants" ON public.thread_participants FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS(SELECT 1 FROM public.message_threads t WHERE t.id=thread_id AND t.created_by=auth.uid())
  );

-- Messages policies
CREATE POLICY "participants read messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_thread_participant(thread_id, auth.uid())
         OR EXISTS(SELECT 1 FROM public.message_threads t WHERE t.id=thread_id AND t.agency_id IS NOT NULL AND public.is_agency_member(t.agency_id, auth.uid())));
CREATE POLICY "participants send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND (
    public.is_thread_participant(thread_id, auth.uid())
    OR EXISTS(SELECT 1 FROM public.message_threads t WHERE t.id=thread_id AND t.agency_id IS NOT NULL AND public.is_agency_member(t.agency_id, auth.uid()))
  ));

-- Auto-add creator as participant + bump last_message_at
CREATE OR REPLACE FUNCTION public.fn_thread_add_creator() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.thread_participants(thread_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_thread_add_creator AFTER INSERT ON public.message_threads
FOR EACH ROW EXECUTE FUNCTION public.fn_thread_add_creator();

CREATE OR REPLACE FUNCTION public.fn_message_bump_thread() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.message_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_message_bump_thread AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.fn_message_bump_thread();

-- Rent invoices for Stripe (provider-agnostic; populated when payment created)
CREATE TABLE public.rent_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_schedule_id uuid NOT NULL REFERENCES public.rent_schedule(id) ON DELETE CASCADE,
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  provider text,
  provider_session_id text,
  provider_payment_intent text,
  checkout_url text,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rent_invoices TO authenticated;
GRANT ALL ON public.rent_invoices TO service_role;
ALTER TABLE public.rent_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency reads invoices" ON public.rent_invoices FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenancies t WHERE t.id=tenancy_id AND public.is_agency_member(t.agency_id, auth.uid())));
CREATE POLICY "tenant reads own invoices" ON public.rent_invoices FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenancies t WHERE t.id=tenancy_id AND t.tenant_user_id=auth.uid()));
CREATE POLICY "agency writes invoices" ON public.rent_invoices FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.tenancies t WHERE t.id=tenancy_id AND public.is_agency_member(t.agency_id, auth.uid())))
  WITH CHECK (EXISTS(SELECT 1 FROM public.tenancies t WHERE t.id=tenancy_id AND public.is_agency_member(t.agency_id, auth.uid())));

CREATE TRIGGER trg_rent_invoices_updated BEFORE UPDATE ON public.rent_invoices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
