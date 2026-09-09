CREATE OR REPLACE FUNCTION public.resolve_stock_order_price(p_account_id integer, p_product_type text, p_product_id uuid, p_manual_price numeric DEFAULT NULL::numeric, p_manual_reason text DEFAULT NULL::text)
 RETURNS TABLE(unit_price numeric, price_source text, source_trail jsonb, unit_cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account record;
  v_retail record;
  v_catalog_price numeric;
  v_cost numeric;
  v_price numeric;
  v_source text;
  v_retail_matches integer;
  v_types text[];
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editing staff can resolve stock-order prices.' USING ERRCODE = '42501';
  END IF;
  IF p_product_type NOT IN ('lens', 'supply', 'addon') OR p_product_id IS NULL THEN
    RAISE EXCEPTION 'A valid website product is required.';
  END IF;

  -- Supplies and add-ons are priced on the Buy/Sell tab of a pricelist; lenses
  -- on the stock (WSPL) tab. Accept either bucket for the non-lens types so a
  -- priced supply is orderable without duplicating the row.
  v_types := CASE WHEN p_product_type = 'lens' THEN ARRAY['stock'] ELSE ARRAY['stock','buysell'] END;

  SELECT id, name, assigned_pricelist_id INTO v_account
  FROM public.customers WHERE id = p_account_id;
  IF NOT FOUND OR v_account.assigned_pricelist_id IS NULL THEN
    RAISE EXCEPTION 'The selected account has no assigned pricelist.';
  END IF;

  SELECT count(*) INTO v_retail_matches
  FROM public.customers WHERE lower(btrim(name)) = 'retail';
  IF v_retail_matches <> 1 THEN
    RAISE EXCEPTION 'Stock pricing requires exactly one customer named Retail; found %.', v_retail_matches;
  END IF;
  SELECT id, assigned_pricelist_id INTO v_retail
  FROM public.customers WHERE lower(btrim(name)) = 'retail';
  IF v_retail.assigned_pricelist_id IS NULL THEN
    RAISE EXCEPTION 'The Retail account has no assigned pricelist.';
  END IF;

  IF p_product_type = 'lens' THEN
    SELECT sell_price, base_price INTO v_catalog_price, v_cost FROM public.lenses WHERE id = p_product_id AND show_on_website AND is_active;
  ELSIF p_product_type = 'supply' THEN
    SELECT sell_price, base_price INTO v_catalog_price, v_cost FROM public.supplies WHERE id = p_product_id AND show_on_website AND is_active;
  ELSE
    SELECT sell_price, base_price INTO v_catalog_price, v_cost FROM public.addons WHERE id = p_product_id AND show_on_website AND is_active;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This product is no longer published for sale.';
  END IF;

  SELECT max(r.bbd_price) INTO v_price
  FROM public.pricelist_catalog_rows r
  WHERE r.pricelist_version_id = v_account.assigned_pricelist_id
    AND r.catalog_type = ANY(v_types) AND r.row_type = p_product_type
    AND r.item_id = p_product_id AND r.bbd_price > 0;
  IF v_price > 0 THEN v_source := 'assigned_pricelist'; END IF;

  IF v_price IS NULL OR v_price <= 0 THEN
    SELECT max(r.bbd_price) INTO v_price
    FROM public.pricelist_catalog_rows r
    WHERE r.pricelist_version_id = v_retail.assigned_pricelist_id
      AND r.catalog_type = ANY(v_types) AND r.row_type = p_product_type
      AND r.item_id = p_product_id AND r.bbd_price > 0;
    IF v_price > 0 THEN v_source := 'retail_pricelist'; END IF;
  END IF;
  IF v_price IS NULL OR v_price <= 0 THEN
    v_price := v_catalog_price;
    IF v_price > 0 THEN v_source := 'catalog'; END IF;
  END IF;
  IF v_price IS NULL OR v_price <= 0 THEN
    IF p_manual_price IS NULL OR p_manual_price <= 0 OR nullif(btrim(coalesce(p_manual_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'No non-zero price exists. Enter a manual price and reason, or repair the account, Retail, or catalog price.';
    END IF;
    v_price := p_manual_price;
    v_source := 'manual';
  END IF;

  RETURN QUERY SELECT v_price, v_source,
    jsonb_build_array('assigned_pricelist', 'retail_pricelist', 'catalog', CASE WHEN v_source = 'manual' THEN 'manual' END),
    CASE WHEN public.has_edit_role(auth.uid()) THEN coalesce(v_cost, 0) ELSE NULL END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_stock_order_catalog(p_account_id integer)
 RETURNS TABLE(product_type text, product_id uuid, name text, category text, sku text, unit_price numeric, has_variants boolean, price_source text, source_trail jsonb, unit_cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_is_retail boolean;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN RAISE EXCEPTION 'Not authorized to read the stock-order catalog.'; END IF;
  SELECT lower(btrim(name)) = 'retail' INTO v_is_retail FROM public.customers WHERE id = p_account_id;
  IF v_is_retail IS NULL THEN RAISE EXCEPTION 'The selected account no longer exists.'; END IF;
  RETURN QUERY
  WITH products AS (
    SELECT 'lens'::text type, l.id, l.name, 'Lens'::text category, NULL::text sku FROM public.lenses l WHERE l.show_on_website AND l.is_active
    UNION ALL SELECT 'supply', s.id, s.name, s.category, s.sku FROM public.supplies s WHERE s.show_on_website AND s.is_active
    UNION ALL SELECT 'addon', a.id, a.name, coalesce(a.category, 'Service'), a.sku FROM public.addons a WHERE a.show_on_website AND a.is_active
  ), assigned AS (
    SELECT DISTINCT r.row_type, r.item_id FROM public.pricelist_catalog_rows r JOIN public.customers c ON c.id = p_account_id
    WHERE r.pricelist_version_id = c.assigned_pricelist_id
      AND r.row_type IN ('lens','supply','addon') AND r.item_id IS NOT NULL AND r.bbd_price > 0
      AND (r.catalog_type = 'stock' OR (r.catalog_type = 'buysell' AND r.row_type IN ('supply','addon')))
  )
  SELECT p.type, p.id, p.name, p.category, p.sku, resolved.unit_price,
    EXISTS (SELECT 1 FROM public.store_product_variants v WHERE v.product_type = p.type AND v.product_id = p.id AND v.is_active),
    resolved.price_source, resolved.source_trail, resolved.unit_cost
  FROM products p
  JOIN LATERAL public.resolve_stock_order_price(p_account_id, p.type, p.id, NULL, NULL) resolved ON true
  WHERE v_is_retail OR EXISTS (SELECT 1 FROM assigned a WHERE a.row_type = p.type AND a.item_id = p.id);
END;
$function$;
