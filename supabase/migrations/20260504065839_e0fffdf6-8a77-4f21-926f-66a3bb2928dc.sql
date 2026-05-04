
CREATE TABLE IF NOT EXISTS public.helpdesk_inbound_email_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL,
  mailbox TEXT NOT NULL DEFAULT 'INBOX',
  from_address TEXT,
  subject TEXT,
  ticket_id UUID REFERENCES public.helpdesk_tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, mailbox)
);

ALTER TABLE public.helpdesk_inbound_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and operators can view inbound email log"
  ON public.helpdesk_inbound_email_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operator'));
