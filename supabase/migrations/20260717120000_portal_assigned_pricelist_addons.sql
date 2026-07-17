-- The portal "Assigned Pricelist" page shows the lens matrix via
-- portal_assigned_pricelist_matrix(), but the pricelist's add-ons, extras
-- and coatings live in pricelist_catalog_rows, which is staff-only under
-- RLS. Same bridge pattern: the version is resolved server-side from the
-- caller's own profile, no parameter to tamper with.

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
BEGIN
  SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.profiles p
  INNER JOIN public.customers c ON c.id = p.crm_customer_id
  WHERE p.user_id = auth.uid();

  IF v_pricelist_version_id IS NULL THEN
    RETURN;
  END IF;

  -- Row types mirror the admin RX live preview's add-on list
  -- (PricelistLivePreview: addon, treatment, supply for catalog_type rx).
  RETURN QUERY
  SELECT r.section, r.display_description, r.row_type, r.bbd_price, r.sort_order
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
