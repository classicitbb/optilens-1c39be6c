-- Allow operators (not just admins) to read all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

CREATE POLICY "Staff can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.has_edit_role(auth.uid()));