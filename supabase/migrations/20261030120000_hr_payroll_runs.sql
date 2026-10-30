-- HR phase 2: monthly payroll runs and payslips.
-- Payslip figures are calculated in the app (src/features/admin/hr/payroll/engine.ts)
-- and stored here as a snapshot. Approved runs are locked.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS rr_levy_exempt boolean NOT NULL DEFAULT false;

CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL UNIQUE CHECK (extract(day FROM period_start) = 1),
  pay_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  base_pay numeric(12,2) NOT NULL,
  annual_allowances numeric(12,2) NOT NULL DEFAULT 0,
  gross numeric(12,2) NOT NULL,
  taxable numeric(12,2) NOT NULL,
  nis numeric(12,2) NOT NULL,
  paye numeric(12,2) NOT NULL,
  rr_levy numeric(12,2) NOT NULL,
  other_deductions numeric(12,2) NOT NULL,
  net numeric(12,2) NOT NULL,
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  splits jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- One-off earnings and deductions for this run only: [{kind, label, amount, taxable}]
  adjustments jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  rules_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, employee_id)
);
CREATE INDEX payslips_employee_idx ON public.payslips(employee_id);

CREATE TRIGGER payroll_runs_updated_at BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER payslips_updated_at BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER payroll_runs_audit AFTER INSERT OR UPDATE OR DELETE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();
CREATE TRIGGER payslips_audit AFTER INSERT OR UPDATE OR DELETE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();

-- ---------------------------------------------------------------------------
-- Locking: a run is edited only while draft. It becomes approved only through
-- approve_payroll_run (which also draws down loans), then may be marked paid.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.payroll_run_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Only draft payroll runs can be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'draft' AND NEW.status = 'approved'
     AND current_setting('hr.approving_payroll', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Approve payroll runs with approve_payroll_run';
  END IF;
  IF OLD.status = 'draft' AND NEW.status = 'paid' THEN
    RAISE EXCEPTION 'Approve the payroll run before marking it paid';
  END IF;
  IF OLD.status = 'approved' AND NOT (NEW.status = 'paid' AND NEW.period_start = OLD.period_start) THEN
    RAISE EXCEPTION 'Approved payroll runs can only be marked paid';
  END IF;
  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION 'Paid payroll runs are locked';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER payroll_runs_guard BEFORE UPDATE OR DELETE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.payroll_run_guard();

CREATE OR REPLACE FUNCTION public.payslip_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.payroll_runs WHERE id = COALESCE(NEW.run_id, OLD.run_id);
  -- A cascade delete from a draft run finds no run row; let it through.
  IF v_status IS NOT NULL AND v_status <> 'draft' THEN
    RAISE EXCEPTION 'Payslips on an approved payroll run are locked';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER payslips_guard BEFORE INSERT OR UPDATE OR DELETE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.payslip_guard();

-- ---------------------------------------------------------------------------
-- RLS: HR manages runs; employees see their own payslips once approved.
-- ---------------------------------------------------------------------------
-- The two employee policies look at each other's table; going through definer
-- functions keeps RLS from recursing between them.
CREATE OR REPLACE FUNCTION public.payroll_run_released(_run_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.payroll_runs WHERE id = _run_id AND status IN ('approved', 'paid'))
$$;

CREATE OR REPLACE FUNCTION public.is_paid_in_run(_run_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.payslips p
    JOIN public.employees e ON e.id = p.employee_id
    WHERE p.run_id = _run_id AND e.user_id = auth.uid()
  )
$$;

ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR manages payroll runs" ON public.payroll_runs FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read runs they were paid in" ON public.payroll_runs FOR SELECT
  USING (status IN ('approved', 'paid') AND public.is_paid_in_run(id));

CREATE POLICY "HR manages payslips" ON public.payslips FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own approved payslips" ON public.payslips FOR SELECT
  USING (public.is_employee_self(employee_id) AND public.payroll_run_released(run_id));

-- ---------------------------------------------------------------------------
-- Approval: lock the run and take each loan repayment off the loan balance.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payroll_run(_run_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.can_hr(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_status FROM public.payroll_runs WHERE id = _run_id FOR UPDATE;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Payroll run not found';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Payroll run is already %', v_status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payslips WHERE run_id = _run_id) THEN
    RAISE EXCEPTION 'Payroll run has no payslips';
  END IF;

  UPDATE public.employee_recurring_items i
  SET loan_balance = GREATEST(i.loan_balance - d.amount, 0),
      active = i.active AND i.loan_balance - d.amount > 0
  FROM (
    SELECT (line->>'recurringItemId')::uuid AS item_id, SUM((line->>'amount')::numeric) AS amount
    FROM public.payslips p, jsonb_array_elements(p.lines) AS line
    WHERE p.run_id = _run_id
      AND line->>'code' = 'deduction'
      AND line ? 'recurringItemId'
    GROUP BY 1
  ) d
  WHERE i.id = d.item_id AND i.loan_balance IS NOT NULL;

  PERFORM set_config('hr.approving_payroll', 'on', true);
  UPDATE public.payroll_runs
  SET status = 'approved', approved_by = auth.uid(), approved_at = now()
  WHERE id = _run_id;
  PERFORM set_config('hr.approving_payroll', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payroll_run(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payroll_run(uuid) TO authenticated;
