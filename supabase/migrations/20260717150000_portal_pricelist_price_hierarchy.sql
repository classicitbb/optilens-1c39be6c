-- The portal pricelist page (AssignedPricelistsSection.tsx) was reading raw
-- matrix_allocations.allocated_price_bbd / pricelist_catalog_rows.bbd_price
-- directly — the same base values the admin matrix editor stores, but NOT
-- the same price the admin's own "live preview" shows customers, because it
-- skipped the price hierarchy: a line-level override (pricelist_line_overrides,
-- the amber-highlighted cells in the matrix editor) replaces the base price
-- entirely when one exists; otherwise base * master markup/discount * child
-- section markup/discount applies (see usePriceHierarchy.ts / calcFinalPrice,
-- mirrored here in SQL since the portal can't read pricelist_versions /
-- pricelist_child_sections / pricelist_line_overrides directly under RLS).
--
-- Recreates all three portal bridge functions with this hierarchy applied
-- server-side so the customer-facing price always matches the admin preview.

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_matrix()
RETURNS TABLE (
  category text,
  material_index text,
  treatment_type text,
  allocated_price_bbd numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_master_markup numeric;
  v_master_discount numeric;
  v_child_section_id integer;
  v_child_markup numeric;
  v_child_discount numeric;
BEGIN
  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(pv.master_markup_percent, 0), COALESCE(pv.master_discount_percent, 0)
  INTO v_master_markup, v_master_discount
  FROM public.pricelist_versions pv
  WHERE pv.id = v_pricelist_version_id;

  SELECT pcs.id, COALESCE(pcs.child_markup_percent, 0), COALESCE(pcs.child_discount_percent, 0)
  INTO v_child_section_id, v_child_markup, v_child_discount
  FROM public.pricelist_child_sections pcs
  WHERE pcs.pricelist_version_id = v_pricelist_version_id AND pcs.section_type = 'RX Lens Prices'
  LIMIT 1;

  RETURN QUERY
  SELECT
    ma.category,
    ma.material_index,
    ma.treatment_type,
    ROUND(
      COALESCE(
        plo.overridden_price_bbd,
        ma.allocated_price_bbd
          * (1 + COALESCE(v_master_markup, 0) / 100) * (1 - COALESCE(v_master_discount, 0) / 100)
          * (1 + COALESCE(v_child_markup, 0) / 100) * (1 - COALESCE(v_child_discount, 0) / 100)
      ),
      2
    ) AS allocated_price_bbd
  FROM public.matrix_allocations ma
  LEFT JOIN public.pricelist_line_overrides plo
    ON plo.reference_type = 'matrix_allocation'
   AND plo.reference_id = ma.id::text
   AND plo.child_section_id = v_child_section_id
  WHERE ma.pricelist_version_id = v_pricelist_version_id
    AND ma.is_active IS NOT FALSE
    AND ma.allocated_price_bbd IS NOT NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_matrix() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_matrix() TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_addons()
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_master_markup numeric;
  v_master_discount numeric;
  v_child_section_id integer;
  v_child_markup numeric;
  v_child_discount numeric;
BEGIN
  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(pv.master_markup_percent, 0), COALESCE(pv.master_discount_percent, 0)
  INTO v_master_markup, v_master_discount
  FROM public.pricelist_versions pv
  WHERE pv.id = v_pricelist_version_id;

  SELECT pcs.id, COALESCE(pcs.child_markup_percent, 0), COALESCE(pcs.child_discount_percent, 0)
  INTO v_child_section_id, v_child_markup, v_child_discount
  FROM public.pricelist_child_sections pcs
  WHERE pcs.pricelist_version_id = v_pricelist_version_id AND pcs.section_type = 'RX Lens Prices'
  LIMIT 1;

  RETURN QUERY
  SELECT
    r.section,
    r.display_description,
    r.row_type,
    ROUND(
      COALESCE(
        plo.overridden_price_bbd,
        r.bbd_price
          * (1 + COALESCE(v_master_markup, 0) / 100) * (1 - COALESCE(v_master_discount, 0) / 100)
          * (1 + COALESCE(v_child_markup, 0) / 100) * (1 - COALESCE(v_child_discount, 0) / 100)
      ),
      2
    ) AS bbd_price,
    r.sort_order
  FROM public.pricelist_catalog_rows r
  LEFT JOIN public.pricelist_line_overrides plo
    ON plo.reference_type = r.row_type
   AND plo.reference_id = r.item_id::text
   AND plo.child_section_id = v_child_section_id
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = 'rx'
    AND r.row_type IN ('addon', 'treatment', 'supply')
    AND r.bbd_price IS NOT NULL
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_addons() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_addons() TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_assigned_pricelist_catalog(p_catalog_type text)
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_master_markup numeric;
  v_master_discount numeric;
  v_section_type text;
  v_child_section_id integer;
  v_child_markup numeric;
  v_child_discount numeric;
BEGIN
  IF p_catalog_type NOT IN ('rx', 'stock', 'buysell') THEN
    RETURN;
  END IF;

  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(pv.master_markup_percent, 0), COALESCE(pv.master_discount_percent, 0)
  INTO v_master_markup, v_master_discount
  FROM public.pricelist_versions pv
  WHERE pv.id = v_pricelist_version_id;

  v_section_type := CASE p_catalog_type
    WHEN 'rx' THEN 'RX Lens Prices'
    WHEN 'stock' THEN 'Stock Lens Prices'
    WHEN 'buysell' THEN 'Supplies Prices'
  END;

  SELECT pcs.id, COALESCE(pcs.child_markup_percent, 0), COALESCE(pcs.child_discount_percent, 0)
  INTO v_child_section_id, v_child_markup, v_child_discount
  FROM public.pricelist_child_sections pcs
  WHERE pcs.pricelist_version_id = v_pricelist_version_id AND pcs.section_type = v_section_type
  LIMIT 1;

  RETURN QUERY
  SELECT
    r.section,
    r.display_description,
    r.row_type,
    ROUND(
      COALESCE(
        plo.overridden_price_bbd,
        r.bbd_price
          * (1 + COALESCE(v_master_markup, 0) / 100) * (1 - COALESCE(v_master_discount, 0) / 100)
          * (1 + COALESCE(v_child_markup, 0) / 100) * (1 - COALESCE(v_child_discount, 0) / 100)
      ),
      2
    ) AS bbd_price,
    r.sort_order
  FROM public.pricelist_catalog_rows r
  LEFT JOIN public.pricelist_line_overrides plo
    ON plo.reference_type = r.row_type
   AND plo.reference_id = r.item_id::text
   AND plo.child_section_id = v_child_section_id
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = p_catalog_type
    AND r.bbd_price IS NOT NULL
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_catalog(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_catalog(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
