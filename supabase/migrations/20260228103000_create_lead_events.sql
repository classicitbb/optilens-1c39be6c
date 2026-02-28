CREATE TABLE IF NOT EXISTS public.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('search_executed', 'result_rendered', 'saved_to_crm', 'sequence_started')),
  contact_id uuid NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id uuid NULL REFERENCES public.opportunities(id) ON DELETE SET NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  provider_diagnostics_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_events_event_type_idx ON public.lead_events(event_type);
CREATE INDEX IF NOT EXISTS lead_events_created_at_idx ON public.lead_events(created_at DESC);
CREATE INDEX IF NOT EXISTS lead_events_contact_id_idx ON public.lead_events(contact_id);
CREATE INDEX IF NOT EXISTS lead_events_opportunity_id_idx ON public.lead_events(opportunity_id);

ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select lead events"
  ON public.lead_events FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert lead events"
  ON public.lead_events FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()) AND user_id = auth.uid());
