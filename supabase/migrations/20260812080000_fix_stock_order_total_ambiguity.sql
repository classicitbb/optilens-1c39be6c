-- Fix staging/repricing when the PL/pgSQL output column `order_total`
-- collides with the result column returned by the pricing helper.
--
-- The public RPC signatures stay unchanged.  The pricing result is given an
-- explicit relation alias so `priced.order_total` cannot resolve to the
-- surrounding function's output variable.

CREATE OR REPLACE FUNCTION public.stage_stock_order_submission(
  p_account_id integer,
  p_po_number text,
  p_order_reference text,
  p_instructions text,
  p_items jsonb
)
RETURNS TABLE (submission_id uuid, order_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  IF v_account.assigned_pricelist_id IS NULL THEN
    RAISE EXCEPTION 'This account has no assigned pricelist.';
  END IF;
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

REVOKE ALL ON FUNCTION public.stage_stock_order_submission(integer, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stage_stock_order_submission(integer, text, text, text, jsonb) TO authenticated;

-- Apply the same qualification to release-time repricing.  This path is not
-- the reported failure, but it uses the identical ambiguous expression.
DROP FUNCTION IF EXISTS public.release_stock_order_submission(uuid, text);
CREATE FUNCTION public.release_stock_order_submission(
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
  IF p_dispatch_provider NOT IN ('innovations', 'gatekeeper') THEN
    RAISE EXCEPTION 'Unsupported stock order provider.';
  END IF;

  SELECT account_id, payload -> 'raw_items'
  INTO v_account_id, v_raw_items
  FROM public.stock_order_submissions
  WHERE id = p_id AND status IN ('staged', 'failed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in a releasable state.';
  END IF;

  SELECT assigned_pricelist_id
  INTO v_pricelist_version_id
  FROM public.customers
  WHERE id = v_account_id;

  IF v_pricelist_version_id IS NULL THEN
    RAISE EXCEPTION 'This account no longer has an assigned pricelist.';
  END IF;

  SELECT priced.priced_items, priced.order_total
  INTO v_priced, v_total
  FROM public._price_stock_order_items(v_pricelist_version_id, v_raw_items) AS priced;

  UPDATE public.stock_order_submissions
  SET status = 'approved',
      dispatch_provider = p_dispatch_provider,
      approved_by = auth.uid(),
      approved_at = now(),
      last_error = NULL,
      payload = payload || jsonb_build_object(
        'items', v_priced,
        'order_total', v_total,
        'repriced_at', now()
      )
  WHERE id = p_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.release_stock_order_submission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stock_order_submission(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
