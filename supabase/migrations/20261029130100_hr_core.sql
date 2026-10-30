-- HR phase 1: office_admin role wiring, HR permissions and employee records.

-- ---------------------------------------------------------------------------
-- Role helpers: office_admin works the rest of the admin like an operator, so
-- every existing has_role(..., 'operator') / has_edit_role check admits it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR (_role = 'operator' AND role = 'office_admin'))
  )
$$;

CREATE OR REPLACE FUNCTION public.has_edit_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'operator', 'office_admin')
  )
$$;

-- HR and payroll data is visible to admins and the office administrator only.
CREATE OR REPLACE FUNCTION public.can_hr(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'office_admin')
  )
$$;

-- office_admin starts with the operator's feature grants, plus HR and payroll.
INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
SELECT 'office_admin'::app_role, feature, can_view, can_edit
FROM public.role_permissions
WHERE role = 'operator'
ON CONFLICT (role, feature) DO NOTHING;

INSERT INTO public.role_permissions (role, feature, can_view, can_edit) VALUES
  ('admin'::app_role, 'hr', true, true),
  ('admin'::app_role, 'payroll', true, true),
  ('office_admin'::app_role, 'hr', true, true),
  ('office_admin'::app_role, 'payroll', true, true),
  ('operator'::app_role, 'hr', false, false),
  ('operator'::app_role, 'payroll', false, false),
  ('viewer'::app_role, 'hr', false, false),
  ('viewer'::app_role, 'payroll', false, false),
  ('customer'::app_role, 'hr', false, false),
  ('customer'::app_role, 'payroll', false, false)
ON CONFLICT (role, feature) DO UPDATE SET can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit;

-- ---------------------------------------------------------------------------
-- Employee records
-- ---------------------------------------------------------------------------
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_no text UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  preferred_name text,
  date_of_birth date,
  email text,
  phone text,
  address text,
  emergency_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  job_title text,
  department text,
  manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  employment_type text NOT NULL DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'casual')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_leave', 'terminated')),
  hire_date date,
  termination_date date,
  termination_reason text,
  tax_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Government IDs and bank details sit apart from the profile with no direct
-- read policy: they are only read through reveal_employee_sensitive, which logs.
CREATE TABLE public.employee_sensitive (
  employee_id uuid PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  national_registration_no text,
  nis_no text,
  tax_file_no text,
  bank_name text,
  bank_branch text,
  bank_account_no text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Effective-dated pay history. Allowances are annual amounts used by PAYE.
CREATE TABLE public.employee_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_type text NOT NULL DEFAULT 'salary' CHECK (pay_type IN ('salary', 'hourly')),
  pay_frequency text NOT NULL DEFAULT 'monthly'
    CHECK (pay_frequency IN ('monthly', 'semi_monthly', 'fortnightly', 'weekly')),
  base_amount numeric(12,2) NOT NULL CHECK (base_amount >= 0),
  currency text NOT NULL DEFAULT 'BBD',
  annual_personal_allowance numeric(12,2) NOT NULL DEFAULT 0,
  annual_child_allowance numeric(12,2) NOT NULL DEFAULT 0,
  annual_other_allowance numeric(12,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX employee_compensation_employee_idx ON public.employee_compensation(employee_id, effective_from DESC);

-- Recurring earnings and deductions (car allowance, health insurance, loans...).
CREATE TABLE public.employee_recurring_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('earning', 'deduction')),
  label text NOT NULL,
  amount numeric(12,2),
  percent numeric(7,4),
  taxable boolean NOT NULL DEFAULT true,
  loan_principal numeric(12,2),
  loan_balance numeric(12,2),
  start_date date,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((amount IS NOT NULL) <> (percent IS NOT NULL))
);
CREATE INDEX employee_recurring_items_employee_idx ON public.employee_recurring_items(employee_id);

-- How net pay is paid out: fixed amounts first in sort order, then one remainder line.
CREATE TABLE public.employee_pay_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  label text NOT NULL,
  method text NOT NULL DEFAULT 'bank_transfer'
    CHECK (method IN ('bank_transfer', 'cheque', 'cash', 'third_party')),
  amount numeric(12,2),
  is_remainder boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (is_remainder OR amount IS NOT NULL)
);
CREATE INDEX employee_pay_splits_employee_idx ON public.employee_pay_splits(employee_id);

CREATE TABLE public.employee_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general'
    CHECK (category IN ('general', 'check_in', 'commendation', 'disciplinary')),
  body text NOT NULL,
  visibility text NOT NULL DEFAULT 'hr_only' CHECK (visibility IN ('hr_only', 'shared')),
  author_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX employee_notes_employee_idx ON public.employee_notes(employee_id, created_at DESC);

CREATE TRIGGER employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER employee_sensitive_updated_at BEFORE UPDATE ON public.employee_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER employee_recurring_items_updated_at BEFORE UPDATE ON public.employee_recurring_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER employee_pay_splits_updated_at BEFORE UPDATE ON public.employee_pay_splits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS: HR staff manage everything; an employee reads their own record.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_employee_self(_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees WHERE id = _employee_id AND user_id = auth.uid()
  )
$$;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_sensitive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_recurring_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_pay_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR manages employees" ON public.employees FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own record" ON public.employees FOR SELECT
  USING (user_id = auth.uid());

-- No SELECT policy on purpose: reads go through reveal_employee_sensitive.
CREATE POLICY "HR inserts sensitive" ON public.employee_sensitive FOR INSERT
  WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "HR updates sensitive" ON public.employee_sensitive FOR UPDATE
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));

CREATE POLICY "HR manages compensation" ON public.employee_compensation FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own compensation" ON public.employee_compensation FOR SELECT
  USING (public.is_employee_self(employee_id));

CREATE POLICY "HR manages recurring items" ON public.employee_recurring_items FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own recurring items" ON public.employee_recurring_items FOR SELECT
  USING (public.is_employee_self(employee_id));

CREATE POLICY "HR manages pay splits" ON public.employee_pay_splits FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own pay splits" ON public.employee_pay_splits FOR SELECT
  USING (public.is_employee_self(employee_id));

CREATE POLICY "HR manages notes" ON public.employee_notes FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own shared notes" ON public.employee_notes FOR SELECT
  USING (visibility = 'shared' AND public.is_employee_self(employee_id));

-- ---------------------------------------------------------------------------
-- Sensitive field access, logged to audit_log on every read.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reveal_employee_sensitive(_employee_id uuid)
RETURNS public.employee_sensitive
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.employee_sensitive;
BEGIN
  IF NOT (public.can_hr(auth.uid()) OR public.is_employee_self(_employee_id)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.employee_sensitive WHERE employee_id = _employee_id;

  INSERT INTO public.audit_log (table_name, record_id, action, user_id)
  VALUES ('employee_sensitive', _employee_id, 'reveal', auth.uid());

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.reveal_employee_sensitive(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reveal_employee_sensitive(uuid) TO authenticated;

-- Upsert needs to see the existing row, which RLS denies, so HR writes go through here.
CREATE OR REPLACE FUNCTION public.save_employee_sensitive(
  _employee_id uuid,
  _national_registration_no text,
  _nis_no text,
  _tax_file_no text,
  _bank_name text,
  _bank_branch text,
  _bank_account_no text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_hr(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.employee_sensitive AS s (
    employee_id, national_registration_no, nis_no, tax_file_no, bank_name, bank_branch, bank_account_no
  ) VALUES (
    _employee_id, _national_registration_no, _nis_no, _tax_file_no, _bank_name, _bank_branch, _bank_account_no
  )
  ON CONFLICT (employee_id) DO UPDATE SET
    national_registration_no = EXCLUDED.national_registration_no,
    nis_no = EXCLUDED.nis_no,
    tax_file_no = EXCLUDED.tax_file_no,
    bank_name = EXCLUDED.bank_name,
    bank_branch = EXCLUDED.bank_branch,
    bank_account_no = EXCLUDED.bank_account_no;
END;
$$;

REVOKE ALL ON FUNCTION public.save_employee_sensitive(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_employee_sensitive(uuid, text, text, text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Change history for HR tables. Values in employee_sensitive are not copied.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hr_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id uuid;
  v_redact boolean := TG_TABLE_NAME = 'employee_sensitive';
BEGIN
  IF TG_TABLE_NAME = 'employee_sensitive' THEN
    v_record_id := COALESCE(NEW.employee_id, OLD.employee_id);
  ELSE
    v_record_id := COALESCE(NEW.id, OLD.id);
  END IF;

  INSERT INTO public.audit_log (table_name, record_id, action, user_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    v_record_id,
    lower(TG_OP),
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    CASE WHEN v_redact OR TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN v_redact OR TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER employees_audit AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();
CREATE TRIGGER employee_sensitive_audit AFTER INSERT OR UPDATE OR DELETE ON public.employee_sensitive
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();
CREATE TRIGGER employee_compensation_audit AFTER INSERT OR UPDATE OR DELETE ON public.employee_compensation
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();
CREATE TRIGGER employee_recurring_items_audit AFTER INSERT OR UPDATE OR DELETE ON public.employee_recurring_items
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();
CREATE TRIGGER employee_pay_splits_audit AFTER INSERT OR UPDATE OR DELETE ON public.employee_pay_splits
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();
