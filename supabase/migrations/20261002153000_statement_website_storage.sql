-- Replace the retired OneDrive delivery dependency with private Supabase
-- Storage managed by the website. Customer and staff downloads remain behind
-- Edge Function authentication; the bucket is never public.

INSERT INTO storage.buckets (id, name, public)
VALUES ('statement-pdfs', 'statement-pdfs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

ALTER TABLE public.statement_document_jobs
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'statement-pdfs',
  ADD COLUMN IF NOT EXISTS storage_path text;

UPDATE public.statement_document_jobs
SET storage_bucket = 'statement-pdfs'
WHERE storage_bucket IS NULL;

DROP INDEX IF EXISTS public.statement_document_jobs_drive_idx;
CREATE INDEX IF NOT EXISTS statement_document_jobs_storage_idx
  ON public.statement_document_jobs (storage_bucket, storage_path)
  WHERE storage_path IS NOT NULL;

ALTER TABLE public.statement_document_jobs
  DROP COLUMN IF EXISTS one_drive_drive_id,
  DROP COLUMN IF EXISTS one_drive_item_id,
  DROP COLUMN IF EXISTS one_drive_path,
  DROP COLUMN IF EXISTS one_drive_url;

COMMENT ON TABLE public.statement_document_jobs IS
  'Idempotent website PDF, staff approval, and canonical email lifecycle for newly discovered Innovations statements.';
