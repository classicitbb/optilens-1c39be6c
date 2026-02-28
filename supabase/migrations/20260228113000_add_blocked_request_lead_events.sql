ALTER TABLE public.lead_events
  DROP CONSTRAINT IF EXISTS lead_events_event_type_check;

ALTER TABLE public.lead_events
  ADD CONSTRAINT lead_events_event_type_check
  CHECK (event_type IN ('search_executed', 'result_rendered', 'saved_to_crm', 'sequence_started', 'blocked_request'));
