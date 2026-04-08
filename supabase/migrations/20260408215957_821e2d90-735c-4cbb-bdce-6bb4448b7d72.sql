
-- Enable RLS on helpdesk_followup_queue
ALTER TABLE public.helpdesk_followup_queue ENABLE ROW LEVEL SECURITY;

-- Staff (admin/operator) can read all follow-up queue items
CREATE POLICY "Staff can view followup queue"
  ON public.helpdesk_followup_queue
  FOR SELECT
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- Staff can insert followup queue items
CREATE POLICY "Staff can insert followup queue"
  ON public.helpdesk_followup_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

-- Staff can update followup queue items
CREATE POLICY "Staff can update followup queue"
  ON public.helpdesk_followup_queue
  FOR UPDATE
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- Staff can delete followup queue items
CREATE POLICY "Staff can delete followup queue"
  ON public.helpdesk_followup_queue
  FOR DELETE
  TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- Service role (edge functions) bypasses RLS automatically
