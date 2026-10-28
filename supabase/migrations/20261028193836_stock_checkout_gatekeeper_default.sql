CREATE OR REPLACE FUNCTION public.enqueue_stock_submission_for_order(p_order_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order record;
  v_account record;
  v_items jsonb;
  v_priced jsonb;
  v_total numeric;
  v_reference text;
  v_submission_id uuid;
BEGIN
  SELECT id, user_id, status, checkout_method
    INTO v_order
  FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF NOT (v_order.status = 'confirmed'
          OR (v_order.status = 'pending' AND v_order.checkout_method = 'on_account')) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.stock_order_submissions WHERE order_id = p_order_id) THEN
    RETURN NULL;
  END IF;

  SELECT c.id, c.name, c.account_number, c.innovations_customer_id, c.assigned_pricelist_id
    INTO v_account
  FROM public.portal_account_memberships m
  JOIN public.customers c ON c.id = m.customer_id
  WHERE m.user_id = v_order.user_id AND m.status = 'active'
  ORDER BY m.is_default DESC, m.created_at ASC
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_reference := 'Web order ' || LEFT(p_order_id::text, 8);

  SELECT jsonb_agg(jsonb_build_object(
           'product_type', pv.product_type,
           'product_id',   pv.product_id,
           'variant_id',   pv.id,
           'side',         COALESCE(NULLIF(oi.variant_metadata ->> 'side', ''), 'either'),
           'quantity',     GREATEST(COALESCE(oi.quantity, 1), 1),
           'customer_ref', ''
         ) ORDER BY oi.created_at)
    INTO v_items
  FROM public.order_items oi
  JOIN public.store_product_variants pv ON pv.id = oi.variant_id
  WHERE oi.order_id = p_order_id
    AND COALESCE(
          NULLIF(pv.metadata -> 'opc_by_eye' ->> COALESCE(NULLIF(oi.variant_metadata ->> 'side', ''), 'either'), ''),
          NULLIF(pv.opc_code, ''),
          NULLIF(pv.sku, '')
        ) ~ '^[0-9]{6,20}$';

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN RETURN NULL; END IF;


  BEGIN
    SELECT priced.priced_items, priced.order_total
      INTO v_priced, v_total
    FROM public._price_stock_order_items(v_account.assigned_pricelist_id, v_items) AS priced;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.stock_order_submissions
      (account_id, order_id, order_reference, status, dispatch_provider,
       payload, last_error, created_by)
    VALUES (
      v_account.id, p_order_id, v_reference, 'failed', 'gatekeeper',
      jsonb_build_object('order_id', p_order_id, 'source', 'store_checkout',
                         'raw_items', v_items, 'built_at', now()),
      SQLERRM, v_order.user_id
    )
    RETURNING id INTO v_submission_id;
    RETURN v_submission_id;
  END;

  INSERT INTO public.stock_order_submissions
    (account_id, order_id, po_number, order_reference, status, dispatch_provider,
     payload, approved_at, created_by)
  VALUES (
    v_account.id, p_order_id, NULL, v_reference,
    CASE WHEN (SELECT auto_transmit FROM public.order_dispatch_settings WHERE id) THEN 'approved' ELSE 'staged' END, 'gatekeeper',
    jsonb_build_object(
      'account', jsonb_build_object(
        'id', v_account.id, 'name', v_account.name,
        'account_number', v_account.account_number,
        'innovations_customer_id', v_account.innovations_customer_id
      ),
      'po_number', '',
      'order_reference', v_reference,
      'instructions', '',
      'source', 'store_checkout',
      'order_id', p_order_id,
      'raw_items', v_items,
      'items', v_priced,
      'order_total', v_total,
      'built_at', now()
    ),
    now(), v_order.user_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prepare_automatic_gatekeeper_submission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ELSIF TG_TABLE_NAME='stock_order_submissions' AND TG_OP='INSERT' AND NEW.status='approved' AND NEW.dispatch_provider='gatekeeper' THEN
    NEW.auto_transmit := true;
  ELSIF TG_OP='UPDATE' AND NEW.status='approved' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.dispatch_provider='gatekeeper' THEN
    NEW.auto_transmit := true;
  END IF;
  RETURN NEW;
END $function$;
DROP TRIGGER zz_prepare_automatic_gatekeeper_stock ON public.stock_order_submissions;
CREATE TRIGGER zz_prepare_automatic_gatekeeper_stock BEFORE INSERT OR UPDATE ON public.stock_order_submissions FOR EACH ROW EXECUTE FUNCTION public.prepare_automatic_gatekeeper_submission();
NOTIFY pgrst,'reload schema';

