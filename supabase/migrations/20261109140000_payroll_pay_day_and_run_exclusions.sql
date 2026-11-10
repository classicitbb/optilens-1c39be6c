-- Pay day (day of the month an employee is paid by) and per-run employee exclusions.
ALTER TABLE public.employee_compensation
  ADD COLUMN IF NOT EXISTS pay_day smallint CHECK (pay_day BETWEEN 1 AND 31);

-- Employees left out of a run on purpose; recalculating the run keeps them out.
ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS excluded_employee_ids uuid[] NOT NULL DEFAULT '{}';
