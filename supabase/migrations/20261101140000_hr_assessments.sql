-- Conative (Kolbe A Index) assessments. Kolbe results come from Kolbe's own test, so HR keys in
-- the four mode scores (1-10) rather than the app scoring anything. Each row is one dated result;
-- older rows stay as history.
--
-- Visible to HR, the employee, and the employee's direct manager (employees.manager_id).
-- Only HR writes.

CREATE TABLE public.employee_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  framework text NOT NULL DEFAULT 'kolbe_a' CHECK (framework IN ('kolbe_a')),
  fact_finder smallint NOT NULL CHECK (fact_finder BETWEEN 1 AND 10),
  follow_thru smallint NOT NULL CHECK (follow_thru BETWEEN 1 AND 10),
  quick_start smallint NOT NULL CHECK (quick_start BETWEEN 1 AND 10),
  implementor smallint NOT NULL CHECK (implementor BETWEEN 1 AND 10),
  assessed_on date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_assessments_employee_idx ON public.employee_assessments(employee_id, assessed_on DESC);

CREATE TRIGGER employee_assessments_updated_at BEFORE UPDATE ON public.employee_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_manager_of_employee(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    JOIN public.employees m ON m.id = e.manager_id
    WHERE e.id = _employee_id AND m.user_id = auth.uid()
  )
$$;

ALTER TABLE public.employee_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR manages assessments" ON public.employee_assessments FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own assessments" ON public.employee_assessments FOR SELECT
  USING (public.is_employee_self(employee_id));
CREATE POLICY "Managers read their reports' assessments" ON public.employee_assessments FOR SELECT
  USING (public.is_manager_of_employee(employee_id));
