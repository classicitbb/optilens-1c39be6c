-- Rx capture, one pipeline (plan Phase 4a): a photo, scan or pasted image of a
-- prescription / order sheet is uploaded, read by the rx-capture-extract edge
-- function, and becomes a draft Rx order that staff review in the form.
--
-- Staff only. Customers get nothing here until the customer "Fill from photo"
-- step (4d) exists; that will add account-scoped policies of its own.
--
--   rx_capture_jobs   one row per uploaded file
--   rx-captures       private bucket holding the originals (signed URLs only)
--
-- Retention: originals are kept 24 months (decision 2026-10-01, covers remake
-- disputes). `purge_after` stamps each row; the scheduled purge that acts on it
-- is not part of this migration.

CREATE TABLE IF NOT EXISTS public.rx_capture_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    integer REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by    uuid NOT NULL DEFAULT auth.uid(),
  storage_path  text NOT NULL,
  file_name     text,
  mime_type     text NOT NULL,
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed')),
  error         text,
  -- what the model returned, untouched, and the cv.rxorder/1 draft built from it
  extraction    jsonb,
  draft         jsonb,
  model         text,
  -- the quote the reviewed draft became, once staff open and save it
  quote_id      uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  purge_after   timestamptz NOT NULL DEFAULT (now() + interval '24 months')
);

CREATE INDEX IF NOT EXISTS rx_capture_jobs_created_idx ON public.rx_capture_jobs (created_at DESC);

ALTER TABLE public.rx_capture_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage rx capture jobs" ON public.rx_capture_jobs;
CREATE POLICY "Staff manage rx capture jobs"
  ON public.rx_capture_jobs FOR ALL TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()) AND created_by = auth.uid());

-- ── originals ───────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rx-captures', 'rx-captures', false, 12582912,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 12582912,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Staff read rx captures" ON storage.objects;
CREATE POLICY "Staff read rx captures" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rx-captures' AND public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Staff upload rx captures" ON storage.objects;
CREATE POLICY "Staff upload rx captures" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rx-captures' AND public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Staff delete rx captures" ON storage.objects;
CREATE POLICY "Staff delete rx captures" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rx-captures' AND public.has_edit_role(auth.uid()));
