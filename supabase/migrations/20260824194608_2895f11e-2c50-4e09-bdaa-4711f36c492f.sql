DROP POLICY IF EXISTS "Staff can read edge function health runs" ON public.edge_function_health_runs;
CREATE POLICY "Staff can read edge function health runs"
ON public.edge_function_health_runs FOR SELECT TO authenticated
USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "Role users can select lens_lens_options" ON public.lens_lens_options;
CREATE POLICY "Editors can select lens_lens_options"
ON public.lens_lens_options FOR SELECT TO authenticated
USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can read own presence" ON public.user_presence;
CREATE POLICY "Users can read own presence"
ON public.user_presence FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR public.has_staff_role(auth.uid()));