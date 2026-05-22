-- Tighten CRM RLS so customer portal identities cannot read internal CRM data.
-- Also provide a staff-only role helper for read policies.

CREATE OR REPLACE FUNCTION public.has_staff_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'operator', 'viewer')
  )
$$;

-- Remove bootstrap-era allow-all policies plus broad role-wide read policies.
DROP POLICY IF EXISTS opportunities_select_auth ON public.opportunities;
DROP POLICY IF EXISTS opportunities_write_auth ON public.opportunities;
DROP POLICY IF EXISTS activities_select_auth ON public.activities;
DROP POLICY IF EXISTS activities_write_auth ON public.activities;
DROP POLICY IF EXISTS notes_select_auth ON public.notes;
DROP POLICY IF EXISTS notes_write_auth ON public.notes;
DROP POLICY IF EXISTS lead_audits_select_auth ON public.lead_audits;
DROP POLICY IF EXISTS lead_audits_write_auth ON public.lead_audits;

DROP POLICY IF EXISTS "Role users can select contacts" ON public.contacts;
DROP POLICY IF EXISTS "Role users can select opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Role users can select activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can view notes" ON public.notes;
DROP POLICY IF EXISTS "Authenticated users can view lead_audits" ON public.lead_audits;

CREATE POLICY "Staff can view contacts"
  ON public.contacts
  FOR SELECT
  TO authenticated
  USING (public.has_staff_role(auth.uid()));

CREATE POLICY "Staff can view opportunities"
  ON public.opportunities
  FOR SELECT
  TO authenticated
  USING (public.has_staff_role(auth.uid()));

CREATE POLICY "Staff can view activities"
  ON public.activities
  FOR SELECT
  TO authenticated
  USING (public.has_staff_role(auth.uid()));

CREATE POLICY "Staff can view notes"
  ON public.notes
  FOR SELECT
  TO authenticated
  USING (public.has_staff_role(auth.uid()));

CREATE POLICY "Staff can view lead_audits"
  ON public.lead_audits
  FOR SELECT
  TO authenticated
  USING (public.has_staff_role(auth.uid()));

NOTIFY pgrst, 'reload schema';
