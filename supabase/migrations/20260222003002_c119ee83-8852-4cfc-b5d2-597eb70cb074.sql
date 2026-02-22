-- Add INSERT and UPDATE policies for data-files storage bucket
CREATE POLICY "Authenticated users can upload to data-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'data-files');

CREATE POLICY "Authenticated users can update data-files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'data-files');

CREATE POLICY "Authenticated users can delete from data-files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'data-files');
