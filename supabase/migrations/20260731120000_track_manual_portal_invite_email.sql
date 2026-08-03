-- Staff frequently invite a customer to the Classic Visions portal by hand — a
-- normal email from their own mailbox — instead of using the built-in invite
-- action. auth.users.invited_at only records Supabase invite emails, so there
-- was no way to see who had already been contacted. Record the manual send on
-- the profile so Website Portals can show it next to the login.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portal_invite_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_invite_email_sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.portal_invite_email_sent_at IS
  'Admin-recorded timestamp for a portal invitation email sent manually. Distinct from auth.users.invited_at, which only covers Supabase invite emails.';

CREATE INDEX IF NOT EXISTS profiles_portal_invite_email_sent_at_idx
  ON public.profiles (portal_invite_email_sent_at DESC);
