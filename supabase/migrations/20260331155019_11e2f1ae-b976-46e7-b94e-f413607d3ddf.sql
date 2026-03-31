
-- Fix store_product_overrides: restrict write to staff, read to authenticated
DROP POLICY IF EXISTS "store_product_overrides_write_authenticated" ON public.store_product_overrides;
DROP POLICY IF EXISTS "store_product_overrides_read_authenticated" ON public.store_product_overrides;

-- Read: any authenticated user can view overrides
CREATE POLICY "store_product_overrides_read_authenticated"
ON public.store_product_overrides
FOR SELECT
TO authenticated
USING (true);

-- Write: only admin/operator can modify overrides
CREATE POLICY "store_product_overrides_write_staff"
ON public.store_product_overrides
FOR ALL
TO authenticated
USING (public.has_edit_role(auth.uid()))
WITH CHECK (public.has_edit_role(auth.uid()));
