-- Email Previews: resend from the delivery log.
--
-- email_send_log only records the outcome of each send, not the message, so a
-- failed or "never arrived" email cannot be sent again. sendManagedEmail now
-- keeps the rendered message here (keyed by the same message_id as the log) so
-- an admin can resend it, optionally to a corrected address. Emails with
-- attachments are not stored and cannot be resent from the log.
--
-- Service-role only: RLS is on with no policies, so the browser never reads
-- message bodies directly. docstudio-api (admin / edit role) is the only reader.
-- Apply via the Lovable SQL editor.

CREATE TABLE IF NOT EXISTS public.email_resend_payloads (
  message_id text PRIMARY KEY,
  recipient_email text NOT NULL,
  from_address text,
  reply_to text,
  subject text NOT NULL,
  html text NOT NULL,
  text_body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_resend_payloads_created_idx ON public.email_resend_payloads (created_at);
ALTER TABLE public.email_resend_payloads ENABLE ROW LEVEL SECURITY;
