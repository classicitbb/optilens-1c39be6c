-- Persist stock-order work as soon as staff start it. A draft may be empty
-- while it contains only a PO number or order reference; release still uses
-- _price_stock_order_items, which rejects an empty order and re-prices all
-- items against the account's current pricelist.
CREATE FUNCTION public.save_stock_order_draft(
  p_submission_id uuid DEFAULT NULL,
  p_account_id integer DEFAULT NULL,
  p_po_number text DEFAULT NULL,
  p_order_reference text DEFAULT NULL,
  p_instructions text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (submission_id uuid, order_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF v_account.assigned_pricelist_id IS NULL THEN
    RAISE EXCEPTION 'This account has no assigned pricelist.';
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

REVOKE ALL ON FUNCTION public.save_stock_order_draft(uuid, integer, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_stock_order_draft(uuid, integer, text, text, text, jsonb) TO authenticated;

-- Gatekeeper is an Innovations submission path, not a stock-order route.
CREATE OR REPLACE FUNCTION public.release_stock_order_submission(
  p_id uuid,
  p_dispatch_provider text DEFAULT 'innovations'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF p_dispatch_provider <> 'innovations' THEN
    RAISE EXCEPTION 'Stock orders are released through OptiLens.';
  END IF;

  SELECT account_id, payload -> 'raw_items'
  INTO v_account_id, v_raw_items
  FROM public.stock_order_submissions
  WHERE id = p_id AND status IN ('staged', 'failed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in a releasable state.';
  END IF;

  SELECT assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.customers WHERE id = v_account_id;

  IF v_pricelist_version_id IS NULL THEN
    RAISE EXCEPTION 'This account no longer has an assigned pricelist.';
  END IF;

  SELECT priced.priced_items, priced.order_total
  INTO v_priced, v_total
  FROM public._price_stock_order_items(v_pricelist_version_id, v_raw_items) AS priced;

  UPDATE public.stock_order_submissions
  SET status = 'approved',
      dispatch_provider = 'innovations',
      approved_by = auth.uid(), approved_at = now(), last_error = NULL,
      payload = payload || jsonb_build_object('items', v_priced, 'order_total', v_total, 'repriced_at', now())
  WHERE id = p_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.release_stock_order_submission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stock_order_submission(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
