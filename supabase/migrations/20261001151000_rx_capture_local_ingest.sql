-- Rx capture, Phase 4c: orders captured and reviewed at the office (optilens-local
-- RX Capture) arrive through innovations-sync `_rx_captures/ingest` and land in the
-- same rx_capture_jobs queue as staff captures made on the website.
--
--   · source          where the capture came from
--   · local_order_id  the office-side order id; unique, so a retried send is harmless
--   · extra_paths     further images of the same order (the office takes up to two)
--   · created_by / storage_path / mime_type become optional: an office order is
--     created by the service key and may arrive without an image.

ALTER TABLE public.rx_capture_jobs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'local_capture')),
  ADD COLUMN IF NOT EXISTS local_order_id text,
  ADD COLUMN IF NOT EXISTS extra_paths jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.rx_capture_jobs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.rx_capture_jobs ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE public.rx_capture_jobs ALTER COLUMN mime_type DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rx_capture_jobs_local_order_uidx
  ON public.rx_capture_jobs (local_order_id) WHERE local_order_id IS NOT NULL;
