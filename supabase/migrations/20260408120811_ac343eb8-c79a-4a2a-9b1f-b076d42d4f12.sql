
-- Enable RLS on helpdesk_ticket_watchers
ALTER TABLE public.helpdesk_ticket_watchers ENABLE ROW LEVEL SECURITY;

-- Staff with edit roles can read all watchers
CREATE POLICY "Staff can view ticket watchers"
  ON public.helpdesk_ticket_watchers
  FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- Staff with edit roles can add watchers
CREATE POLICY "Staff can add ticket watchers"
  ON public.helpdesk_ticket_watchers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

-- Staff with edit roles can update watchers
CREATE POLICY "Staff can update ticket watchers"
  ON public.helpdesk_ticket_watchers
  FOR UPDATE
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- Staff with edit roles can remove watchers
CREATE POLICY "Staff can delete ticket watchers"
  ON public.helpdesk_ticket_watchers
  FOR DELETE
  TO authenticated
  USING (public.has_edit_role(auth.uid()));
