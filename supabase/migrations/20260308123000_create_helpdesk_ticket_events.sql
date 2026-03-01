-- Helpdesk timeline events for stage transitions, assignment changes, and audit trail.

CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS helpdesk_ticket_events_ticket_id_created_at_idx
  ON public.helpdesk_ticket_events(ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS helpdesk_ticket_events_event_type_idx
  ON public.helpdesk_ticket_events(event_type);
