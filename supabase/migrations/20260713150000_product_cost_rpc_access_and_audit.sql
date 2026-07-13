-- Keep public product browsing on narrowly scoped RPCs. The base tables contain
-- landed/base cost data and must never be directly readable by anon or regular
-- authenticated clients.
CREATE OR REPLACE FUNCTION public.get_lenses_safe()
RETURNS TABLE (
  id uuid, supplier_id uuid, brand_id uuid, material_id uuid, mftype_id uuid,
  lenstype_id uuid, finishtype_id uuid, index_value numeric, base_price numeric,
  sell_price numeric, sph_min numeric, sph_max numeric, cyl_min numeric,
  cyl_max numeric, add_min numeric, add_max numeric, is_active boolean,
  show_in_pricelist boolean, show_in_ws_pricelist boolean, show_on_website boolean,
  full_lab boolean, name text, notes text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    l.id, l.supplier_id, l.brand_id, l.material_id, l.mftype_id, l.lenstype_id,
    l.finishtype_id, l.index_value,
    CASE WHEN public.has_edit_role(auth.uid()) THEN l.base_price ELSE NULL::numeric END,
    l.sell_price, l.sph_min, l.sph_max, l.cyl_min, l.cyl_max, l.add_min, l.add_max,
    l.is_active, l.show_in_pricelist, l.show_in_ws_pricelist, l.show_on_website,
    l.full_lab, l.name, l.notes, l.created_at, l.updated_at
  FROM public.lenses AS l
  WHERE public.has_edit_role(auth.uid())
    OR (l.is_active = true AND l.show_on_website = true);
$function$;

CREATE OR REPLACE FUNCTION public.get_supplies_safe()
RETURNS TABLE (
  id uuid, supplier_id uuid, brand_id uuid, base_price numeric, sell_price numeric,
  quantity_per_unit integer, is_active boolean, show_on_website boolean,
  show_in_pricelist boolean, bb_item boolean, duty_added boolean, vat_paid boolean,
  labour_added boolean, preferred boolean, stocked boolean, stk_wspl boolean,
  image_url text, notes text, bin text, detail text, currency text, name text,
  category text, description text, sku text, unit text, created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    s.id, s.supplier_id, s.brand_id,
    CASE WHEN public.has_edit_role(auth.uid()) THEN s.base_price ELSE NULL::numeric END,
    s.sell_price, s.quantity_per_unit, s.is_active, s.show_on_website,
    s.show_in_pricelist, s.bb_item, s.duty_added, s.vat_paid, s.labour_added,
    s.preferred, s.stocked, s.stk_wspl, s.image_url, s.notes, s.bin, s.detail,
    s.currency, s.name, s.category, s.description, s.sku, s.unit, s.created_at,
    s.updated_at
  FROM public.supplies AS s
  WHERE public.has_edit_role(auth.uid())
    OR (s.is_active = true AND s.show_on_website = true);
$function$;

CREATE OR REPLACE FUNCTION public.get_addons_safe()
RETURNS TABLE (
  id uuid, supplier_id uuid, name text, sku text, category text, description text,
  price numeric, cost numeric, is_active boolean, is_auto boolean, auto_rule jsonb,
  show_on_website boolean, sort_order integer, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    a.id, a.supplier_id, a.name, a.sku, a.category, a.description, a.price,
    CASE WHEN public.has_edit_role(auth.uid()) THEN a.cost ELSE NULL::numeric END,
    a.is_active, a.is_auto, a.auto_rule, a.show_on_website, a.sort_order,
    a.created_at, a.updated_at
  FROM public.addons AS a
  WHERE public.has_edit_role(auth.uid())
    OR (a.is_active = true AND a.show_on_website = true);
$function$;

REVOKE ALL ON FUNCTION public.get_lenses_safe() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_supplies_safe() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_addons_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lenses_safe() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplies_safe() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_addons_safe() TO anon, authenticated;

-- Service-role audit for live deployments. It reports any direct table grant,
-- unsafe SELECT policy, or missing safe-RPC grant on the protected product data.
CREATE OR REPLACE FUNCTION public.audit_product_cost_rls()
RETURNS TABLE (object_type text, object_name text, issue text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  WITH protected_tables(table_name) AS (
    VALUES ('addons'::text), ('lenses'::text), ('supplies'::text)
  ), safe_functions(function_name) AS (
    VALUES ('get_addons_safe'::text), ('get_lenses_safe'::text), ('get_supplies_safe'::text)
  )
  SELECT
    'table_grant',
    format('public.%I', table_name),
    'anon or authenticated has direct SELECT on a cost-bearing table'
  FROM protected_tables
  WHERE has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
     OR has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')

  UNION ALL

  SELECT
    'policy',
    format('public.%I (%s)', c.relname, p.polname),
    'SELECT policy is reachable by anon/authenticated without has_edit_role()'
  FROM pg_policy AS p
  JOIN pg_class AS c ON c.oid = p.polrelid
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('addons', 'lenses', 'supplies')
    AND p.polcmd IN ('r', '*')
    AND (
      0 = ANY(p.polroles)
      OR EXISTS (
        SELECT 1
        FROM unnest(p.polroles) AS assigned_role(role_oid)
        JOIN pg_roles AS role ON role.oid = assigned_role.role_oid
        WHERE role.rolname IN ('anon', 'authenticated')
      )
    )
    AND coalesce(pg_get_expr(p.polqual, p.polrelid), '') NOT LIKE '%has_edit_role%'

  UNION ALL

  SELECT
    'function_grant',
    format('public.%I()', function_name),
    'safe RPC is not executable by both anon and authenticated'
  FROM safe_functions
  WHERE NOT has_function_privilege('anon', format('public.%I()', function_name), 'EXECUTE')
     OR NOT has_function_privilege('authenticated', format('public.%I()', function_name), 'EXECUTE');
$function$;

REVOKE ALL ON FUNCTION public.audit_product_cost_rls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_product_cost_rls() TO service_role;

NOTIFY pgrst, 'reload schema';
