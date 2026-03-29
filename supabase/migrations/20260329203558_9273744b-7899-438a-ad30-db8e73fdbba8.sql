
-- Fix: Restrict product-images write to editors/admins only
DROP POLICY IF EXISTS "product_images_auth_write" ON storage.objects;

CREATE POLICY "product_images_editor_write" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.has_edit_role(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.has_edit_role(auth.uid())
  );
