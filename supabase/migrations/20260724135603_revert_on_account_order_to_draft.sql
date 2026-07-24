-- Returns an unfulfilled account order to the customer for changes without
-- overwriting any new items they may already have in their active cart.
CREATE OR REPLACE FUNCTION public.revert_on_account_order_to_draft(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_items jsonb;
  v_total_items integer;
  v_total_amount numeric;
  v_draft_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and operators can return an order to draft.';
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.checkout_method <> 'on_account' THEN
    RAISE EXCEPTION 'Only orders placed on account can be returned to draft.';
  END IF;

  -- Once fulfilment has started, the order must not be silently reopened.
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending account orders can be returned to draft.';
  END IF;

  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'product_id', item.product_id,
      'product_name', item.product_name,
      'product_price', item.product_price,
      'product_type', item.product_type,
      'variant_id', item.variant_id,
      'variant_label', item.variant_label,
      'variant_sku', item.variant_sku,
      'variant_opc_code', item.variant_opc_code,
      'variant_metadata', COALESCE(item.variant_metadata, item.variant_snapshot, '{}'::jsonb),
      'quantity', item.quantity
    ) ORDER BY item.created_at, item.id), '[]'::jsonb),
    COALESCE(SUM(item.quantity), 0)::integer,
    COALESCE(SUM(item.product_price * item.quantity), 0)
  INTO v_items, v_total_items, v_total_amount
  FROM public.order_items AS item
  WHERE item.order_id = v_order.id;

  IF v_total_items = 0 THEN
    RAISE EXCEPTION 'This order has no items to return to draft.';
  END IF;

  INSERT INTO public.cart_drafts (user_id, name, note, items, total_items, total_amount)
  VALUES (
    v_order.user_id,
    format('Order #%s — revision draft', upper(left(v_order.id::text, 8))),
    'Returned for changes. Restore this draft to your cart, update the items, then check out again.',
    v_items,
    v_total_items,
    v_total_amount
  )
  RETURNING id INTO v_draft_id;

  UPDATE public.orders
     SET status = 'draft',
         updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.order_payment_events (payment_id, event_type, payload)
  SELECT
    payment.id,
    'order_returned_to_draft',
    jsonb_build_object(
      'returned_by', auth.uid(),
      'draft_id', v_draft_id,
      'previous_status', v_order.status
    )
  FROM public.order_payments AS payment
  WHERE payment.order_id = v_order.id;

  RETURN v_draft_id;
END;
$$;

REVOKE ALL ON FUNCTION public.revert_on_account_order_to_draft(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revert_on_account_order_to_draft(uuid) TO authenticated;

-- Cancellation remains a separate, explicit action from payment processing.
-- A refund request is recorded for staff to process through the payment provider;
-- this function never represents that a refund has already been issued.
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and operators can cancel orders.';
  END IF;

  IF p_reason NOT IN ('refund_requested', 'order_error') THEN
    RAISE EXCEPTION 'Cancellation reason must be refund_requested or order_error.';
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  -- Shipped and completed orders require the returns workflow instead.
  IF v_order.status NOT IN ('draft', 'pending_payment', 'pending', 'confirmed', 'processing') THEN
    RAISE EXCEPTION 'Only orders that have not shipped can be cancelled.';
  END IF;

  UPDATE public.orders
     SET status = 'cancelled',
         updated_at = now()
   WHERE id = v_order.id;

  INSERT INTO public.order_payment_events (payment_id, event_type, payload)
  SELECT
    payment.id,
    'order_cancelled',
    jsonb_build_object(
      'cancelled_by', auth.uid(),
      'reason', p_reason,
      'previous_status', v_order.status,
      'refund_requested', p_reason = 'refund_requested'
    )
  FROM public.order_payments AS payment
  WHERE payment.order_id = v_order.id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid, text) TO authenticated;
