DROP POLICY IF EXISTS "Signed-in users read leave policy" ON public.leave_policy;
DROP POLICY IF EXISTS "Signed-in users read leave types" ON public.leave_types;
CREATE POLICY "Staff and employees read leave policy" ON public.leave_policy FOR SELECT TO authenticated
USING (public.has_staff_role(auth.uid()) OR public.has_role(auth.uid(), 'office_admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role) OR EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = auth.uid()));
CREATE POLICY "Staff and employees read leave types" ON public.leave_types FOR SELECT TO authenticated
USING (public.has_staff_role(auth.uid()) OR public.has_role(auth.uid(), 'office_admin'::public.app_role) OR public.has_role(auth.uid(), 'accountant'::public.app_role) OR EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = auth.uid()));