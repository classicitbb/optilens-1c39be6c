-- Fix 1: Drop overly permissive write policies on charge_types (read policy is fine)
DROP POLICY IF EXISTS "Authenticated users can insert charge_types" ON public.charge_types;
DROP POLICY IF EXISTS "Authenticated users can update charge_types" ON public.charge_types;
DROP POLICY IF EXISTS "Authenticated users can delete charge_types" ON public.charge_types;

-- Fix 2: Drop overly permissive write policies on shipment_types (read policy is fine)
DROP POLICY IF EXISTS "Authenticated users can insert shipment_types" ON public.shipment_types;
DROP POLICY IF EXISTS "Authenticated users can update shipment_types" ON public.shipment_types;
DROP POLICY IF EXISTS "Authenticated users can delete shipment_types" ON public.shipment_types;

-- Fix 3: Add explicit write/update/delete policies for zenvue-branding bucket
CREATE POLICY "Editors can upload to zenvue-branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'zenvue-branding' AND has_edit_role(auth.uid()));

CREATE POLICY "Editors can update zenvue-branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'zenvue-branding' AND has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete from zenvue-branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'zenvue-branding' AND has_edit_role(auth.uid()));

-- Fix 4: Add explicit write/update/delete policies for catalog-assets bucket
CREATE POLICY "Editors can upload to catalog-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalog-assets' AND has_edit_role(auth.uid()));

CREATE POLICY "Editors can update catalog-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'catalog-assets' AND has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete from catalog-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'catalog-assets' AND has_edit_role(auth.uid()));