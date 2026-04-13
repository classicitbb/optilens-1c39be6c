
-- Create the video bucket if it doesn't exist, set it to public
INSERT INTO storage.buckets (id, name, public)
VALUES ('video', 'video', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to all files in the video bucket
CREATE POLICY "Video files are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'video');

-- Allow authenticated staff to upload videos
CREATE POLICY "Staff can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'video' AND public.has_edit_role(auth.uid()));

-- Allow authenticated staff to update videos
CREATE POLICY "Staff can update videos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'video' AND public.has_edit_role(auth.uid()));

-- Allow authenticated staff to delete videos
CREATE POLICY "Staff can delete videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'video' AND public.has_edit_role(auth.uid()));
