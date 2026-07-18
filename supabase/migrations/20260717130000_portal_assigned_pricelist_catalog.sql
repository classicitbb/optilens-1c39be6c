-- Portal pricelist tabs (Stock Lenses, Supplies) need the assigned
-- version's catalog rows for catalog types other than rx. Same bridge
-- pattern as portal_assigned_pricelist_matrix()/_addons(): the version is
-- resolved server-side from the caller's own profile. The catalog type
-- parameter only selects which catalog of their own pricelist to read,
-- and is validated against the known types.

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
  SELECT r.section, r.display_description, r.row_type, r.bbd_price, r.sort_order
  FROM public.pricelist_catalog_rows r
  WHERE r.pricelist_version_id = v_pricelist_version_id
    AND r.catalog_type = p_catalog_type
    AND r.bbd_price IS NOT NULL
  ORDER BY r.sort_order, r.display_description;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_assigned_pricelist_catalog(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_assigned_pricelist_catalog(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
