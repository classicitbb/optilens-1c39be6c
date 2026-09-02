DROP POLICY IF EXISTS "Role users can select docstudio billing sequences" ON public.docstudio_billing_sequences;
CREATE POLICY "Staff can select docstudio billing sequences"
ON public.docstudio_billing_sequences FOR SELECT TO authenticated
USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select innovations_lens_aliases" ON public.innovations_lens_aliases;
CREATE POLICY "Staff can select innovations_lens_aliases"
ON public.innovations_lens_aliases FOR SELECT TO authenticated
USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view price_catalog" ON public.price_catalog;
CREATE POLICY "Staff can view price_catalog"
ON public.price_catalog FOR SELECT TO authenticated
USING (public.has_staff_role(auth.uid()));
CREATE POLICY "Customers can view published price_catalog"
ON public.price_catalog FOR SELECT TO authenticated
USING (web_enabled = true AND NOT public.has_staff_role(auth.uid()) AND public.has_any_role(auth.uid()));