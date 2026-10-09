-- CRM tasks (public.activities) accept photos, documents and audio.
-- Keep the mime list in sync with HELPDESK_ATTACHMENT_MIME_TYPES in src/lib/helpdeskAttachments.ts.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('activity-attachments', 'activity-attachments', false, 10485760, ARRAY[
  'image/png','image/jpeg','image/gif','image/webp',
  'application/pdf','text/plain','text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/webm','audio/ogg'
])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.activity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN (
    'image/png','image/jpeg','image/gif','image/webp',
    'application/pdf','text/plain','text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/webm','audio/ogg'
  )),
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  storage_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_attachments_activity_created_idx ON public.activity_attachments(activity_id, created_at);
ALTER TABLE public.activity_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view activity attachments" ON public.activity_attachments;
CREATE POLICY "Staff view activity attachments" ON public.activity_attachments FOR SELECT TO authenticated USING (public.has_staff_role((select auth.uid())));
DROP POLICY IF EXISTS "Editors add activity attachments" ON public.activity_attachments;
CREATE POLICY "Editors add activity attachments" ON public.activity_attachments FOR INSERT TO authenticated WITH CHECK (uploaded_by_user_id = (select auth.uid()) AND public.has_edit_role((select auth.uid())));
DROP POLICY IF EXISTS "Editors remove activity attachments" ON public.activity_attachments;
CREATE POLICY "Editors remove activity attachments" ON public.activity_attachments FOR DELETE TO authenticated USING (public.has_edit_role((select auth.uid())));

DROP POLICY IF EXISTS "Activity attachment upload" ON storage.objects;
CREATE POLICY "Activity attachment upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'activity-attachments' AND (storage.foldername(name))[2] = (select auth.uid()::text) AND public.has_edit_role((select auth.uid())));
DROP POLICY IF EXISTS "Activity attachment read" ON storage.objects;
CREATE POLICY "Activity attachment read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'activity-attachments' AND public.has_staff_role((select auth.uid())));
DROP POLICY IF EXISTS "Activity attachment remove" ON storage.objects;
CREATE POLICY "Activity attachment remove" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'activity-attachments' AND public.has_edit_role((select auth.uid())));

NOTIFY pgrst, 'reload schema';
