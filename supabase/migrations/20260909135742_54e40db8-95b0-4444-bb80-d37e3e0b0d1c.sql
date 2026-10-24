CREATE OR REPLACE FUNCTION public.portal_customer_stock_prices(p_customer_id integer)
RETURNS TABLE(item_type text, item_id uuid, bbd_price numeric, price_source text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assigned integer;
  v_retail integer;
BEGIN
  IF NOT (
    public.has_edit_role(auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.user_id = auth.uid() AND pr.crm_customer_id = p_customer_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to read prices for this customer.' USING ERRCODE = '42501';
  END IF;

  SELECT assigned_pricelist_id INTO v_assigned FROM public.customers WHERE id = p_customer_id;
  SELECT c.assigned_pricelist_id INTO v_retail
  FROM public.customers c WHERE lower(btrim(c.name)) = 'retail' LIMIT 1;

  RETURN QUERY
  WITH assigned AS (
    SELECT r.row_type AS item_type, r.item_id, max(r.bbd_price) AS bbd_price
    FROM public.pricelist_catalog_rows r
    WHERE v_assigned IS NOT NULL
      AND r.pricelist_version_id = v_assigned
      AND r.catalog_type = 'stock'
      AND r.row_type IN ('lens','supply','addon')
      AND r.item_id IS NOT NULL
      AND r.bbd_price > 0
    GROUP BY 1, 2
  ), retail AS (
    SELECT r.row_type AS item_type, r.item_id, max(r.bbd_price) AS bbd_price
    FROM public.pricelist_catalog_rows r
    WHERE v_retail IS NOT NULL
      AND r.pricelist_version_id = v_retail
      AND r.catalog_type = 'stock'
      AND r.row_type IN ('lens','supply','addon')
      AND r.item_id IS NOT NULL
      AND r.bbd_price > 0
    GROUP BY 1, 2
  )
  SELECT a.item_type, a.item_id, a.bbd_price, 'assigned_pricelist'::text FROM assigned a
  UNION ALL
  SELECT rt.item_type, rt.item_id, rt.bbd_price, 'retail_pricelist'::text
  FROM retail rt
  WHERE NOT EXISTS (
    SELECT 1 FROM assigned a2 WHERE a2.item_type = rt.item_type AND a2.item_id = rt.item_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_customer_stock_prices(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_customer_stock_prices(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_customer_stock_prices(integer) TO service_role;