-- Per-employee income tax year: claims (deductions and allowances) and the
-- income/PAYE paid before payroll moved into the app, so the annual estimate
-- covers the whole year.
CREATE TABLE public.employee_tax_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  opening_months integer NOT NULL DEFAULT 0 CHECK (opening_months BETWEEN 0 AND 12),
  opening_income numeric(12,2) NOT NULL DEFAULT 0,
  opening_paye numeric(12,2) NOT NULL DEFAULT 0,
  -- TaxClaims in src/features/admin/hr/tax/annualTax.ts.
  claims jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, year)
);

CREATE TRIGGER employee_tax_years_updated_at BEFORE UPDATE ON public.employee_tax_years
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER employee_tax_years_audit AFTER INSERT OR UPDATE OR DELETE ON public.employee_tax_years
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();

ALTER TABLE public.employee_tax_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR manages tax years" ON public.employee_tax_years FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own tax years" ON public.employee_tax_years FOR SELECT
  USING (public.is_employee_self(employee_id));
