-- ============================================================
-- settle_scotia_payment() — record a Scotia eCom+ gateway outcome
-- ------------------------------------------------------------
-- Called by the checkout flow AFTER place_customer_order() has created the
-- order (with checkout_method='scotia_ecom') and the buyer has completed the
-- hosted payment inside the iframe. This RPC patches the order's payment row
-- with the verified gateway result and, when a token was returned, saves it
-- as a reusable 'scotia' payment method.
--
-- SECURITY: the caller may only settle their own order (or an admin acting on
-- their behalf). The response hash is validated server-side in the
-- `scotia-payment` Edge Function BEFORE this RPC is called; p_gateway carries
-- only the already-verified, whitelisted fields.
-- ============================================================

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
  v_pm_id uuid;
  -- Gateway fields (validated upstream by the Edge Function)
  v_approved boolean := COALESCE((p_gateway ->> 'approved')::boolean, false);
  v_oid text := NULLIF(BTRIM(COALESCE(p_gateway ->> 'oid', '')), '');
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

  v_new_status := CASE WHEN v_approved THEN 'settled' ELSE 'failed' END;

  -- 1. Optionally persist the returned token as a reusable Scotia card.
  IF v_approved AND v_hosteddataid IS NOT NULL AND v_save_token THEN
    INSERT INTO public.customer_payment_methods (
      user_id, provider, payment_token, cardholder_name, brand, last4,
      expiry_month, expiry_year, is_default, is_demo, status
    )
    VALUES (
      v_owner,
      'scotia',
      v_hosteddataid,
      COALESCE(v_cardholder, 'Cardholder'),
      COALESCE(v_brand, 'Card'),
      COALESCE(NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(v_last4, ''), '\D', '', 'g'), 4), ''), '0000'),
      COALESCE(v_expiry_month, 1),
      COALESCE(v_expiry_year, EXTRACT(year FROM now())::integer),
      COALESCE((SELECT COUNT(*) = 0 FROM public.customer_payment_methods
                WHERE user_id = v_owner AND status = 'active'), true),
      false,
      'active'
    )
    ON CONFLICT (payment_token) DO UPDATE
      SET status = 'active', updated_at = now()
    RETURNING id INTO v_pm_id;
  END IF;

  -- 2. Patch the order's payment row with the verified gateway result.
  UPDATE public.order_payments
  SET
    provider = 'scotia',
    status = v_new_status,
    payment_method_id = COALESCE(v_pm_id, payment_method_id),
    payment_token = COALESCE(v_hosteddataid, payment_token),
    card_brand = COALESCE(v_brand, card_brand),
    card_last4 = COALESCE(NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(v_last4, ''), '\D', '', 'g'), 4), ''), card_last4),
    gateway_oid = COALESCE(v_oid, gateway_oid),
    gateway_response_code = COALESCE(v_response_code, gateway_response_code),
    gateway_fail_rc = v_fail_rc,
    gateway_hosteddataid = COALESCE(v_hosteddataid, gateway_hosteddataid),
    metadata = metadata || jsonb_build_object(
      'gateway', 'scotia',
      'settled_by', v_actor_user_id,
      'approved', v_approved
    ),
    updated_at = now()
  WHERE order_id = p_order_id
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    RAISE EXCEPTION 'No payment row found for order %', p_order_id;
  END IF;

  -- 3. Reflect the outcome on the order itself.
  UPDATE public.orders
  SET status = CASE WHEN v_approved THEN 'confirmed' ELSE 'pending_payment' END,
      updated_at = now()
  WHERE id = p_order_id;

  -- 4. Audit event.
  INSERT INTO public.order_payment_events (payment_id, event_type, payload)
  VALUES (
    v_payment_id,
    CASE WHEN v_approved THEN 'scotia_payment_settled' ELSE 'scotia_payment_failed' END,
    jsonb_build_object(
      'settled_by', v_actor_user_id,
      'approved', v_approved,
      'oid', v_oid,
      'association_response_code', v_response_code,
      'fail_rc', v_fail_rc,
      'token_saved', v_pm_id IS NOT NULL
    )
  );

  RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_scotia_payment(uuid, jsonb, uuid) TO authenticated;
