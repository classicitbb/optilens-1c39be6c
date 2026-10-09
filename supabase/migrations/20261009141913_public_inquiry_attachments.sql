-- Public inquiries have no authenticated uploader. Only the server can insert
-- these rows: the existing participant INSERT policy still requires auth.uid().
-- Private bucket and ticket-scoped read policies remain unchanged.
ALTER TABLE public.helpdesk_ticket_attachments
  ALTER COLUMN uploaded_by_user_id DROP NOT NULL;
