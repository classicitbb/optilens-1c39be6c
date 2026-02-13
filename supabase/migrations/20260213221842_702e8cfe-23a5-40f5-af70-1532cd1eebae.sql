
-- Drop existing editor SELECT policy
DROP POLICY IF EXISTS "Editors can select company_settings" ON public.company_settings;

-- Restrict SELECT to admins only
CREATE POLICY "Admins can select company_settings"
ON public.company_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also restrict UPDATE to admins only
DROP POLICY IF EXISTS "Editors can update company_settings" ON public.company_settings;

CREATE POLICY "Admins can update company_settings"
ON public.company_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
