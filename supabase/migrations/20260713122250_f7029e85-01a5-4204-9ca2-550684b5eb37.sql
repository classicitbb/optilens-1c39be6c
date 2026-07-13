
-- 1. Remove broad public row-level SELECT on cost-bearing tables; public access goes through *_public views
DROP POLICY IF EXISTS "Public can view website lenses" ON public.lenses;
DROP POLICY IF EXISTS "Public can view website addons" ON public.addons;
DROP POLICY IF EXISTS "Public can view website supplies" ON public.supplies;

-- Revoke direct SELECT grants on base tables from anon/authenticated (staff use has_edit_role policy)
REVOKE SELECT ON public.lenses FROM anon, authenticated;
REVOKE SELECT ON public.addons FROM anon, authenticated;
REVOKE SELECT ON public.supplies FROM anon, authenticated;

-- Ensure the safe views remain readable
GRANT SELECT ON public.lenses_public TO anon, authenticated;
GRANT SELECT ON public.addons_public TO anon, authenticated;
GRANT SELECT ON public.supplies_public TO anon, authenticated;

-- 2. Fix SECURITY DEFINER view
ALTER VIEW public.customer_account_number_duplicates SET (security_invoker = true);

-- 3. Restrict internal-visibility help articles to staff
DROP POLICY IF EXISTS "Role users can select help_articles" ON public.help_articles;

CREATE POLICY "Role users can select help_articles"
ON public.help_articles
FOR SELECT
TO authenticated
USING (
  (visibility <> 'internal' AND public.has_any_role(auth.uid()))
  OR public.has_staff_role(auth.uid())
);
