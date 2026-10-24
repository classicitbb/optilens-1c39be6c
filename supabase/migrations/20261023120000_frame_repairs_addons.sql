-- Frame repairs (Innovations MiscItems group "2 Frame Repairs") as addons.
--
-- Repairs are NOT sold on the website but staff can add them to a stock order.
-- Until now the stock-order catalog gated addons on show_on_website, so the two
-- could not be separated. addons.stock_orderable is the staff-only switch:
--   * get_stock_order_catalog lists a stock_orderable addon for every account
--     (no pricelist row required) once it has a catalog price > 0;
--   * resolve_stock_order_price and _price_stock_order_items accept it for
--     staff and fall back to addons.price when no pricelist row exists.
-- It never affects get_addons_safe, so the public store is unchanged.
--
-- Also fixes resolve_stock_order_price, which read addons.sell_price /
-- addons.base_price. Those columns exist on lenses/supplies but addons has
-- price / cost, so any addon reaching the catalog raised "column does not exist".

ALTER TABLE public.addons ADD COLUMN IF NOT EXISTS stock_orderable boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_stock_order_catalog(p_account_id integer)
 RETURNS TABLE(product_type text, product_id uuid, name text, category text, sku text, unit_price numeric, has_variants boolean, price_source text, source_trail jsonb, unit_cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_is_retail boolean;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN RAISE EXCEPTION 'Not authorized to read the stock-order catalog.'; END IF;
  SELECT lower(btrim(c.name)) = 'retail' INTO v_is_retail FROM public.customers c WHERE c.id = p_account_id;
  IF v_is_retail IS NULL THEN RAISE EXCEPTION 'The selected account no longer exists.'; END IF;
  RETURN QUERY
  WITH products AS (
    SELECT 'lens'::text type, l.id, l.name, 'Lens'::text category, NULL::text sku, false AS staff_only FROM public.lenses l WHERE l.show_on_website AND l.is_active
    UNION ALL SELECT 'supply', s.id, s.name, s.category, s.sku, false FROM public.supplies s WHERE s.show_on_website AND s.is_active
    UNION ALL SELECT 'addon', a.id, a.name, coalesce(a.category, 'Service'), a.sku,
      (a.stock_orderable AND NOT a.show_on_website)
      FROM public.addons a WHERE (a.show_on_website OR (a.stock_orderable AND a.price > 0)) AND a.is_active
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
  WHERE v_is_retail OR p.staff_only OR EXISTS (SELECT 1 FROM assigned a WHERE a.row_type = p.type AND a.item_id = p.id);
END;
$function$;

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
    SELECT price, cost INTO v_catalog_price, v_cost FROM public.addons
    WHERE id = p_product_id AND (show_on_website OR (stock_orderable AND price > 0)) AND is_active;
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

  IF p_product_type = 'lens' THEN v_price := round(v_price / 2, 2); END IF;

  RETURN QUERY SELECT v_price, v_source,
    jsonb_build_array('assigned_pricelist', 'retail_pricelist', 'catalog', CASE WHEN v_source = 'manual' THEN 'manual' END),
    CASE WHEN public.has_edit_role(auth.uid()) THEN coalesce(v_cost, 0) ELSE NULL END;
END;
$function$;

CREATE OR REPLACE FUNCTION public._price_stock_order_items(p_pricelist_version_id integer, p_items jsonb)
 RETURNS TABLE(priced_items jsonb, order_total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item jsonb;
  v_product_type text;
  v_product_id uuid;
  v_variant_id uuid;
  v_side text;
  v_quantity integer;
  v_name text;
  v_published boolean;
  v_product_sku text;
  v_variant record;
  v_sku text;
  v_source text;
  v_part_rx text;
  v_description text;
  v_unit_price numeric;
  v_lens_state text;
  v_priced_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'A stock order needs at least one item.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Drafts staged before this migration keyed items on an Innova power row.
    -- Those can't be repriced against the website catalog, and silently
    -- guessing a product would ship the wrong thing.
    IF v_item ? 'power_row_id' AND NOT (v_item ? 'product_id') THEN
      RAISE EXCEPTION 'This draft was built with the previous stock catalog. Rebuild it from the website catalog before releasing.';
    END IF;

    v_product_type := v_item ->> 'product_type';
    v_product_id   := NULLIF(v_item ->> 'product_id', '')::uuid;
    v_variant_id   := NULLIF(v_item ->> 'variant_id', '')::uuid;
    v_side         := COALESCE(NULLIF(v_item ->> 'side', ''), 'either');
    v_quantity     := COALESCE((v_item ->> 'quantity')::int, 1);

    IF v_product_type NOT IN ('lens', 'supply', 'addon') OR v_product_id IS NULL THEN
      RAISE EXCEPTION 'Each stock order item needs a website product type and id.';
    END IF;
    IF v_quantity < 1 OR v_quantity > 99 THEN
      RAISE EXCEPTION 'Item quantity must be between 1 and 99.';
    END IF;

    -- Website publication is the availability rule for this form; staff-only
    -- addons (stock_orderable, e.g. frame repairs) are the one exception.
    IF v_product_type = 'lens' THEN
      SELECT l.name, l.show_on_website AND l.is_active, NULL::text
        INTO v_name, v_published, v_product_sku
      FROM public.lenses l WHERE l.id = v_product_id;
      v_source := 'FLENS';
      v_part_rx := 'Y';
    ELSIF v_product_type = 'supply' THEN
      SELECT s.name, s.show_on_website AND s.is_active, s.sku
        INTO v_name, v_published, v_product_sku
      FROM public.supplies s WHERE s.id = v_product_id;
      v_source := 'MISC';
      v_part_rx := 'N';
    ELSE
      SELECT a.name,
             a.is_active AND (a.show_on_website
               OR (a.stock_orderable AND a.price > 0 AND public.has_edit_role(auth.uid()))),
             a.sku
        INTO v_name, v_published, v_product_sku
      FROM public.addons a WHERE a.id = v_product_id;
      -- An add-on's own name is the only signal for which Hashref item
      -- category it belongs to; anything unrecognised stays MISC.
      v_source := CASE
        WHEN v_name ~* 'tint|colou?r'                       THEN 'TINT'
        WHEN v_name ~* 'coat|anti[- ]?reflect|\mar\M|mirror' THEN 'COAT'
        WHEN v_name ~* 'edg(e|ing)|glaz'                    THEN 'EDGING'
        ELSE 'MISC'
      END;
      v_part_rx := 'Y';
    END IF;

    IF v_name IS NULL THEN
      RAISE EXCEPTION 'Unknown % product: %', v_product_type, v_product_id;
    END IF;
    IF NOT COALESCE(v_published, false) THEN
      RAISE EXCEPTION '"%" is not published on the website and cannot be ordered here.', v_name;
    END IF;

    SELECT MAX(r.bbd_price) INTO v_unit_price
    FROM public.pricelist_catalog_rows r
    WHERE r.pricelist_version_id = p_pricelist_version_id
      AND r.catalog_type = 'stock'
      AND r.row_type = v_product_type
      AND r.item_id = v_product_id
      AND r.bbd_price IS NOT NULL;

    -- Staff-only addons carry a flat catalog price rather than a pricelist row.
    IF v_unit_price IS NULL AND v_product_type = 'addon' AND public.has_edit_role(auth.uid()) THEN
      SELECT a.price INTO v_unit_price
      FROM public.addons a
      WHERE a.id = v_product_id AND a.stock_orderable AND NOT a.show_on_website AND a.price > 0;
    END IF;

    IF v_product_type = 'lens' AND v_unit_price IS NOT NULL THEN v_unit_price := round(v_unit_price / 2, 2); END IF;

    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION '"%" is not priced on this account''s pricelist.', v_name;
    END IF;

    v_description := v_name;
    v_sku := v_product_sku;

    IF v_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM public.store_product_variants pv
      WHERE pv.id = v_variant_id
        AND pv.product_type = v_product_type
        AND pv.product_id = v_product_id
        AND pv.is_active;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'That variant of "%" is no longer available on the website.', v_name;
      END IF;

      -- A chiral variant carries one Innova code per eye; a symmetric one
      -- carries a single opc_code that serves both.
      v_sku := COALESCE(
        NULLIF(v_variant.metadata -> 'opc_by_eye' ->> v_side, ''),
        NULLIF(v_variant.opc_code, ''),
        NULLIF(v_variant.sku, ''),
        v_product_sku
      );
      v_description := v_name || ' ' || COALESCE(v_variant.title, '');
      IF v_side IN ('right', 'left') THEN
        v_description := v_description || ' / ' || v_side;
      END IF;

      IF v_product_type = 'lens' THEN
        SELECT sl.lens_state INTO v_lens_state
        FROM public.innovations_store_lens_power_rows pr
        JOIN public.innovations_store_lenses sl ON sl.innovations_lens_id = pr.innovations_lens_id
        WHERE pr.id = ((v_variant.metadata -> 'innovations_power_row_ids' ->> 0))::uuid;
        -- A website stock lens is a finished, stocked item unless Lens Local
        -- says the underlying family is semi-finished. Semi-finished blanks
        -- are normally the Rx path, so FLENS stays the default.
        IF v_lens_state = 'semi_finished' THEN v_source := 'SFLENS'; END IF;
      END IF;
    END IF;

    IF NULLIF(BTRIM(COALESCE(v_sku, '')), '') IS NULL THEN
      RAISE EXCEPTION '"%" has no Innova SKU to order with. Add its OPC code to the website variant first.', v_description;
    END IF;

    v_priced_items := v_priced_items || jsonb_build_object(
      'product_type', v_product_type,
      'product_id',   v_product_id,
      'variant_id',   v_variant_id,
      'side',         v_side,
      'sku',          v_sku,
      'source',       v_source,
      'description',  v_description,
      'quantity',     v_quantity,
      'comment',      COALESCE(v_item ->> 'customer_ref', ''),
      'part_rx',      v_part_rx,
      'item_side',    'NONE',
      'unit_price',   v_unit_price
    );
    v_total := v_total + v_unit_price * v_quantity;
  END LOOP;

  RETURN QUERY SELECT v_priced_items, v_total;
END;
$function$;

-- Innovations MiscItems group "2 Frame Repairs": the 25 active items (the three
-- inactive ones — Drilled Rimless, Grooved Rimless, MyKita Clean and Straighten —
-- are left out). Cost is the Innovations Cost; price is the office sell price.
-- Price 0 = not priced yet: the item stays out of the stock-order catalog until
-- a price is set. Idempotent on (category, sku); a re-run never touches an
-- existing row, so prices edited later are kept.
INSERT INTO public.addons (name, sku, category, description, cost, price, is_active, show_on_website, stock_orderable)
SELECT v.name, v.sku, 'repairs', '', v.cost, v.price, true, false, true
FROM (VALUES
  ('BUSHING DBL PRESS MT',           '4508027',   23.50,   0),
  ('Cleaning / Straightening',       'FRCLSTRAIG',10.00,   0),
  ('Frame Model',                    'FRAM',       0.00,   0),
  ('Hinge Repair / Drill',           'DRILLOUT',  20.00,  60),
  ('Nose Pads Special Silicon',      'NOPA-SP',   30.00,  30),
  ('Nose Pads Standard Poly',        'NOPA-ST',   15.00,  15),
  ('NOSEPAD SC GOLD 1.0X4.2 POINT',  '4110416',   14.50,   0),
  ('NOSEPADS SEMI-SOFT VINYL 12MM',  '5612610',   27.00,   0),
  ('NOSEPADS SEMI-SOFT VINYL 14MM',  '5614610',   27.00,   0),
  ('PLASTIC FRAME RESTORATION',      'PLFRREP',    7.50,  50),
  ('Repair Temple Tips',             'TETI',      40.00,  30),
  ('Replace Airlock Plugs',          'REAIPL',     0.30,  20),
  ('Replace Gold Screws/Nut/Bolt',   'REGS',       5.00,  10),
  ('Replace Mount Plugs',            'REMOPL',    10.00,  20),
  ('Replace Nylon',                  'E',         10.00,  20),
  ('Replace Silver Screws/Nut/Bolt', 'RESC',       5.00,   7),
  ('Restring Nylon',                 'RE-STNY',    0.00,  20),
  ('SELF-TAP 1.2X11.4 GOLD SM HD',   '4112112',   32.95,   0),
  ('SELF-TAP 1.3X11.4 GOLD SM HD',   '4113112',   32.95,   0),
  ('SELF-TAP 1.4X11.4 GOLD SM HD',   '4114112',   32.95,   0),
  ('SHORTEN TEMPLES',                'SHRTNTEMP',  0.00,   0),
  ('Solder Repairs - Eyewire',       'SORE',     110.00, 150),
  ('Solder Repairs - Temple/Hinge',  'SOREP',      0.00,  35),
  ('Solder Repairs - Titanium',      'TITREP',   180.00, 150),
  ('Spring Hinge Repair',            'HIRE/DR',   60.00,  60)
) AS v(name, sku, cost, price)
WHERE NOT EXISTS (
  SELECT 1 FROM public.addons a WHERE a.category = 'repairs' AND a.sku = v.sku
);

NOTIFY pgrst, 'reload schema';
