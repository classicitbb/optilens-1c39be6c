
-- Fix: helpdesk_ticket_events INSERT - restrict to users with edit role or ticket owner
DROP POLICY IF EXISTS "Authenticated users can create ticket events" ON public.helpdesk_ticket_events;
CREATE POLICY "Authenticated users can create ticket events"
ON public.helpdesk_ticket_events FOR INSERT
TO authenticated
WITH CHECK (
  has_edit_role(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.helpdesk_tickets t
    WHERE t.id = ticket_id AND t.owner_user_id = auth.uid()
  )
);

-- Fix: helpdesk_tickets INSERT - users can create tickets they own or admins/operators can create any
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.helpdesk_tickets;
CREATE POLICY "Authenticated users can create tickets"
ON public.helpdesk_tickets FOR INSERT
TO authenticated
WITH CHECK (
  has_edit_role(auth.uid())
  OR owner_user_id = auth.uid()
  OR owner_user_id IS NULL
);

-- Fix: public_inquiries INSERT - keep public access but require non-empty inquiry_type
DROP POLICY IF EXISTS "Anyone can submit inquiries" ON public.public_inquiries;
CREATE POLICY "Anyone can submit inquiries"
ON public.public_inquiries FOR INSERT
TO anon, authenticated
WITH CHECK (
  inquiry_type IS NOT NULL AND inquiry_type <> ''
);
