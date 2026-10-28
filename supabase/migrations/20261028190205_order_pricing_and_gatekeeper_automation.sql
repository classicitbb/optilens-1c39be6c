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
  v_price_pending boolean;
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
      AND (r.catalog_type = 'stock' OR (r.catalog_type = 'buysell' AND v_product_type IN ('supply','addon')))
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

    v_price_pending := v_unit_price IS NULL;
    -- Zero is only the known-price subtotal; price_pending distinguishes an unquoted item.
    v_unit_price := COALESCE(v_unit_price, 0);

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
      'comment',      concat_ws(' / ', NULLIF(v_item ->> 'customer_ref', ''), CASE WHEN v_price_pending THEN 'PRICE TO BE CONFIRMED - DO NOT SHIP UNTIL ALL CHARGES ARE PAID' END),
      'price_pending', v_price_pending,
      'part_rx',      v_part_rx,
      'item_side',    'NONE',
      'unit_price',   v_unit_price
    );
    v_total := v_total + v_unit_price * v_quantity;
  END LOOP;

  RETURN QUERY SELECT v_priced_items, v_total;
END;
$function$;


CREATE OR REPLACE FUNCTION public.release_stock_order_submission(p_id uuid, p_dispatch_provider text DEFAULT 'gatekeeper'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account_id integer;
  v_raw_items jsonb;
  v_pricelist_version_id integer;
  v_priced jsonb;
  v_total numeric;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can release stock orders.';
  END IF;
  IF p_dispatch_provider NOT IN ('innovations', 'gatekeeper') THEN
    RAISE EXCEPTION 'Stock orders are released through OptiLens or Gatekeeper.';
  END IF;

  SELECT account_id, payload -> 'raw_items'
  INTO v_account_id, v_raw_items
  FROM public.stock_order_submissions
  WHERE id = p_id AND status IN ('staged', 'failed') FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in a releasable state.';
  END IF;

  SELECT assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.customers WHERE id = v_account_id;


  SELECT priced.priced_items, priced.order_total
  INTO v_priced, v_total
  FROM public._price_stock_order_items(v_pricelist_version_id, v_raw_items) AS priced;

  UPDATE public.stock_order_submissions
  SET status = 'approved',
      dispatch_provider = p_dispatch_provider,
      approved_by = auth.uid(), approved_at = now(), last_error = NULL,
      payload = payload || jsonb_build_object('items', v_priced, 'order_total', v_total, 'repriced_at', now())
  WHERE id = p_id AND status IN ('staged', 'failed');
END;
$function$;


CREATE OR REPLACE FUNCTION public.save_stock_order_draft(p_submission_id uuid DEFAULT NULL::uuid, p_account_id integer DEFAULT NULL::integer, p_po_number text DEFAULT NULL::text, p_order_reference text DEFAULT NULL::text, p_instructions text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS TABLE(submission_id uuid, order_total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account record;
  v_priced jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_existing_id uuid;
BEGIN
  IF NOT public.has_any_role(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to build stock orders.';
  END IF;

  IF p_account_id IS NULL THEN
    RAISE EXCEPTION 'Choose an account before creating a stock order.';
  END IF;

  SELECT id, name, account_number, innovations_customer_id, assigned_pricelist_id
  INTO v_account
  FROM public.customers
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected account no longer exists.';
  END IF;

  IF jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Stock order items must be an array.';
  END IF;

  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) > 0 THEN
    SELECT priced.priced_items, priced.order_total
    INTO v_priced, v_total
    FROM public._price_stock_order_items(v_account.assigned_pricelist_id, p_items) AS priced;
  END IF;

  IF p_submission_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.stock_order_submissions
    WHERE id = p_submission_id
      AND status IN ('staged', 'failed')
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Draft not found or no longer editable.';
    END IF;

    UPDATE public.stock_order_submissions
    SET account_id = p_account_id,
        po_number = NULLIF(btrim(p_po_number), ''),
        order_reference = NULLIF(btrim(p_order_reference), ''),
        status = 'staged',
        last_error = NULL,
        payload = jsonb_build_object(
          'account', jsonb_build_object(
            'id', v_account.id, 'name', v_account.name,
            'account_number', v_account.account_number,
            'innovations_customer_id', v_account.innovations_customer_id
          ),
          'po_number', NULLIF(btrim(p_po_number), ''),
          'order_reference', NULLIF(btrim(p_order_reference), ''),
          'instructions', NULLIF(btrim(p_instructions), ''),
          'raw_items', COALESCE(p_items, '[]'::jsonb),
          'items', v_priced,
          'order_total', v_total,
          'built_at', now()
        )
    WHERE id = v_existing_id
    RETURNING id INTO submission_id;
  ELSE
    INSERT INTO public.stock_order_submissions
      (account_id, po_number, order_reference, status, payload, created_by)
    VALUES (
      p_account_id, NULLIF(btrim(p_po_number), ''), NULLIF(btrim(p_order_reference), ''), 'staged',
      jsonb_build_object(
        'account', jsonb_build_object(
          'id', v_account.id, 'name', v_account.name,
          'account_number', v_account.account_number,
          'innovations_customer_id', v_account.innovations_customer_id
        ),
        'po_number', NULLIF(btrim(p_po_number), ''),
        'order_reference', NULLIF(btrim(p_order_reference), ''),
        'instructions', NULLIF(btrim(p_instructions), ''),
        'raw_items', COALESCE(p_items, '[]'::jsonb),
        'items', v_priced,
        'order_total', v_total,
        'built_at', now()
      ),
      auth.uid()
    )
    RETURNING id INTO submission_id;
  END IF;

  order_total := v_total;
  RETURN NEXT;
END;
$function$;


CREATE OR REPLACE FUNCTION public.stage_stock_order_submission(p_account_id integer, p_po_number text, p_order_reference text, p_instructions text, p_items jsonb)
 RETURNS TABLE(submission_id uuid, order_total numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_account record;
  v_priced jsonb;
  v_total numeric;
  v_submission_id uuid;
BEGIN
  IF NOT public.has_any_role(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to build stock orders.';
  END IF;

  SELECT id, name, account_number, innovations_customer_id, assigned_pricelist_id
  INTO v_account
  FROM public.customers
  WHERE id = p_account_id;

  v_pricelist_version_id := v_account.assigned_pricelist_id;

  SELECT priced.priced_items, priced.order_total
  INTO v_priced, v_total
  FROM public._price_stock_order_items(v_pricelist_version_id, p_items) AS priced;

  INSERT INTO public.stock_order_submissions
    (account_id, po_number, order_reference, status, payload, created_by)
  VALUES (
    p_account_id, p_po_number, p_order_reference, 'staged',
    jsonb_build_object(
      'account', jsonb_build_object(
        'id', v_account.id, 'name', v_account.name,
        'account_number', v_account.account_number,
        'innovations_customer_id', v_account.innovations_customer_id
      ),
      'po_number', p_po_number,
      'order_reference', p_order_reference,
      'instructions', p_instructions,
      'raw_items', p_items,
      'items', v_priced,
      'order_total', v_total,
      'built_at', now()
    ),
    auth.uid()
  )
  RETURNING id INTO v_submission_id;

  RETURN QUERY SELECT v_submission_id, v_total;
END;
$function$;


-- One persistent switch, shared by all devices. Secrets remain server-only.
CREATE TABLE public.order_dispatch_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  auto_transmit boolean NOT NULL DEFAULT true,
  dispatch_token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  endpoint_url text,
  gateway_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.order_dispatch_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_dispatch_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.order_dispatch_settings TO service_role;
-- Reuse the project's existing endpoint and public gateway key without putting
-- infrastructure identifiers or key values in source control.
INSERT INTO public.order_dispatch_settings(id, endpoint_url, gateway_key)
SELECT true, substring(command FROM 'https://[^'' ]+/functions/v1/gatekeeper-orders'),
       (regexp_match(command, '''apikey''\s*,\s*''([^'']+)'''))[1]
FROM cron.job WHERE jobname = 'gatekeeper-pull-statuses';
INSERT INTO public.order_dispatch_settings(id) VALUES(true) ON CONFLICT DO NOTHING;

CREATE FUNCTION public.get_order_dispatch_settings() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required.'; END IF;
  RETURN (SELECT jsonb_build_object('auto_transmit', auto_transmit, 'default_provider', 'gatekeeper') FROM public.order_dispatch_settings WHERE id);
END $$;
CREATE FUNCTION public.set_order_auto_transmit(p_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role),false) THEN RAISE EXCEPTION 'Only admins can change automatic transmission.'; END IF;
  IF p_enabled IS NULL THEN RAISE EXCEPTION 'Choose on or off.'; END IF;
  IF p_enabled AND NOT EXISTS(SELECT 1 FROM public.order_dispatch_settings WHERE id AND endpoint_url IS NOT NULL AND gateway_key IS NOT NULL) THEN
    RAISE EXCEPTION 'Gatekeeper dispatch endpoint is not configured.';
  END IF;
  UPDATE public.order_dispatch_settings SET auto_transmit=p_enabled, updated_at=now(), updated_by=auth.uid() WHERE id;
END $$;
CREATE FUNCTION public.verify_gatekeeper_dispatch_token(p_token text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.order_dispatch_settings WHERE id AND auto_transmit AND length(p_token)>0 AND dispatch_token=p_token);
$$;
REVOKE ALL ON FUNCTION public.get_order_dispatch_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_order_auto_transmit(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_order_dispatch_settings(), public.set_order_auto_transmit(boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.verify_gatekeeper_dispatch_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_gatekeeper_dispatch_token(text) TO service_role;

ALTER TABLE public.rx_order_submissions ADD COLUMN auto_transmit boolean NOT NULL DEFAULT false;
ALTER TABLE public.stock_order_submissions ADD COLUMN auto_transmit boolean NOT NULL DEFAULT false;
ALTER TABLE public.rx_order_submissions ALTER COLUMN dispatch_provider SET DEFAULT 'gatekeeper';
ALTER TABLE public.stock_order_submissions ALTER COLUMN dispatch_provider SET DEFAULT 'gatekeeper';

CREATE FUNCTION public.prepare_automatic_gatekeeper_submission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.order_dispatch_settings WHERE id AND auto_transmit) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME='rx_order_submissions' AND TG_OP='INSERT' AND NEW.status='pending_review' THEN
    -- The existing skip-test trigger runs before this trigger. Retain a second
    -- explicit check here so a future trigger rename cannot send a fixture.
    IF EXISTS(SELECT 1 FROM public.quotes WHERE id=NEW.quote_id AND is_test) THEN RETURN NULL; END IF;
    IF EXISTS(SELECT 1 FROM public.quote_lines WHERE quote_id=NEW.quote_id AND line_type='Lens' AND innovations_alias IS NULL) THEN
      NEW.last_error := 'Confirm the Innovations lens alias before transmission.';
      RETURN NEW;
    END IF;
    NEW.status := 'approved'; NEW.dispatch_provider := 'gatekeeper';
    NEW.approved_at := now(); NEW.auto_transmit := true;
  ELSIF TG_OP='UPDATE' AND NEW.status='approved' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.dispatch_provider='gatekeeper' THEN
    NEW.auto_transmit := true;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_prepare_automatic_gatekeeper_rx BEFORE INSERT OR UPDATE ON public.rx_order_submissions FOR EACH ROW EXECUTE FUNCTION public.prepare_automatic_gatekeeper_submission();
CREATE TRIGGER zz_prepare_automatic_gatekeeper_stock BEFORE UPDATE ON public.stock_order_submissions FOR EACH ROW EXECUTE FUNCTION public.prepare_automatic_gatekeeper_submission();

CREATE FUNCTION public.request_gatekeeper_auto_dispatch() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net AS $$
DECLARE s public.order_dispatch_settings%ROWTYPE; request_id bigint;
BEGIN
  SELECT * INTO s FROM public.order_dispatch_settings WHERE id;
  IF NOT s.auto_transmit OR s.endpoint_url IS NULL OR s.gateway_key IS NULL THEN RETURN NULL; END IF;
  SELECT net.http_post(url := s.endpoint_url,
    headers := jsonb_build_object('Content-Type','application/json','apikey',s.gateway_key,'Authorization','Bearer '||s.gateway_key,'x-gatekeeper-dispatch-token',s.dispatch_token),
    body := '{"action":"auto-dispatch"}'::jsonb, timeout_milliseconds := 120000)
  INTO request_id;
  RETURN request_id;
END $$;
CREATE FUNCTION public.wake_gatekeeper_auto_dispatch() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.auto_transmit AND NEW.status='approved' AND NEW.dispatch_provider='gatekeeper' THEN
    IF TG_OP='INSERT' THEN PERFORM public.request_gatekeeper_auto_dispatch();
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN PERFORM public.request_gatekeeper_auto_dispatch(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER wake_gatekeeper_auto_rx AFTER INSERT OR UPDATE ON public.rx_order_submissions FOR EACH ROW EXECUTE FUNCTION public.wake_gatekeeper_auto_dispatch();
CREATE TRIGGER wake_gatekeeper_auto_stock AFTER INSERT OR UPDATE ON public.stock_order_submissions FOR EACH ROW EXECUTE FUNCTION public.wake_gatekeeper_auto_dispatch();
REVOKE ALL ON FUNCTION public.prepare_automatic_gatekeeper_submission(), public.wake_gatekeeper_auto_dispatch(), public.request_gatekeeper_auto_dispatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_gatekeeper_auto_dispatch() TO service_role;
-- Backstop for a lost wakeup. Only approved, newly opted-in rows are eligible;
-- failed/claimed/accepted orders are never automatically replayed.
SELECT cron.schedule('gatekeeper-auto-dispatch', '* * * * *', 'SELECT public.request_gatekeeper_auto_dispatch()');
CREATE OR REPLACE FUNCTION public.resolve_stock_order_price(p_account_id integer, p_product_type text, p_product_id uuid, p_manual_price numeric DEFAULT NULL::numeric, p_manual_reason text DEFAULT NULL::text)
 RETURNS TABLE(unit_price numeric, price_source text, source_trail jsonb, unit_cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_account record;
  v_catalog_price numeric;
  v_cost numeric;
  v_price numeric;
  v_source text;
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
  IF NOT FOUND THEN RAISE EXCEPTION 'The selected account no longer exists.'; END IF;

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
    AND r.item_id = p_product_id AND r.bbd_price IS NOT NULL;
  IF v_price IS NOT NULL THEN v_source := 'assigned_pricelist'; END IF;

  IF v_price IS NULL AND p_product_type='addon' THEN
    SELECT price INTO v_price FROM public.addons
    WHERE id=p_product_id AND stock_orderable AND NOT show_on_website AND price>0;
    IF FOUND THEN v_source := 'staff_service_catalog'; END IF;
  END IF;
  IF v_price IS NULL THEN v_source := 'pending_lab_quote'; v_price := 0; END IF;

  IF p_product_type = 'lens' THEN v_price := round(v_price / 2, 2); END IF;

  RETURN QUERY SELECT v_price, v_source,
    jsonb_build_array(v_source),
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
  SELECT lower(btrim(c.name)) = 'retail' INTO v_is_retail FROM public.customers c WHERE c.id = p_account_id;
  IF v_is_retail IS NULL THEN RAISE EXCEPTION 'The selected account no longer exists.'; END IF;
  RETURN QUERY
  WITH products AS (
    SELECT 'lens'::text type, l.id, l.name, 'Lens'::text category, NULL::text sku, false AS staff_only FROM public.lenses l WHERE l.show_on_website AND l.is_active
    UNION ALL SELECT 'supply', s.id, s.name, s.category, s.sku, false FROM public.supplies s WHERE s.show_on_website AND s.is_active
    UNION ALL SELECT 'addon', a.id, a.name, coalesce(a.category, 'Service'), a.sku,
      (a.stock_orderable AND NOT a.show_on_website)
      FROM public.addons a WHERE (a.show_on_website OR (a.stock_orderable AND a.price > 0)) AND a.is_active
  )
  SELECT p.type, p.id, p.name, p.category, p.sku, resolved.unit_price,
    EXISTS (SELECT 1 FROM public.store_product_variants v WHERE v.product_type = p.type AND v.product_id = p.id AND v.is_active),
    resolved.price_source, resolved.source_trail, resolved.unit_cost
  FROM products p
  JOIN LATERAL public.resolve_stock_order_price(p_account_id, p.type, p.id, NULL, NULL) resolved ON true
;
END;
$function$;

NOTIFY pgrst, 'reload schema';
