-- "Add to Cart" on a Stock Lenses / Supplies pricelist row needs to resolve
-- to a real sellable product. pricelist_catalog_rows.item_id already joins
-- cleanly to lenses/supplies/addons (verified live: 100% resolve, zero
-- orphans across all catalog_types) but wasn't exposed to the portal yet.
-- Frontend bridges item_id (uuid) -> cart_items.product_id (int4) via the
-- existing getStableStoreProductCartId() hash in useStoreProducts.ts — no
-- new resolution table needed.

DROP FUNCTION IF EXISTS public.portal_assigned_pricelist_catalog(text);
CREATE FUNCTION public.portal_assigned_pricelist_catalog(p_catalog_type text)
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer,
  row_key text,
  catalog_type text,
  item_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
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

  RETURN QUERY
  SELECT r.section, r.display_description, r.row_type, r.bbd_price, r.sort_order, r.row_key, r.catalog_type, r.item_id
  FROM public.pricelist_catalog_rows r
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = p_catalog_type
    AND r.bbd_price IS NOT NULL
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_catalog(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_catalog(text) TO authenticated;

DROP FUNCTION IF EXISTS public.portal_assigned_pricelist_addons();
CREATE FUNCTION public.portal_assigned_pricelist_addons()
RETURNS TABLE (
  section text,
  display_description text,
  row_type text,
  bbd_price numeric,
  sort_order integer,
  row_key text,
  catalog_type text,
  item_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
BEGIN
  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT r.section, r.display_description, r.row_type, r.bbd_price, r.sort_order, r.row_key, r.catalog_type, r.item_id
  FROM public.pricelist_catalog_rows r
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = 'rx'
    AND r.row_type IN ('addon', 'treatment', 'supply')
    AND r.bbd_price IS NOT NULL
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_addons() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_addons() TO authenticated;

NOTIFY pgrst, 'reload schema';
