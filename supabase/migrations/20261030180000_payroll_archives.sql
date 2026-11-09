-- Payroll archive packs: a locked zip (register, payslips, statutory and bank
-- schedules, manifest) built in the app when a run is approved. Packs are
-- write-once: no updates or deletes, in the table or the storage bucket. A
-- second pack for the same run gets the next version number beside the first.

CREATE TABLE public.payroll_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  storage_path text NOT NULL UNIQUE,
  sha256 text NOT NULL,
  size_bytes integer NOT NULL,
  -- {employees, gross, nis, paye, rr_levy, other_deductions, net}
  totals jsonb NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, version)
);

CREATE OR REPLACE FUNCTION public.payroll_archive_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Payroll archives are permanent';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payroll_runs WHERE id = NEW.run_id AND status IN ('approved', 'paid')) THEN
    RAISE EXCEPTION 'Only approved payroll runs can be archived';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER payroll_archives_guard BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_archives
  FOR EACH ROW EXECUTE FUNCTION public.payroll_archive_guard();
CREATE TRIGGER payroll_archives_audit AFTER INSERT ON public.payroll_archives
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();

ALTER TABLE public.payroll_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR reads payroll archives" ON public.payroll_archives FOR SELECT
  USING (public.can_hr(auth.uid()));
CREATE POLICY "HR adds payroll archives" ON public.payroll_archives FOR INSERT
  WITH CHECK (public.can_hr(auth.uid()));

-- Every download is recorded in audit_log.
CREATE OR REPLACE FUNCTION public.log_payroll_archive_download(_archive_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_hr(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.audit_log (table_name, record_id, action, user_id)
  VALUES ('payroll_archives', _archive_id, 'download', auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.log_payroll_archive_download(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_payroll_archive_download(uuid) TO authenticated;

-- Private bucket, read and add only. No update or delete policy, so a stored pack
-- can't be replaced or removed from the app.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payroll-archives', 'payroll-archives', false, 52428800, ARRAY['application/zip'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "HR reads payroll archive files" ON storage.objects;
CREATE POLICY "HR reads payroll archive files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payroll-archives' AND public.can_hr(auth.uid()));

DROP POLICY IF EXISTS "HR adds payroll archive files" ON storage.objects;
CREATE POLICY "HR adds payroll archive files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payroll-archives' AND public.can_hr(auth.uid()));
