-- Rx ordering, Phase 2: customer order management.
--
-- Customers never read rx_order_submissions / rx_order_events (staff-only under RLS;
-- they hold lab internals, errors and payloads). They get a safe projection through
-- the three SECURITY DEFINER functions below:
--
--   list_my_rx_orders()                 one row per Rx order the caller placed
--   get_my_rx_order_status(p_quote_id)  one order: header, lens/Rx payload, price lines,
--                                       the lifecycle facts and a few safe events
--   cancel_my_rx_order(p_quote_id)      cancel while the order is still waiting for review
--
-- "The caller's" Rx order = an RX quote they created, or one carried by an order they
-- own (order_items.variant_metadata.rx_quote_id), never a test quote. Staff can read any.
-- What the lab said (failed attempts, errors, retry counts) is never returned: a
-- failed submission simply reads as "in review" to the customer.

CREATE OR REPLACE FUNCTION public.rx_order_is_mine(p_quote_id uuid, p_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = p_quote_id AND q.quote_type = 'RX' AND NOT COALESCE(q.is_test, false)
      AND (
        q.created_by = p_uid
        OR EXISTS (
          SELECT 1 FROM public.order_items oi
          JOIN public.orders o ON o.id = oi.order_id
          WHERE o.user_id = p_uid AND oi.variant_metadata ->> 'rx_quote_id' = q.id::text
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.rx_order_is_mine(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- One row of lifecycle facts. Shared by the list and the detail so they cannot disagree.
CREATE OR REPLACE FUNCTION public.rx_order_facts(p_quote_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'quote_id', q.id,
    'rx_order_number', q.rx_order_number,
    'quote_status', q.status,
    'created_at', q.created_at,
    'updated_at', q.updated_at,
    'currency', q.currency,
    'total', q.grand_total,
    'order_id', COALESCE(s.order_id, oi.order_id),
    'order_status', o.status,
    'order_checkout_method', o.checkout_method,
    'submission_status', s.status,
    'submitted_at', s.created_at,
    'released_at', s.approved_at,
    'sent_at', s.submitted_at,
    'lab_status', s.lab_status,
    'lab_status_at', s.lab_status_at,
    'order_item_count', (SELECT count(*) FROM public.order_items x WHERE x.order_id = COALESCE(s.order_id, oi.order_id)),
    'paid', EXISTS (
      SELECT 1 FROM public.order_payments p
      WHERE p.order_id = COALESCE(s.order_id, oi.order_id) AND p.status = 'settled'
    ),
    'payload', q.rx_payload
  )
  FROM public.quotes q
  LEFT JOIN public.rx_order_submissions s ON s.quote_id = q.id
  LEFT JOIN LATERAL (
    SELECT i.order_id FROM public.order_items i
    WHERE i.variant_metadata ->> 'rx_quote_id' = q.id::text
    ORDER BY i.created_at DESC LIMIT 1
  ) oi ON true
  LEFT JOIN public.orders o ON o.id = COALESCE(s.order_id, oi.order_id)
  WHERE q.id = p_quote_id;
$$;
REVOKE ALL ON FUNCTION public.rx_order_facts(uuid) FROM PUBLIC, anon, authenticated;

-- Orders that have been placed (an order exists, or the outbox has it). Drafts and
-- items still sitting in the cart belong to the drafts list / the cart, not here.
CREATE OR REPLACE FUNCTION public.list_my_rx_orders()
RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  r record;
  f jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to see your Rx orders.' USING ERRCODE = '28000';
  END IF;
  FOR r IN
    SELECT q.id FROM public.quotes q
    WHERE q.quote_type = 'RX' AND NOT COALESCE(q.is_test, false)
      AND public.rx_order_is_mine(q.id, v_uid)
      AND (
        EXISTS (SELECT 1 FROM public.rx_order_submissions s WHERE s.quote_id = q.id)
        OR EXISTS (SELECT 1 FROM public.order_items i WHERE i.variant_metadata ->> 'rx_quote_id' = q.id::text)
      )
    ORDER BY q.created_at DESC
    LIMIT 500
  LOOP
    f := public.rx_order_facts(r.id);
    -- the list needs only enough payload for a row (patient, reference, lens), not the shape data
    f := (f - 'payload') || jsonb_build_object('payload', jsonb_strip_nulls(jsonb_build_object(
           'patient', f -> 'payload' -> 'patient', 'reference', f -> 'payload' -> 'reference',
           'split', f -> 'payload' -> 'split', 'lens', f -> 'payload' -> 'lens', 'lensOs', f -> 'payload' -> 'lensOs')));
    RETURN NEXT f;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.list_my_rx_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_rx_orders() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_rx_order_status(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_facts jsonb;
  v_lines jsonb;
  v_events jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to see your Rx orders.' USING ERRCODE = '28000';
  END IF;
  IF NOT (public.has_any_role(v_uid) OR public.rx_order_is_mine(p_quote_id, v_uid)) THEN
    RAISE EXCEPTION 'Rx order not found.' USING ERRCODE = 'P0002';
  END IF;

  v_facts := public.rx_order_facts(p_quote_id);
  IF v_facts IS NULL THEN
    RAISE EXCEPTION 'Rx order not found.' USING ERRCODE = 'P0002';
  END IF;

  -- price lines: what the customer is charged, never cost / margin columns
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'line_type', l.line_type, 'item_name', l.item_name, 'qty', l.qty,
           'unit_price', l.unit_sell_price_bbd) ORDER BY l.sort_order, l.created_at), '[]'::jsonb)
    INTO v_lines
  FROM public.quote_lines l WHERE l.quote_id = p_quote_id;

  -- only the events a customer may see, by name; detail is dropped on purpose
  SELECT COALESCE(jsonb_agg(jsonb_build_object('event', e.event, 'at', e.created_at) ORDER BY e.created_at), '[]'::jsonb)
    INTO v_events
  FROM public.rx_order_events e
  WHERE e.quote_id = p_quote_id
    AND e.event IN ('draft_created', 'submitted', 'submission_approved', 'submission_submitted',
                    'submission_cancelled', 'edited_after_submit', 'customer_cancelled');

  RETURN v_facts || jsonb_build_object('lines', v_lines, 'events', v_events);
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_rx_order_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_rx_order_status(uuid) TO authenticated;

-- Cancel before release. Refused when: the lab has it, money was taken (a refund is a
-- person's job), or the order carries other items (cancelling the order would cancel them).
CREATE OR REPLACE FUNCTION public.cancel_my_rx_order(p_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_q public.quotes%ROWTYPE;
  v_sub public.rx_order_submissions%ROWTYPE;
  v_order_id uuid;
  v_items integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to cancel an Rx order.' USING ERRCODE = '28000';
  END IF;
  IF NOT public.rx_order_is_mine(p_quote_id, v_uid) THEN
    RAISE EXCEPTION 'Rx order not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF v_q.status IN ('Void', 'Rejected', 'Expired') THEN
    RAISE EXCEPTION 'This Rx order is already closed.' USING ERRCODE = '55006';
  END IF;

  SELECT * INTO v_sub FROM public.rx_order_submissions WHERE quote_id = p_quote_id FOR UPDATE;
  IF FOUND AND v_sub.status <> 'pending_review' AND v_sub.status <> 'failed' THEN
    RAISE EXCEPTION 'This order has already been released to the lab. Contact us to change it.' USING ERRCODE = '55006';
  END IF;

  v_order_id := COALESCE(v_sub.order_id, (
    SELECT i.order_id FROM public.order_items i
    WHERE i.variant_metadata ->> 'rx_quote_id' = p_quote_id::text ORDER BY i.created_at DESC LIMIT 1));

  IF v_order_id IS NOT NULL THEN
    SELECT count(*) INTO v_items FROM public.order_items WHERE order_id = v_order_id;
    IF v_items > 1 THEN
      RAISE EXCEPTION 'This Rx order is part of a larger order. Contact us to cancel it.' USING ERRCODE = '55006';
    END IF;
    IF EXISTS (SELECT 1 FROM public.order_payments WHERE order_id = v_order_id AND status = 'settled') THEN
      RAISE EXCEPTION 'This order has been paid. Contact us to cancel it and arrange a refund.' USING ERRCODE = '55006';
    END IF;
    UPDATE public.orders SET status = 'cancelled', updated_at = now()
     WHERE id = v_order_id AND status IN ('pending', 'pending_payment', 'confirmed');
  END IF;

  IF v_sub.id IS NOT NULL THEN
    UPDATE public.rx_order_submissions SET status = 'cancelled', updated_at = now()
     WHERE quote_id = p_quote_id AND status IN ('pending_review', 'failed');
  END IF;
  UPDATE public.quotes SET status = 'Void' WHERE id = p_quote_id;

  PERFORM public.log_rx_order_event(p_quote_id, 'customer_cancelled', v_q.status, 'Void', '{}'::jsonb, v_sub.id);
  RETURN jsonb_build_object('quote_id', p_quote_id, 'cancelled', true);
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_my_rx_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_rx_order(uuid) TO authenticated;
