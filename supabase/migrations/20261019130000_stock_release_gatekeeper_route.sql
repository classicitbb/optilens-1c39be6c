-- Stock orders may now be released through Gatekeeper as well as OptiLens.
-- The gatekeeper-orders function and record_gatekeeper_result already handle
-- order_kind = 'stock'; only this guard refused the route. The chosen provider
-- is stored so the matching consumer (OptiLens worker or the Gatekeeper send)
-- takes the row, never both.
CREATE OR REPLACE FUNCTION public.release_stock_order_submission(p_id uuid, p_dispatch_provider text DEFAULT 'innovations'::text)
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
      dispatch_provider = p_dispatch_provider,
      approved_by = auth.uid(), approved_at = now(), last_error = NULL,
      payload = payload || jsonb_build_object('items', v_priced, 'order_total', v_total, 'repriced_at', now())
  WHERE id = p_id;
END;
$function$;

NOTIFY pgrst, 'reload schema';
