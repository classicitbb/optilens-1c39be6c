-- HR leave: configurable leave types seeded with Barbados statutory defaults,
-- leave requests with approval, and manual balance adjustments (opening balances).
-- Balances are worked out in the app from the hire date, the type's entitlement
-- tiers and approved requests; unpaid days feed the payroll run.

-- One-row policy: when balance tracking starts and which weekdays are worked.
CREATE TABLE public.leave_policy (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  tracking_from date NOT NULL DEFAULT '2026-01-01',
  -- ISO weekdays, 1 = Monday.
  work_days smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.leave_policy DEFAULT VALUES;

CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  -- per_year: earned on each employment anniversary; per_event: allowed per occurrence (birth...).
  basis text NOT NULL DEFAULT 'per_year' CHECK (basis IN ('per_year', 'per_event', 'none')),
  -- [{ "min_years": completed years of service, "days": working days }], highest matching tier wins.
  entitlement_tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Unused days kept at each anniversary; null = no cap.
  carry_over_max_days numeric(6,2),
  -- How payroll treats the days: paid as normal, unpaid (deducted), or unpaid by
  -- the employer because NIS pays a benefit.
  payroll_effect text NOT NULL DEFAULT 'paid' CHECK (payroll_effect IN ('paid', 'unpaid', 'nis_benefit')),
  certificate_after_days integer,
  legal_basis text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.leave_types (code, name, basis, entitlement_tiers, carry_over_max_days, payroll_effect, certificate_after_days, legal_basis, notes, sort_order) VALUES
  ('vacation', 'Vacation', 'per_year', '[{"min_years":1,"days":15},{"min_years":5,"days":20}]', NULL, 'paid', NULL,
   'Holidays with Pay Act, 2017-3',
   'Three weeks with pay after each year of service (208 days worked in the first year), four weeks from the end of the fifth year. Leave is due within 12 months of being earned; postponing it needs written agreement. Owed leave is paid out on termination.', 10),
  ('sick', 'Sick leave', 'none', '[]', NULL, 'paid', 2,
   'National Insurance and Social Security Act (sickness benefit)',
   'No statutory employer-paid sick days. NIS sickness benefit is paid from the fourth day of a certified illness. Set a yearly entitlement here if company policy grants paid sick days.', 20),
  ('maternity', 'Maternity leave', 'per_event', '[{"min_years":0,"days":70}]', 0, 'nis_benefit', NULL,
   'Family Leave Act, 2025',
   '14 weeks (17 weeks for a multiple birth). Maternity benefit is paid by NIS; set to Paid if the company tops up pay.', 30),
  ('paternity', 'Paternity leave', 'per_event', '[{"min_years":0,"days":15}]', 0, 'nis_benefit', NULL,
   'Family Leave Act, 2025',
   'Three weeks, in one block within three months of the birth or split (at least two weeks in the first three months, the rest before six months). A further three weeks if the mother dies around the birth.', 40),
  ('unpaid', 'Unpaid leave', 'none', '[]', NULL, 'unpaid', NULL, NULL, 'By agreement. Days are deducted from pay.', 50);

CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  -- Working days taken; worked out from the dates and editable for public holidays or half days.
  days numeric(6,2) NOT NULL CHECK (days > 0),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'declined', 'cancelled')),
  reason text,
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX leave_requests_employee_idx ON public.leave_requests(employee_id, start_date DESC);

CREATE TABLE public.leave_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  days numeric(6,2) NOT NULL,
  effective_date date NOT NULL DEFAULT current_date,
  reason text NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leave_adjustments_employee_idx ON public.leave_adjustments(employee_id);

CREATE TRIGGER leave_policy_updated_at BEFORE UPDATE ON public.leave_policy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER leave_types_updated_at BEFORE UPDATE ON public.leave_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER leave_types_audit AFTER INSERT OR UPDATE OR DELETE ON public.leave_types
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();
CREATE TRIGGER leave_requests_audit AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();
CREATE TRIGGER leave_adjustments_audit AFTER INSERT OR UPDATE OR DELETE ON public.leave_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.hr_audit_change();

ALTER TABLE public.leave_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR manages leave policy" ON public.leave_policy FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Signed-in users read leave policy" ON public.leave_policy FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "HR manages leave types" ON public.leave_types FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Signed-in users read leave types" ON public.leave_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "HR manages leave requests" ON public.leave_requests FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own leave requests" ON public.leave_requests FOR SELECT
  USING (public.is_employee_self(employee_id));
CREATE POLICY "Employees request leave for themselves" ON public.leave_requests FOR INSERT
  WITH CHECK (public.is_employee_self(employee_id) AND status = 'requested');

CREATE POLICY "HR manages leave adjustments" ON public.leave_adjustments FOR ALL
  USING (public.can_hr(auth.uid())) WITH CHECK (public.can_hr(auth.uid()));
CREATE POLICY "Employees read own leave adjustments" ON public.leave_adjustments FOR SELECT
  USING (public.is_employee_self(employee_id));

-- Employees may only withdraw their own pending request; decisions are HR's.
CREATE OR REPLACE FUNCTION public.cancel_own_leave_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.leave_requests
  SET status = 'cancelled'
  WHERE id = _request_id AND status = 'requested' AND public.is_employee_self(employee_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only your own pending requests can be cancelled' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_own_leave_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_own_leave_request(uuid) TO authenticated;
