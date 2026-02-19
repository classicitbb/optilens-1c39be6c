
-- ============================================================
-- Fix 1: Add helper function to check if user is viewer or customer
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_restricted_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('viewer', 'customer')
  )
$$;

-- ============================================================
-- Fix 2: Create secure RPC functions that strip cost data for
--         viewer/customer roles, enforced server-side
-- ============================================================

-- Secure lens fetch: strips base_price for viewer/customer
CREATE OR REPLACE FUNCTION public.get_lenses_safe()
RETURNS TABLE (
  id uuid,
  supplier_id uuid,
  brand_id uuid,
  material_id uuid,
  mftype_id uuid,
  lenstype_id uuid,
  finishtype_id uuid,
  index_value numeric,
  base_price numeric,
  sell_price numeric,
  sph_min numeric,
  sph_max numeric,
  cyl_min numeric,
  cyl_max numeric,
  add_min numeric,
  add_max numeric,
  is_active boolean,
  show_in_pricelist boolean,
  show_in_ws_pricelist boolean,
  show_on_website boolean,
  full_lab boolean,
  name text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.supplier_id,
    l.brand_id,
    l.material_id,
    l.mftype_id,
    l.lenstype_id,
    l.finishtype_id,
    l.index_value,
    -- Return 0 for base_price if viewer or customer
    CASE WHEN has_restricted_role(auth.uid()) THEN 0 ELSE l.base_price END AS base_price,
    l.sell_price,
    l.sph_min,
    l.sph_max,
    l.cyl_min,
    l.cyl_max,
    l.add_min,
    l.add_max,
    l.is_active,
    l.show_in_pricelist,
    l.show_in_ws_pricelist,
    l.show_on_website,
    l.full_lab,
    l.name,
    l.notes,
    l.created_at,
    l.updated_at
  FROM public.lenses l
  WHERE has_any_role(auth.uid())
$$;

-- Secure supplies fetch: strips base_price for viewer/customer
CREATE OR REPLACE FUNCTION public.get_supplies_safe()
RETURNS TABLE (
  id uuid,
  supplier_id uuid,
  brand_id uuid,
  base_price numeric,
  sell_price numeric,
  quantity_per_unit integer,
  is_active boolean,
  show_on_website boolean,
  show_in_pricelist boolean,
  bb_item boolean,
  duty_added boolean,
  vat_paid boolean,
  labour_added boolean,
  preferred boolean,
  stocked boolean,
  stk_wspl boolean,
  image_url text,
  notes text,
  bin text,
  detail text,
  currency text,
  name text,
  category text,
  description text,
  sku text,
  unit text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.supplier_id,
    s.brand_id,
    CASE WHEN has_restricted_role(auth.uid()) THEN 0 ELSE s.base_price END AS base_price,
    s.sell_price,
    s.quantity_per_unit,
    s.is_active,
    s.show_on_website,
    s.show_in_pricelist,
    s.bb_item,
    s.duty_added,
    s.vat_paid,
    s.labour_added,
    s.preferred,
    s.stocked,
    s.stk_wspl,
    s.image_url,
    s.notes,
    s.bin,
    s.detail,
    s.currency,
    s.name,
    s.category,
    s.description,
    s.sku,
    s.unit,
    s.created_at,
    s.updated_at
  FROM public.supplies s
  WHERE has_any_role(auth.uid())
$$;

-- Secure addons fetch: strips cost for viewer/customer
CREATE OR REPLACE FUNCTION public.get_addons_safe()
RETURNS TABLE (
  id uuid,
  supplier_id uuid,
  name text,
  sku text,
  category text,
  description text,
  price numeric,
  cost numeric,
  is_active boolean,
  is_auto boolean,
  auto_rule jsonb,
  show_on_website boolean,
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.supplier_id,
    a.name,
    a.sku,
    a.category,
    a.description,
    a.price,
    CASE WHEN has_restricted_role(auth.uid()) THEN 0 ELSE a.cost END AS cost,
    a.is_active,
    a.is_auto,
    a.auto_rule,
    a.show_on_website,
    a.sort_order,
    a.created_at,
    a.updated_at
  FROM public.addons a
  WHERE has_any_role(auth.uid())
$$;

-- Secure quote_lines fetch: strips cost columns for viewer/customer
CREATE OR REPLACE FUNCTION public.get_quote_lines_safe(p_quote_id uuid)
RETURNS TABLE (
  id uuid,
  quote_id uuid,
  product_id uuid,
  line_type text,
  sku text,
  item_name text,
  description_override text,
  qty numeric,
  unit_cost_landed_bbd numeric,
  unit_base_price_bbd numeric,
  unit_sell_price_bbd numeric,
  price_override boolean,
  override_reason text,
  override_note text,
  profit_status text,
  threshold_percent numeric,
  threshold_status text,
  gp_amount numeric,
  gp_percent numeric,
  group_key text,
  parent_line_id uuid,
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ql.id,
    ql.quote_id,
    ql.product_id,
    ql.line_type,
    ql.sku,
    ql.item_name,
    ql.description_override,
    ql.qty,
    CASE WHEN has_restricted_role(auth.uid()) THEN 0 ELSE ql.unit_cost_landed_bbd END AS unit_cost_landed_bbd,
    CASE WHEN has_restricted_role(auth.uid()) THEN 0 ELSE ql.unit_base_price_bbd END AS unit_base_price_bbd,
    ql.unit_sell_price_bbd,
    ql.price_override,
    ql.override_reason,
    ql.override_note,
    ql.profit_status,
    ql.threshold_percent,
    ql.threshold_status,
    CASE WHEN has_restricted_role(auth.uid()) THEN 0 ELSE ql.gp_amount END AS gp_amount,
    CASE WHEN has_restricted_role(auth.uid()) THEN 0 ELSE ql.gp_percent END AS gp_percent,
    ql.group_key,
    ql.parent_line_id,
    ql.sort_order,
    ql.created_at,
    ql.updated_at
  FROM public.quote_lines ql
  WHERE ql.quote_id = p_quote_id
    AND has_any_role(auth.uid())
$$;

-- ============================================================
-- Fix 3: supplies_public view - add RLS-equivalent grant
--         (it's a view, make it only accessible to authenticated users with roles)
-- ============================================================
-- Revoke public access and restrict to authenticated role
REVOKE ALL ON public.supplies_public FROM anon;
REVOKE ALL ON public.supplies_public FROM PUBLIC;
GRANT SELECT ON public.supplies_public TO authenticated;
