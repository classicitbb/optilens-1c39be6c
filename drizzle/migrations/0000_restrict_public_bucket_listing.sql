DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Video files are publicly accessible" ON storage.objects;
CREATE POLICY "Staff can list product images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND public.has_staff_role(auth.uid()));
CREATE POLICY "Staff can list videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'video' AND public.has_staff_role(auth.uid()));