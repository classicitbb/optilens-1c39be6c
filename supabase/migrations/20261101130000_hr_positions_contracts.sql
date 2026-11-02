-- HR positions, position assignments, job descriptions and employment contracts.
--
-- A position is a seat in the company (title, department, who it reports to). People hold
-- one or more positions, so someone who works in two departments, or answers to two
-- managers, simply holds two positions. employees.job_title / department / manager_id stay
-- as the single-line summary that payroll and the People list already use.

CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text NOT NULL,
  reports_to_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL
    CHECK (reports_to_position_id IS DISTINCT FROM id),
  headcount integer NOT NULL DEFAULT 1 CHECK (headcount >= 1),
  active boolean NOT NULL DEFAULT true,
  job_description text,
  job_description_path text,
  job_description_file_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX positions_reports_to_idx ON public.positions(reports_to_position_id);

CREATE TABLE public.employee_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  allocation_percent numeric(5,2) CHECK (allocation_percent IS NULL OR (allocation_percent > 0 AND allocation_percent <= 100)),
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, position_id),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX employee_positions_position_idx ON public.employee_positions(position_id);
CREATE UNIQUE INDEX employee_positions_one_primary_idx ON public.employee_positions(employee_id) WHERE is_primary;

CREATE TABLE public.employee_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  contract_type text NOT NULL DEFAULT 'permanent'
    CHECK (contract_type IN ('permanent', 'fixed_term', 'probation', 'casual', 'addendum', 'other')),
  title text NOT NULL,
  start_date date,
  end_date date,
  signed_date date,
  file_path text NOT NULL,
  file_name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX employee_contracts_employee_idx ON public.employee_contracts(employee_id, start_date DESC);

CREATE TRIGGER positions_updated_at BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER employee_contracts_updated_at BEFORE UPDATE ON public.employee_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR manages positions" ON public.positions FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "HR manages position assignments" ON public.employee_positions FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "HR manages contracts" ON public.employee_contracts FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));

-- Private bucket for contracts and job description files, HR only.
-- Paths: contracts/<employee_id>/<file>, job-descriptions/<position_id>/<file>.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-documents', 'hr-documents', false, 20971520,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 20971520,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "HR reads hr documents" ON storage.objects;
CREATE POLICY "HR reads hr documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hr-documents' AND public.can_hr(auth.uid()));
DROP POLICY IF EXISTS "HR adds hr documents" ON storage.objects;
CREATE POLICY "HR adds hr documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hr-documents' AND public.can_hr(auth.uid()));
DROP POLICY IF EXISTS "HR removes hr documents" ON storage.objects;
CREATE POLICY "HR removes hr documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hr-documents' AND public.can_hr(auth.uid()));
