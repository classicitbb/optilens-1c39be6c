-- Accountant: shops and checks out like a customer, and has admin access to the
-- Finance module only (costings, statements, payments, people/payroll, assets).
-- It is deliberately NOT an operator: has_edit_role()/has_any_role()/has_staff_role() stay as-is
-- so no non-finance table opens up.

-- Finance helper (admins and the office administrator keep their own access).
CREATE OR REPLACE FUNCTION public.can_finance(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'accountant'
  )
$$;

-- An accountant is also a customer for every customer-side check (a user holds one role).
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
      AND (
        role = _role
        OR (_role = 'operator' AND role = 'office_admin')
        OR (_role = 'customer' AND role = 'accountant')
      )
  )
$$;

-- HR/payroll and the asset register are part of the Finance module.
CREATE OR REPLACE FUNCTION public.can_hr(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'office_admin', 'accountant')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_assets(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'office_admin', 'accountant')
  )
$$;

-- Feature grants: Finance only. hasAppAccess('costings') is what shows the Finance app.
INSERT INTO public.role_permissions (role, feature, can_view, can_edit) VALUES
  ('accountant'::app_role, 'costings', true, true),
  ('accountant'::app_role, 'hr', true, true),
  ('accountant'::app_role, 'payroll', true, true),
  ('accountant'::app_role, 'integrations', true, true)
ON CONFLICT (role, feature) DO UPDATE SET can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit;

-- Finance tables: wherever a policy admits has_edit_role()/has_any_role()/has_staff_role(), also admit can_finance().
-- Rewritten from the live policy text so it follows whatever is actually deployed. Idempotent.
-- Shared tables (customers/contacts) only get read access, never write.
DO $$
DECLARE
  finance_tables text[] := ARRAY[
    'shipments', 'shipment_charges', 'shipment_documents', 'shipment_evidence_links',
    'walk_in_payments', 'scotia_payment_activity', 'statements', 'statement_lines',
    'statement_document_jobs', 'bank_payment_portals'
  ];
  shared_tables text[] := ARRAY['customers', 'contacts'];
  pat constant text := 'has_(edit|any|staff)_role\(((?:[^()]|\([^()]*\))*)\)';
  rep constant text := '(\&  OR public.can_finance(\2))';
  p record;
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (tablename = ANY (finance_tables) OR (tablename = ANY (shared_tables) AND cmd = 'SELECT'))
  LOOP
    new_qual := CASE WHEN p.qual IS NULL OR p.qual LIKE '%can_finance%' THEN p.qual
                     ELSE regexp_replace(p.qual, pat, rep, 'g') END;
    new_check := CASE WHEN p.with_check IS NULL OR p.with_check LIKE '%can_finance%' THEN p.with_check
                      ELSE regexp_replace(p.with_check, pat, rep, 'g') END;
    CONTINUE WHEN new_qual IS NOT DISTINCT FROM p.qual AND new_check IS NOT DISTINCT FROM p.with_check;

    stmt := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    IF new_qual IS NOT NULL THEN stmt := stmt || ' USING (' || new_qual || ')'; END IF;
    IF new_check IS NOT NULL THEN stmt := stmt || ' WITH CHECK (' || new_check || ')'; END IF;
    EXECUTE stmt;
  END LOOP;
END
$$;
