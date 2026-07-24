-- CRM Activities were failing to create for everyone. Root cause: the live
-- `activities` table had drifted from this migrations folder (via Lovable
-- Cloud auto-migrations) to require a NOT NULL `contact_id` and a NOT NULL
-- `type` (channel) column, while every insert call site in the app still
-- used the old phase2 shape (`payload` jsonb column that no longer exists,
-- no `type` value ever supplied). Every insert therefore failed at the
-- database level, surfaced to users as "Unable to create activity".
--
-- This migration:
-- 1) Makes contact_id optional again so activities can be general,
--    company-wide to-dos that aren't tied to a specific contact/customer.
-- 2) Defaults `type` to 'note' as a safety net (still constrained by
--    activities_type_check to whatsapp/email/call/note/meeting/quote).
-- 3) Adds a SECURITY DEFINER lookup so the CRM UI can show "created by
--    <name>" for any staff member without loosening the profiles table's
--    RLS (profiles also holds customer PII, so we don't want to widen that).

ALTER TABLE public.activities ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE public.activities ALTER COLUMN type SET DEFAULT 'note';

-- The "Complete" button's update (status + completed_at) was also failing:
-- completed_at doesn't exist on the live table either.
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.list_staff_names()
RETURNS TABLE(user_id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, COALESCE(NULLIF(p.display_name, ''), NULLIF(p.full_name, ''), p.email, 'Staff member')
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role IN ('admin', 'operator', 'viewer')
$$;

GRANT EXECUTE ON FUNCTION public.list_staff_names() TO authenticated;

NOTIFY pgrst, 'reload schema';
