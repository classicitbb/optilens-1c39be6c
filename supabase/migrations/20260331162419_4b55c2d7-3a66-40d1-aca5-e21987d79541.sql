
-- Add RLS policies for the 'docs' storage bucket
-- Only editors (admin/operator) can read, upload, update, and delete docs

CREATE POLICY "Editors can read from docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'docs'
  AND public.has_edit_role(auth.uid())
);

CREATE POLICY "Editors can upload to docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'docs'
  AND public.has_edit_role(auth.uid())
);

CREATE POLICY "Editors can update docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'docs'
  AND public.has_edit_role(auth.uid())
)
WITH CHECK (
  bucket_id = 'docs'
  AND public.has_edit_role(auth.uid())
);

CREATE POLICY "Editors can delete from docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'docs'
  AND public.has_edit_role(auth.uid())
);
