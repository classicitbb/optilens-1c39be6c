-- Durable lifecycle for statement PDFs generated from newly discovered
-- Innovations statements. This migration is intentionally supplied for
-- manual Lovable execution; it is not applied by local verification.

CREATE TABLE IF NOT EXISTS public.statement_document_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  innovations_statement_id bigint NOT NULL UNIQUE,
  statement_id bigint REFERENCES public.statements(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'uploaded', 'failed', 'skipped')),
  skip_reason text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 8,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  pdf_template_version text NOT NULL DEFAULT 'statement-print-v1',
  pdf_filename text,
  pdf_bytes integer,
  one_drive_drive_id text,
  one_drive_item_id text,
  one_drive_path text,
  one_drive_url text,
  upload_status text NOT NULL DEFAULT 'pending',
  email_status text NOT NULL DEFAULT 'not_sent'
    CHECK (email_status IN ('not_sent', 'queued', 'sent', 'suppressed', 'failed')),
  email_message_id text,
  error_message text,
  error_details jsonb,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  uploaded_at timestamptz,
  emailed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS statement_document_jobs_claim_idx
  ON public.statement_document_jobs (status, next_retry_at, discovered_at);
CREATE INDEX IF NOT EXISTS statement_document_jobs_drive_idx
  ON public.statement_document_jobs (one_drive_item_id)
  WHERE one_drive_item_id IS NOT NULL;

ALTER TABLE public.statement_document_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage statement document jobs" ON public.statement_document_jobs;
CREATE POLICY "Admins manage statement document jobs"
  ON public.statement_document_jobs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_statement_document_jobs_updated_at ON public.statement_document_jobs;
CREATE TRIGGER update_statement_document_jobs_updated_at
  BEFORE UPDATE ON public.statement_document_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Activation baseline: existing statements must never be backfilled.
INSERT INTO public.statement_document_jobs (
  innovations_statement_id, statement_id, idempotency_key, status, skip_reason,
  upload_status, email_status, completed_at
)
SELECT
  s.innovations_statement_id,
  s.id,
  'innovations-statement:' || s.innovations_statement_id,
  'skipped',
  'activation_baseline',
  'skipped',
  'suppressed',
  now()
FROM public.statements s
WHERE NOT EXISTS (
  SELECT 1 FROM public.statement_document_jobs j
  WHERE j.innovations_statement_id = s.innovations_statement_id
);

COMMENT ON TABLE public.statement_document_jobs IS
  'Idempotent PDF, OneDrive upload, and canonical email lifecycle for newly discovered Innovations statements.';
