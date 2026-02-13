
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Role users can select company_settings" ON public.company_settings;

-- Create a restrictive SELECT policy for admin/operator only
CREATE POLICY "Editors can select company_settings"
  ON public.company_settings FOR SELECT
  USING (has_edit_role(auth.uid()));
