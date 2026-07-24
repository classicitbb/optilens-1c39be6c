-- Scotia eCom+ payment outcome hardening.
--
-- The checkout page shows a shipping charge, so persist that exact charge in
-- the payable order/payment totals before signing the gateway request. The
-- settlement function then refuses an oid or amount that does not match the
-- pending Scotia payment record.

CREATE OR REPLACE FUNCTION public.place_customer_order_with_shipping(
  p_target_user_id uuid,
  p_items jsonb,
  p_checkout jsonb DEFAULT '{}'::jsonb,
  p_actor_user_id uuid DEFAULT auth.uid(),
  p_shipping_amount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order_id uuid;
  v_shipping_amount numeric := COALESCE(p_shipping_amount, 0);
  v_payment_id uuid;
  v_actor_user_id uuid := COALESCE(p_actor_user_id, auth.uid());
BEGIN
  -- These are the only checkout shipping prices currently presented by the
  -- storefront. Restricting the value prevents a browser from changing the
  -- payment amount after the order has been created.
  IF v_shipping_amount NOT IN (0, 28, 74) THEN
    RAISE EXCEPTION 'Unsupported shipping charge.';
  END IF;

  -- The wrapper is the only browser-callable order path. Never allow a
  -- customer to nominate another user as the actor/owner; staff may still
  -- place an order on behalf of a customer through the existing admin flow.
  IF v_actor_user_id IS NULL
     OR (v_actor_user_id <> auth.uid() AND NOT public.has_edit_role(auth.uid())) THEN
    RAISE EXCEPTION 'You do not have permission to place this order.';
  END IF;

  v_order_id := public.place_customer_order(
    p_target_user_id,
    p_items,
    p_checkout,
    v_actor_user_id
  );

  IF v_shipping_amount = 0 THEN
    RETURN v_order_id;
  END IF;

  UPDATE public.orders
  SET total_amount = total_amount + v_shipping_amount,
      updated_at = now()
  WHERE id = v_order_id;

  UPDATE public.order_payments
  SET amount = amount + v_shipping_amount,
      metadata = metadata || jsonb_build_object('shipping_amount', v_shipping_amount),
      updated_at = now()
  WHERE order_id = v_order_id
  RETURNING id INTO v_payment_id;

  UPDATE public.order_payment_events
  SET payload = payload || jsonb_build_object('shipping_amount', v_shipping_amount)
  WHERE payment_id = v_payment_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_customer_order_with_shipping(uuid, jsonb, jsonb, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_customer_order_with_shipping(uuid, jsonb, jsonb, uuid, numeric) TO authenticated;

-- All browser checkout traffic now uses the wrapper above. This closes the
-- legacy RPC path where a caller-controlled actor id could be supplied.
REVOKE ALL ON FUNCTION public.place_customer_order(uuid, jsonb, jsonb, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.settle_scotia_payment(
  p_order_id uuid,
  p_gateway jsonb DEFAULT '{}'::jsonb,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_user_id uuid := COALESCE(p_actor_user_id, auth.uid());
  v_is_admin boolean := public.has_edit_role(v_actor_user_id);
  v_owner uuid;
  v_payment_id uuid;
  v_payment_amount numeric;
  v_current_status text;
  v_pm_id uuid;
  v_approved boolean := COALESCE((p_gateway ->> 'approved')::boolean, false);
  v_oid text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'oid', '')), '');
  v_gateway_amount numeric := NULLIF(BTRIM(COALESCE(p_gateway ->> 'chargetotal', '')), '')::numeric;
  v_response_code text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'association_response_code', '')), '');
  v_fail_rc text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'fail_rc', '')), '');
  v_hosteddataid text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'hosteddataid', '')), '');
  v_brand text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'card_brand', '')), '');
  v_last4 text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'card_last4', '')), '');
  v_cardholder text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'cardholder_name', '')), '');
  v_expiry_month integer := NULLIF(p_gateway ->> 'expiry_month', '')::integer;
  v_expiry_year integer := NULLIF(p_gateway ->> 'expiry_year', '')::integer;
  v_save_token boolean := COALESCE((p_gateway ->> 'save_token')::boolean, false);
  v_new_status text;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'settle_scotia_payment requires an order id';
  END IF;

  SELECT user_id INTO v_owner FROM public.orders WHERE id = p_order_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_actor_user_id IS NULL OR (v_actor_user_id <> v_owner AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'You do not have permission to settle this order.';
  END IF;

  IF v_oid IS NULL OR v_oid <> p_order_id::text THEN
    RAISE EXCEPTION 'Gateway order reference does not match this order.';
  END IF;

  SELECT id, amount, status
    INTO v_payment_id, v_payment_amount, v_current_status
  FROM public.order_payments
  WHERE order_id = p_order_id AND provider = 'scotia'
  FOR UPDATE;

  IF v_payment_id IS NULL THEN
    RAISE EXCEPTION 'No Scotia payment row found for order %', p_order_id;
  END IF;

  IF v_gateway_amount IS NULL OR ROUND(v_gateway_amount, 2) <> ROUND(v_payment_amount, 2) THEN
    RAISE EXCEPTION 'Gateway amount does not match the order payment.';
  END IF;

  -- A duplicate success callback is harmless; a later conflicting result may
  -- never downgrade an already-settled payment.
  IF v_current_status = 'settled' THEN
    IF v_approved THEN
      RETURN v_payment_id;
    END IF;
    RAISE EXCEPTION 'A settled payment cannot be changed by a later gateway result.';
  END IF;

  v_new_status := CASE WHEN v_approved THEN 'settled' ELSE 'failed' END;

  IF v_approved AND v_hosteddataid IS NOT NULL AND v_save_token THEN
    INSERT INTO public.customer_payment_methods (
      user_id, provider, payment_token, cardholder_name, brand, last4,
      expiry_month, expiry_year, is_default, is_demo, status
    )
    VALUES (
      v_owner, 'scotia', v_hosteddataid,
      COALESCE(v_cardholder, 'Cardholder'), COALESCE(v_brand, 'Card'),
      COALESCE(NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(v_last4, ''), '\D', '', 'g'), 4), ''), '0000'),
      COALESCE(v_expiry_month, 1), COALESCE(v_expiry_year, EXTRACT(year FROM now())::integer),
      COALESCE((SELECT COUNT(*) = 0 FROM public.customer_payment_methods WHERE user_id = v_owner AND status = 'active'), true),
      false, 'active'
    )
    ON CONFLICT (payment_token) DO UPDATE SET status = 'active', updated_at = now()
    RETURNING id INTO v_pm_id;
  END IF;

  UPDATE public.order_payments
  SET status = v_new_status,
      payment_method_id = COALESCE(v_pm_id, payment_method_id),
      payment_token = COALESCE(v_hosteddataid, payment_token),
      card_brand = COALESCE(v_brand, card_brand),
      card_last4 = COALESCE(NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(v_last4, ''), '\D', '', 'g'), 4), ''), card_last4),
      gateway_oid = v_oid,
      gateway_response_code = COALESCE(v_response_code, gateway_response_code),
      gateway_fail_rc = v_fail_rc,
      gateway_hosteddataid = COALESCE(v_hosteddataid, gateway_hosteddataid),
      metadata = metadata || jsonb_build_object('gateway', 'scotia', 'settled_by', v_actor_user_id, 'approved', v_approved),
      updated_at = now()
  WHERE id = v_payment_id;

  UPDATE public.orders
  SET status = CASE WHEN v_approved THEN 'confirmed' ELSE 'pending_payment' END,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_payment_events (payment_id, event_type, payload)
  VALUES (
    v_payment_id,
    CASE WHEN v_approved THEN 'scotia_payment_settled' ELSE 'scotia_payment_failed' END,
    jsonb_build_object(
      'settled_by', v_actor_user_id, 'approved', v_approved, 'oid', v_oid,
      'association_response_code', v_response_code, 'fail_rc', v_fail_rc,
      'gateway_amount', v_gateway_amount, 'token_saved', v_pm_id IS NOT NULL
    )
  );

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_scotia_payment(uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_scotia_payment(uuid, jsonb, uuid) TO service_role;
