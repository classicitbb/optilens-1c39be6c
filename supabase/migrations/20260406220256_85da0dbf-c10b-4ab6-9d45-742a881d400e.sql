-- Enable RLS on helpdesk_ticket_messages
ALTER TABLE public.helpdesk_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Staff can do everything
CREATE POLICY "Staff can manage all ticket messages"
  ON public.helpdesk_ticket_messages
  FOR ALL
  USING (has_edit_role(auth.uid()))
  WITH CHECK (has_edit_role(auth.uid()));

-- Ticket owners and partner contacts can read messages on their tickets
CREATE POLICY "Ticket participants can read messages"
  ON public.helpdesk_ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.helpdesk_tickets t
      WHERE t.id = helpdesk_ticket_messages.ticket_id
        AND (
          t.owner_user_id = auth.uid()
          OR t.partner_contact_id IN (
            SELECT p.crm_contact_id FROM public.profiles p
            WHERE p.user_id = auth.uid() AND p.crm_contact_id IS NOT NULL
          )
        )
    )
  );

-- Ticket owners can insert messages on their tickets
CREATE POLICY "Ticket owners can create messages"
  ON public.helpdesk_ticket_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.helpdesk_tickets t
      WHERE t.id = helpdesk_ticket_messages.ticket_id
        AND t.owner_user_id = auth.uid()
    )
  );
