-- Asset register phase 1: fixed asset register, monthly depreciation runs,
-- disposals and the opening-balance import. See docs/ASSET_REGISTER_PLAN.md.
-- Depreciation amounts are calculated in the app
-- (src/features/admin/finance/assets/engine.ts) and stored per run as a snapshot.
-- Approving a run adds its lines to each asset's accumulated depreciation and locks it.

INSERT INTO public.role_permissions (role, feature, can_view, can_edit) VALUES
  ('admin'::app_role, 'assets', true, true),
  ('office_admin'::app_role, 'assets', true, true),
  ('operator'::app_role, 'assets', true, false),
  ('viewer'::app_role, 'assets', false, false),
  ('customer'::app_role, 'assets', false, false)
ON CONFLICT (role, feature) DO UPDATE SET can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit;

-- Admins and the office administrator manage the register; other staff may read it.
CREATE OR REPLACE FUNCTION public.can_manage_assets(_user_id uuid)
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

-- ---------------------------------------------------------------------------
-- Classes carry the defaults and the QBO accounts each class posts to.
-- ---------------------------------------------------------------------------
CREATE TABLE public.asset_tax_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  initial_allowance_pct numeric(6,3),
  annual_allowance_pct numeric(6,3),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.asset_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_intangible boolean NOT NULL DEFAULT false,
  default_life_months integer NOT NULL CHECK (default_life_months > 0),
  default_method text NOT NULL DEFAULT 'straight_line' CHECK (default_method IN ('straight_line', 'declining_balance')),
  default_residual_pct numeric(5,2) NOT NULL DEFAULT 0 CHECK (default_residual_pct >= 0 AND default_residual_pct < 100),
  qbo_cost_account text NOT NULL,
  qbo_accum_account text NOT NULL,
  qbo_expense_overhead_account text NOT NULL,
  qbo_expense_cogs_account text NOT NULL,
  qbo_disposal_account text NOT NULL,
  tax_class_id uuid REFERENCES public.asset_tax_classes(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Account names as they read in QBO on 2026-10-30. The accumulated depreciation
-- accounts are new: the accountant creates them before the reclass journal.
INSERT INTO public.asset_classes
  (name, is_intangible, default_life_months, qbo_cost_account, qbo_accum_account,
   qbo_expense_overhead_account, qbo_expense_cogs_account, qbo_disposal_account, sort_order)
VALUES
  ('Machinery & Equipment', false, 96, 'Machinery and equipment', 'Accumulated depreciation - Machinery and equipment',
   'Depreciation', 'Depreciation - COS', 'Profit/(loss) on sale of asset', 1),
  ('Fixtures & Fittings', false, 96, 'Furniture & Fixtures', 'Accumulated depreciation - Furniture & Fixtures',
   'Depreciation', 'Depreciation - COS', 'Profit/(loss) on sale of asset', 2),
  ('Computer Equipment', false, 96, 'Furniture & Fixtures', 'Accumulated depreciation - Furniture & Fixtures',
   'Depreciation', 'Depreciation - COS', 'Profit/(loss) on sale of asset', 3),
  ('Vehicles', false, 60, 'Vehicles', 'Accumulated depreciation - Vehicles',
   'Depreciation', 'Depreciation - COS', 'Profit/(loss) on sale of asset', 4),
  ('Software', true, 96, 'Intangibles', 'Accumulated amortisation - Intangibles',
   'Amortisation expense', 'Amortisation expense', 'Profit/(loss) on sale of asset', 5)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- The register.
-- ---------------------------------------------------------------------------
CREATE SEQUENCE public.asset_tag_seq;

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL UNIQUE DEFAULT 'FA-' || lpad(nextval('public.asset_tag_seq')::text, 4, '0'),
  name text NOT NULL,
  description text,
  class_id uuid NOT NULL REFERENCES public.asset_classes(id) ON DELETE RESTRICT,
  parent_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  serial_no text,
  manufacturer text,
  model text,
  location text,
  custodian_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  supplier text,
  invoice_ref text,
  acquired_on date,
  in_service_on date,
  warranty_expires_on date,
  cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  original_currency text,
  original_amount numeric(14,2),
  expense_target text NOT NULL DEFAULT 'overhead' CHECK (expense_target IN ('cogs', 'overhead')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_service', 'disposed', 'written_off')),
  disposed_on date,
  -- The per-asset QBO account this asset was carried in before the cut-over,
  -- used to build the one-off reclass journal into the class accounts.
  legacy_qbo_account text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'in_service' OR in_service_on IS NOT NULL),
  CHECK (status NOT IN ('disposed', 'written_off') OR disposed_on IS NOT NULL)
);
CREATE INDEX assets_class_idx ON public.assets(class_id);
CREATE INDEX assets_status_idx ON public.assets(status);

-- One row per asset per book. accum_dep is the total to date: the opening
-- balance plus every approved run. Only approve_depreciation_run changes it.
CREATE TABLE public.asset_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  book text NOT NULL DEFAULT 'book' CHECK (book IN ('book', 'tax')),
  method text NOT NULL DEFAULT 'straight_line' CHECK (method IN ('straight_line', 'declining_balance')),
  useful_life_months integer NOT NULL CHECK (useful_life_months > 0),
  residual_value numeric(14,2) NOT NULL DEFAULT 0 CHECK (residual_value >= 0),
  rate_pct numeric(6,3),
  convention text NOT NULL DEFAULT 'full_year' CHECK (convention IN ('full_year', 'full_month', 'mid_month')),
  opening_accum_dep numeric(14,2) NOT NULL DEFAULT 0 CHECK (opening_accum_dep >= 0),
  opening_as_of date,
  accum_dep numeric(14,2) NOT NULL DEFAULT 0 CHECK (accum_dep >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, book),
  CHECK (method <> 'declining_balance' OR rate_pct > 0)
);

-- Append-only history of what happened to each asset.
CREATE TABLE public.asset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('opening_balance', 'acquired', 'improvement', 'revaluation', 'impairment',
                                     'transfer', 'life_change', 'disposal', 'write_off', 'note')),
  occurred_on date NOT NULL,
  amount numeric(14,2),
  proceeds numeric(14,2),
  gain_loss numeric(14,2),
  memo text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_events_asset_idx ON public.asset_events(asset_id, occurred_on);

-- ---------------------------------------------------------------------------
-- Monthly depreciation runs.
-- ---------------------------------------------------------------------------
CREATE TABLE public.depreciation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period date NOT NULL CHECK (extract(day FROM period) = 1),
  book text NOT NULL DEFAULT 'book' CHECK (book IN ('book', 'tax')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted')),
  journal_ref text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  approved_by uuid,
  approved_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period, book)
);
-- Lines are worked out from approved totals, so only one run per book may be open.
CREATE UNIQUE INDEX depreciation_runs_one_draft ON public.depreciation_runs(book) WHERE status = 'draft';

CREATE TABLE public.depreciation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.depreciation_runs(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.asset_classes(id) ON DELETE RESTRICT,
  expense_target text NOT NULL CHECK (expense_target IN ('cogs', 'overhead')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, asset_id)
);
CREATE INDEX depreciation_lines_asset_idx ON public.depreciation_lines(asset_id);

CREATE TRIGGER asset_tax_classes_updated_at BEFORE UPDATE ON public.asset_tax_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER asset_classes_updated_at BEFORE UPDATE ON public.asset_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER assets_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER asset_books_updated_at BEFORE UPDATE ON public.asset_books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER depreciation_runs_updated_at BEFORE UPDATE ON public.depreciation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Guards. Cost and opening balances are fixed once an asset leaves draft;
-- later changes go through events. accum_dep and status changes to disposed
-- happen only inside the functions below.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.asset_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Only draft assets can be deleted; dispose or write off the asset instead';
    END IF;
    RETURN OLD;
  END IF;

  IF current_setting('assets.privileged', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF OLD.status <> 'draft' AND NEW.cost IS DISTINCT FROM OLD.cost THEN
    RAISE EXCEPTION 'Cost is fixed once an asset is in service; record an improvement or impairment instead';
  END IF;
  IF NEW.status IN ('disposed', 'written_off') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Dispose or write off assets with dispose_asset';
  END IF;
  IF OLD.status IN ('disposed', 'written_off') THEN
    RAISE EXCEPTION 'Disposed assets are locked';
  END IF;
  IF OLD.status = 'in_service' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'An asset in service cannot go back to draft';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assets_guard BEFORE UPDATE OR DELETE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.asset_guard();

CREATE OR REPLACE FUNCTION public.asset_book_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF current_setting('assets.privileged', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.accum_dep := NEW.opening_accum_dep;
    RETURN NEW;
  END IF;

  SELECT status INTO v_status FROM public.assets WHERE id = COALESCE(NEW.asset_id, OLD.asset_id);
  IF TG_OP = 'DELETE' THEN
    IF v_status IS NOT NULL AND v_status <> 'draft' THEN
      RAISE EXCEPTION 'Books of an asset in service cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.accum_dep IS DISTINCT FROM OLD.accum_dep THEN
    RAISE EXCEPTION 'Accumulated depreciation changes only through approved depreciation runs';
  END IF;
  IF v_status <> 'draft' AND (NEW.opening_accum_dep IS DISTINCT FROM OLD.opening_accum_dep
                              OR NEW.opening_as_of IS DISTINCT FROM OLD.opening_as_of) THEN
    RAISE EXCEPTION 'Opening balances are fixed once an asset is in service';
  END IF;
  IF v_status = 'draft' THEN
    NEW.accum_dep := NEW.opening_accum_dep;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_books_guard BEFORE INSERT OR UPDATE OR DELETE ON public.asset_books
  FOR EACH ROW EXECUTE FUNCTION public.asset_book_guard();

CREATE OR REPLACE FUNCTION public.depreciation_run_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Only draft depreciation runs can be deleted';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'draft' AND NEW.status <> 'draft'
     AND current_setting('assets.privileged', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Approve depreciation runs with approve_depreciation_run';
  END IF;
  IF OLD.status = 'approved' AND NOT (NEW.status IN ('approved', 'posted')
       AND NEW.period = OLD.period AND NEW.book = OLD.book) THEN
    RAISE EXCEPTION 'Approved depreciation runs can only be marked posted';
  END IF;
  IF OLD.status = 'posted' AND (NEW.status <> 'posted' OR NEW.period <> OLD.period) THEN
    RAISE EXCEPTION 'Posted depreciation runs are locked';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER depreciation_runs_guard BEFORE UPDATE OR DELETE ON public.depreciation_runs
  FOR EACH ROW EXECUTE FUNCTION public.depreciation_run_guard();

CREATE OR REPLACE FUNCTION public.depreciation_line_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.depreciation_runs WHERE id = COALESCE(NEW.run_id, OLD.run_id);
  -- A cascade delete from a draft run finds no run row; let it through.
  IF v_status IS NOT NULL AND v_status <> 'draft' THEN
    RAISE EXCEPTION 'Lines on an approved depreciation run are locked';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER depreciation_lines_guard BEFORE INSERT OR UPDATE OR DELETE ON public.depreciation_lines
  FOR EACH ROW EXECUTE FUNCTION public.depreciation_line_guard();

-- ---------------------------------------------------------------------------
-- RLS: managers write; all staff with an edit role read.
-- ---------------------------------------------------------------------------
ALTER TABLE public.asset_tax_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depreciation_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read asset tax classes" ON public.asset_tax_classes FOR SELECT
  USING (public.has_edit_role(auth.uid()));
CREATE POLICY "Managers manage asset tax classes" ON public.asset_tax_classes FOR ALL
  USING (public.can_manage_assets(auth.uid())) WITH CHECK (public.can_manage_assets(auth.uid()));

CREATE POLICY "Staff read asset classes" ON public.asset_classes FOR SELECT
  USING (public.has_edit_role(auth.uid()));
CREATE POLICY "Managers manage asset classes" ON public.asset_classes FOR ALL
  USING (public.can_manage_assets(auth.uid())) WITH CHECK (public.can_manage_assets(auth.uid()));

CREATE POLICY "Staff read assets" ON public.assets FOR SELECT
  USING (public.has_edit_role(auth.uid()));
CREATE POLICY "Managers manage assets" ON public.assets FOR ALL
  USING (public.can_manage_assets(auth.uid())) WITH CHECK (public.can_manage_assets(auth.uid()));

CREATE POLICY "Staff read asset books" ON public.asset_books FOR SELECT
  USING (public.has_edit_role(auth.uid()));
CREATE POLICY "Managers manage asset books" ON public.asset_books FOR ALL
  USING (public.can_manage_assets(auth.uid())) WITH CHECK (public.can_manage_assets(auth.uid()));

-- Events are insert-only: no update or delete policy.
CREATE POLICY "Staff read asset events" ON public.asset_events FOR SELECT
  USING (public.has_edit_role(auth.uid()));
CREATE POLICY "Managers add asset events" ON public.asset_events FOR INSERT
  WITH CHECK (public.can_manage_assets(auth.uid()));

CREATE POLICY "Managers manage depreciation runs" ON public.depreciation_runs FOR ALL
  USING (public.can_manage_assets(auth.uid())) WITH CHECK (public.can_manage_assets(auth.uid()));
CREATE POLICY "Managers manage depreciation lines" ON public.depreciation_lines FOR ALL
  USING (public.can_manage_assets(auth.uid())) WITH CHECK (public.can_manage_assets(auth.uid()));

-- ---------------------------------------------------------------------------
-- Approve a run: add each line to the asset's accumulated depreciation, lock.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_depreciation_run(_run_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.depreciation_runs%ROWTYPE;
BEGIN
  IF NOT public.can_manage_assets(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_run FROM public.depreciation_runs WHERE id = _run_id FOR UPDATE;
  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'Depreciation run not found';
  END IF;
  IF v_run.status <> 'draft' THEN
    RAISE EXCEPTION 'Depreciation run is already %', v_run.status;
  END IF;
  IF EXISTS (SELECT 1 FROM public.depreciation_runs
             WHERE book = v_run.book AND status <> 'draft' AND period >= v_run.period) THEN
    RAISE EXCEPTION 'A run for this or a later month is already approved';
  END IF;
  IF EXISTS (SELECT 1 FROM public.depreciation_lines l
             JOIN public.asset_books b ON b.asset_id = l.asset_id AND b.book = v_run.book
             JOIN public.assets a ON a.id = l.asset_id
             WHERE l.run_id = _run_id
               AND (a.status <> 'in_service' OR b.accum_dep + l.amount > a.cost - b.residual_value)) THEN
    RAISE EXCEPTION 'The run is out of date (an asset was disposed or already charged); recalculate it';
  END IF;

  PERFORM set_config('assets.privileged', 'on', true);
  UPDATE public.asset_books b
  SET accum_dep = b.accum_dep + l.amount
  FROM public.depreciation_lines l
  WHERE l.run_id = _run_id AND b.asset_id = l.asset_id AND b.book = v_run.book;

  UPDATE public.depreciation_runs
  SET status = 'approved', approved_by = auth.uid(), approved_at = now()
  WHERE id = _run_id;
  PERFORM set_config('assets.privileged', 'off', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Dispose or write off: depreciation stops at the last approved run, and the
-- gain or loss is proceeds less the book NBV at that point.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dispose_asset(_asset_id uuid, _on date, _proceeds numeric, _write_off boolean, _memo text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset public.assets%ROWTYPE;
  v_accum numeric;
  v_gain numeric;
BEGIN
  IF NOT public.can_manage_assets(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_asset FROM public.assets WHERE id = _asset_id FOR UPDATE;
  IF v_asset.id IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  IF v_asset.status <> 'in_service' THEN
    RAISE EXCEPTION 'Only assets in service can be disposed';
  END IF;
  IF _on IS NULL OR _on < v_asset.in_service_on THEN
    RAISE EXCEPTION 'Disposal date must be on or after the in-service date';
  END IF;
  IF EXISTS (SELECT 1 FROM public.depreciation_runs r JOIN public.depreciation_lines l ON l.run_id = r.id
             WHERE r.status = 'draft' AND l.asset_id = _asset_id) THEN
    RAISE EXCEPTION 'This asset is on a draft depreciation run; approve or delete the run first';
  END IF;

  SELECT accum_dep INTO v_accum FROM public.asset_books WHERE asset_id = _asset_id AND book = 'book';
  v_gain := COALESCE(_proceeds, 0) - (v_asset.cost - COALESCE(v_accum, 0));

  PERFORM set_config('assets.privileged', 'on', true);
  UPDATE public.assets
  SET status = CASE WHEN _write_off THEN 'written_off' ELSE 'disposed' END, disposed_on = _on
  WHERE id = _asset_id;
  PERFORM set_config('assets.privileged', 'off', true);

  INSERT INTO public.asset_events (asset_id, type, occurred_on, amount, proceeds, gain_loss, memo)
  VALUES (_asset_id, CASE WHEN _write_off THEN 'write_off' ELSE 'disposal' END, _on,
          v_asset.cost - COALESCE(v_accum, 0), COALESCE(_proceeds, 0), v_gain, _memo);
  RETURN v_gain;
END;
$$;

-- ---------------------------------------------------------------------------
-- Opening-balance import: all rows or none. Each row is
-- {name, class, acquired_on, in_service_on, cost, opening_accum_dep,
--  useful_life_months, expense_target, legacy_qbo_account, serial_no, location, notes}.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.import_opening_assets(_as_of date, _rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  v_class uuid;
  v_asset uuid;
  v_count integer := 0;
BEGIN
  IF NOT public.can_manage_assets(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF _as_of IS NULL THEN
    RAISE EXCEPTION 'Choose the cut-over date';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    SELECT id INTO v_class FROM public.asset_classes WHERE lower(name) = lower(r->>'class');
    IF v_class IS NULL THEN
      RAISE EXCEPTION 'Unknown asset class "%" for %', r->>'class', r->>'name';
    END IF;
    IF (r->>'opening_accum_dep')::numeric > (r->>'cost')::numeric THEN
      RAISE EXCEPTION '% has more depreciation than cost', r->>'name';
    END IF;

    INSERT INTO public.assets (name, class_id, acquired_on, in_service_on, cost, expense_target, status,
                               legacy_qbo_account, serial_no, location, notes)
    VALUES (r->>'name', v_class, (r->>'acquired_on')::date,
            COALESCE((r->>'in_service_on')::date, (r->>'acquired_on')::date, _as_of),
            (r->>'cost')::numeric, COALESCE(r->>'expense_target', 'overhead'), 'in_service',
            r->>'legacy_qbo_account', r->>'serial_no', r->>'location', r->>'notes')
    RETURNING id INTO v_asset;

    INSERT INTO public.asset_books (asset_id, book, useful_life_months, opening_accum_dep, opening_as_of)
    VALUES (v_asset, 'book', (r->>'useful_life_months')::integer, (r->>'opening_accum_dep')::numeric, _as_of);

    INSERT INTO public.asset_events (asset_id, type, occurred_on, amount, memo)
    VALUES (v_asset, 'opening_balance', _as_of, (r->>'cost')::numeric,
            'Opening accumulated depreciation ' || (r->>'opening_accum_dep'));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_depreciation_run(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispose_asset(uuid, date, numeric, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_opening_assets(date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_depreciation_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispose_asset(uuid, date, numeric, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_opening_assets(date, jsonb) TO authenticated;
