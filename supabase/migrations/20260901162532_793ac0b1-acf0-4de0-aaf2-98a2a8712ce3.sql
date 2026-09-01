CREATE OR REPLACE FUNCTION public.portal_rx_pricing_structure(p_customer_id integer DEFAULT NULL::integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_result jsonb;
BEGIN
  IF p_customer_id IS NOT NULL THEN
    IF NOT public.can_access_portal_account(p_customer_id) THEN
      RETURN NULL;
    END IF;
    SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
    FROM public.customers c
    WHERE c.id = p_customer_id;
  ELSE
    IF NOT public.can_access_customer_pricing(auth.uid()) THEN
      RETURN NULL;
    END IF;
    SELECT c.assigned_pricelist_id INTO v_pricelist_version_id
    FROM public.profiles p
    INNER JOIN public.customers c ON c.id = p.crm_customer_id
    WHERE p.user_id = auth.uid();
  END IF;

  IF v_pricelist_version_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'groupings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', g.id, 'key', g.key, 'default_name', g.default_name,
        'sort_order', g.sort_order, 'is_active', g.is_active
      ) ORDER BY g.sort_order, g.id)
      FROM public.rx_price_groupings g
      WHERE g.is_active
    ), '[]'::jsonb),
    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'grouping_id', c.grouping_id, 'key', c.key,
        'default_name', c.default_name, 'sort_order', c.sort_order, 'is_active', c.is_active
      ) ORDER BY c.sort_order, c.id)
      FROM public.rx_price_categories c
      WHERE c.is_active
    ), '[]'::jsonb),
    'grouping_versions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'grouping_id', gv.grouping_id, 'display_name', gv.display_name,
        'sort_order', gv.sort_order, 'is_enabled', gv.is_enabled
      ))
      FROM public.rx_price_grouping_versions gv
      WHERE gv.pricelist_version_id = v_pricelist_version_id
    ), '[]'::jsonb),
    'category_versions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'category_id', cv.category_id, 'display_name', cv.display_name,
        'sort_order', cv.sort_order, 'is_enabled', cv.is_enabled
      ))
      FROM public.rx_price_category_versions cv
      WHERE cv.pricelist_version_id = v_pricelist_version_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_rx_pricing_structure(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_rx_pricing_structure(integer) TO authenticated;