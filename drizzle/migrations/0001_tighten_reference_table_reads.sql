DROP POLICY IF EXISTS "Authenticated read bank_payment_portals" ON public.bank_payment_portals;
CREATE POLICY "Staff and customers read bank_payment_portals" ON public.bank_payment_portals FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()) OR public.has_role(auth.uid(), 'customer'::public.app_role));

DROP POLICY IF EXISTS "Signed-in users read rx surcharge rules" ON public.rx_surcharge_rules;
CREATE POLICY "Staff and customers read rx surcharge rules" ON public.rx_surcharge_rules FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()) OR public.has_role(auth.uid(), 'customer'::public.app_role));

DROP POLICY IF EXISTS "Anon can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Role users can select suppliers" ON public.suppliers;
CREATE POLICY "Staff can select suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));

DROP POLICY IF EXISTS "store_product_overrides_read_anon" ON public.store_product_overrides;
DROP POLICY IF EXISTS "store_product_overrides_read_authenticated" ON public.store_product_overrides;
CREATE POLICY "store_product_overrides_read_published" ON public.store_product_overrides FOR SELECT TO anon, authenticated
  USING (is_published = true);
CREATE POLICY "store_product_overrides_read_staff" ON public.store_product_overrides FOR SELECT TO authenticated
  USING (public.has_staff_role(auth.uid()));