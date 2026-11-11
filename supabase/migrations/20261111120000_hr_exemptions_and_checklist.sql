-- NIS / PAYE exemptions on the employee record, and the People "to complete" checklist.
-- Apply via the Lovable SQL editor / MCP query_database.

-- An employee is exempt when a reason is set; payroll then deducts nothing for that statutory line.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS nis_exempt_reason text CHECK (nis_exempt_reason IN ('partner', 'retirement_age')),
  ADD COLUMN IF NOT EXISTS paye_exempt_reason text CHECK (paye_exempt_reason IN ('partner', 'retirement_age'));

-- Items the operator has put aside on an employee's "to complete" list.
-- dismissed_until NULL means "does not apply", for good; a date means "remind me after".
CREATE TABLE IF NOT EXISTS public.employee_checklist_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  dismissed_until date,
  dismissed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, item_key)
);

ALTER TABLE public.employee_checklist_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR manages checklist dismissals" ON public.employee_checklist_dismissals FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
