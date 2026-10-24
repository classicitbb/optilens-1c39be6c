-- Support requests accept photos, documents and audio, not just images.
-- Keep in sync with HELPDESK_ATTACHMENT_MIME_TYPES in src/lib/helpdeskAttachments.ts.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png','image/jpeg','image/gif','image/webp',
  'application/pdf','text/plain','text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/webm','audio/ogg'
]
WHERE id = 'helpdesk-attachments';

ALTER TABLE public.helpdesk_ticket_attachments DROP CONSTRAINT IF EXISTS helpdesk_ticket_attachments_mime_type_check;
ALTER TABLE public.helpdesk_ticket_attachments ADD CONSTRAINT helpdesk_ticket_attachments_mime_type_check CHECK (mime_type IN (
  'image/png','image/jpeg','image/gif','image/webp',
  'application/pdf','text/plain','text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/webm','audio/ogg'
));

NOTIFY pgrst, 'reload schema';
