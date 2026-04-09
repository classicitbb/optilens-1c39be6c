DROP POLICY IF EXISTS "Role users can select audit_log" ON public.audit_log;

CREATE POLICY "Admins can select audit_log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
