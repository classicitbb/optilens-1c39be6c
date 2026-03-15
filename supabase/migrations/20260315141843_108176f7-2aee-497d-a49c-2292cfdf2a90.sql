
-- Fix overly permissive RLS on charge_types
DROP POLICY IF EXISTS "Allow authenticated users to insert charge_types" ON public.charge_types;
DROP POLICY IF EXISTS "Allow authenticated users to update charge_types" ON public.charge_types;
DROP POLICY IF EXISTS "Allow authenticated users to delete charge_types" ON public.charge_types;

CREATE POLICY "Allow edit role to insert charge_types" ON public.charge_types
FOR INSERT TO authenticated WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Allow edit role to update charge_types" ON public.charge_types
FOR UPDATE TO authenticated USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Allow edit role to delete charge_types" ON public.charge_types
FOR DELETE TO authenticated USING (has_edit_role(auth.uid()));

-- Fix overly permissive RLS on shipment_types
DROP POLICY IF EXISTS "Allow authenticated users to insert shipment_types" ON public.shipment_types;
DROP POLICY IF EXISTS "Allow authenticated users to update shipment_types" ON public.shipment_types;
DROP POLICY IF EXISTS "Allow authenticated users to delete shipment_types" ON public.shipment_types;

CREATE POLICY "Allow edit role to insert shipment_types" ON public.shipment_types
FOR INSERT TO authenticated WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Allow edit role to update shipment_types" ON public.shipment_types
FOR UPDATE TO authenticated USING (has_edit_role(auth.uid())) WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Allow edit role to delete shipment_types" ON public.shipment_types
FOR DELETE TO authenticated USING (has_edit_role(auth.uid()));
