
-- Add missing columns to helpdesk_tickets for structured ticketing
ALTER TABLE public.helpdesk_tickets
  ADD COLUMN IF NOT EXISTS source_session_id text,
  ADD COLUMN IF NOT EXISTS source_role_mode text,
  ADD COLUMN IF NOT EXISTS source_route_context text,
  ADD COLUMN IF NOT EXISTS source_authentication_required boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb DEFAULT '{}'::jsonb;

-- Add code column to helpdesk_ticket_types for subtype matching
ALTER TABLE public.helpdesk_ticket_types
  ADD COLUMN IF NOT EXISTS code text;

-- Create review queue table
CREATE TABLE IF NOT EXISTS public.helpdesk_ticket_review_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key text NOT NULL DEFAULT 'default',
  ticket_id uuid NOT NULL REFERENCES public.helpdesk_tickets(id) ON DELETE CASCADE,
  queue_name text NOT NULL,
  source_signal text,
  source_reference text,
  status text NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.helpdesk_ticket_review_queue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage review queue"
  ON public.helpdesk_ticket_review_queue_items FOR ALL
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

-- Allow authenticated users to insert tickets (for portal submissions)
CREATE POLICY "Authenticated users can create tickets"
  ON public.helpdesk_tickets FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to insert ticket events
CREATE POLICY "Authenticated users can create ticket events"
  ON public.helpdesk_ticket_events FOR INSERT
  TO authenticated
  WITH CHECK (true);
