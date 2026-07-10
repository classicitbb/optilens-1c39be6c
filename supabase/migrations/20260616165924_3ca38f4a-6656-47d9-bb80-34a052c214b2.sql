CREATE OR REPLACE FUNCTION public.place_customer_order(
  p_target_user_id uuid,
  p_items jsonb,
  p_checkout jsonb DEFAULT '{}'::jsonb,
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
  v_is_self_checkout boolean := v_actor_user_id = p_target_user_id;
  v_order_id uuid;
  v_payment_id uuid;
  v_auth_user auth.users%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_payment_method public.customer_payment_methods%ROWTYPE;
  v_shipping_address jsonb := NULL;
  v_billing_address jsonb := NULL;
  v_payment_provider text := 'demo';
  v_payment_brand text := 'Visa';
  v_payment_last4 text := '0000';
  v_payment_token text := NULL;
  v_payment_method_id uuid := NULLIF(p_checkout ->> 'payment_method_id', '')::uuid;
  v_shipping_address_id uuid := NULLIF(p_checkout ->> 'shipping_address_id', '')::uuid;
  v_billing_address_id uuid := NULLIF(p_checkout ->> 'billing_address_id', '')::uuid;
  v_full_name text := NULLIF(BTRIM(COALESCE(p_checkout ->> 'full_name', '')), '');
  v_email text := NULLIF(BTRIM(COALESCE(p_checkout ->> 'email', '')), '');
  v_phone text := NULLIF(BTRIM(COALESCE(p_checkout ->> 'phone', '')), '');
  v_checkout_method text := COALESCE(NULLIF(BTRIM(p_checkout ->> 'checkout_method'), ''), 'saved_demo_card');
  v_total_amount numeric := 0;
  v_cardholder_name text := NULLIF(BTRIM(COALESCE(p_checkout ->> 'cardholder_name', '')), '');
  v_brand text := COALESCE(NULLIF(BTRIM(p_checkout ->> 'card_brand'), ''), 'Visa');
  v_last4 text := RIGHT(REGEXP_REPLACE(COALESCE(p_checkout ->> 'card_last4', ''), '\D', '', 'g'), 4);
  v_expiry_month integer := COALESCE(NULLIF(p_checkout ->> 'expiry_month', '')::integer, 1);
  v_expiry_year integer := COALESCE(NULLIF(p_checkout ->> 'expiry_year', '')::integer, EXTRACT(year FROM now())::integer);
  v_save_payment_method boolean := COALESCE((p_checkout ->> 'save_payment_method')::boolean, false);
  v_new_payment_token text := NULL;
  v_profile_found boolean := false;
  v_saved_payment_found boolean := false;
  v_has_manual_card boolean := false;
  v_should_capture_payment boolean := false;
  v_order_status text := 'pending';
  v_payment_status text := 'initiated';
  v_payment_event_type text := 'payment_pending';
  v_item record;
BEGIN
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'place_customer_order requires a target user id';
  END IF;

  IF v_actor_user_id IS NULL OR (NOT v_is_self_checkout AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'You do not have permission to place this order.';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
  END IF;

  IF v_checkout_method NOT IN (
    'saved_demo_card', 'new_demo_card', 'google_pay', 'manual_review',
    'on_account', 'stripe_offline', 'firstpay_offline'
  ) THEN
    RAISE EXCEPTION 'Unsupported checkout method.';
  END IF;

  IF v_is_self_checkout AND v_checkout_method = 'manual_review' AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Customers cannot place manual-review orders.';
  END IF;

  SELECT * INTO v_auth_user FROM auth.users WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No account found for this order.';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = p_target_user_id;
  v_profile_found := FOUND;

  IF NOT v_profile_found THEN
    INSERT INTO public.profiles (user_id, full_name, phone, email)
    VALUES (
      p_target_user_id,
      COALESCE(v_full_name, NULLIF(BTRIM(COALESCE(v_auth_user.raw_user_meta_data ->> 'full_name', '')), '')),
      v_phone,
      v_auth_user.email
    )
    RETURNING * INTO v_profile;
  END IF;

  IF v_shipping_address_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'recipient', recipient, 'line1', line1, 'line2', line2,
      'city', city, 'state', state, 'postalCode', postal_code, 'country', country
    )
    INTO v_shipping_address
    FROM public.customer_addresses
    WHERE id = v_shipping_address_id AND user_id = p_target_user_id;
  ELSIF p_checkout ? 'shipping_address' THEN
    v_shipping_address := p_checkout -> 'shipping_address';
  ELSE
    v_shipping_address := COALESCE(v_profile.shipping_address, NULL);
  END IF;

  IF v_billing_address_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'recipient', recipient, 'line1', line1, 'line2', line2,
      'city', city, 'state', state, 'postalCode', postal_code, 'country', country
    )
    INTO v_billing_address
    FROM public.customer_addresses
    WHERE id = v_billing_address_id AND user_id = p_target_user_id;
  ELSIF p_checkout ? 'billing_address' THEN
    v_billing_address := p_checkout -> 'billing_address';
  ELSE
    v_billing_address := COALESCE(v_profile.billing_address, v_shipping_address);
  END IF;

  IF COALESCE(NULLIF(BTRIM(COALESCE(v_shipping_address ->> 'line1', '')), ''), '') = ''
    OR COALESCE(NULLIF(BTRIM(COALESCE(v_shipping_address ->> 'country', '')), ''), '') = '' THEN
    RAISE EXCEPTION 'A shipping address is required to place an order.';
  END IF;

  IF v_payment_method_id IS NOT NULL THEN
    SELECT * INTO v_payment_method
    FROM public.customer_payment_methods
    WHERE id = v_payment_method_id AND user_id = p_target_user_id AND status = 'active';
    v_saved_payment_found := FOUND;
    IF v_saved_payment_found THEN
      v_payment_provider := COALESCE(v_payment_method.provider, 'demo');
      v_payment_brand := COALESCE(v_payment_method.brand, v_brand);
      v_payment_last4 := COALESCE(v_payment_method.last4, NULLIF(v_last4, ''));
      v_payment_token := v_payment_method.payment_token;
      v_should_capture_payment := true;
    END IF;
  END IF;

  v_has_manual_card := char_length(COALESCE(v_last4, '')) = 4;

  IF v_checkout_method = 'saved_demo_card' AND NOT v_saved_payment_found THEN
    IF v_is_self_checkout THEN
      RAISE EXCEPTION 'Select a saved payment method before placing your order.';
    ELSE
      RAISE EXCEPTION 'Saved payment method is no longer available for this customer.';
    END IF;
  END IF;

  IF v_checkout_method = 'new_demo_card' THEN
    IF NOT v_has_manual_card THEN
      RAISE EXCEPTION 'Enter a valid 4-digit demo card reference before placing the order.';
    END IF;
    v_new_payment_token := CONCAT('demo_', p_target_user_id::text, '_', floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text);
    v_payment_provider := 'demo';
    v_payment_brand := v_brand;
    v_payment_last4 := v_last4;
    v_payment_token := v_new_payment_token;
    v_should_capture_payment := true;

    IF v_save_payment_method THEN
      INSERT INTO public.customer_payment_methods (
        user_id, provider, payment_token, cardholder_name, brand, last4,
        expiry_month, expiry_year, is_default, is_demo
      )
      VALUES (
        p_target_user_id, 'demo', v_new_payment_token,
        COALESCE(v_cardholder_name, v_full_name, v_profile.full_name, 'Cardholder'),
        v_brand, v_last4, v_expiry_month, v_expiry_year,
        COALESCE((SELECT COUNT(*) = 0 FROM public.customer_payment_methods WHERE user_id = p_target_user_id AND status = 'active'), true),
        true
      )
      RETURNING * INTO v_payment_method;
      v_payment_method_id := v_payment_method.id;
    END IF;
  ELSIF v_checkout_method = 'google_pay' THEN
    v_payment_provider := 'google_pay';
    v_payment_brand := COALESCE(NULLIF(v_brand, ''), 'Google Pay');
    v_payment_last4 := NULLIF(v_last4, '');
    v_payment_token := CONCAT('google_pay_', p_target_user_id::text, '_', floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text);
    v_should_capture_payment := true;
  ELSIF v_checkout_method = 'manual_review' THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Only staff can create manual-review orders.';
    END IF;
    v_payment_provider := 'manual';
    v_payment_brand := 'Manual review';
    v_payment_last4 := NULL;
    v_payment_token := NULL;
    v_should_capture_payment := false;
  ELSIF v_checkout_method = 'on_account' THEN
    v_payment_provider := 'on_account';
    v_payment_brand := 'On account (Net-30)';
    v_payment_last4 := NULL;
    v_payment_token := NULL;
    v_should_capture_payment := false;
  ELSIF v_checkout_method = 'stripe_offline' THEN
    v_payment_provider := 'stripe_offline';
    v_payment_brand := 'Stripe (offline)';
    v_payment_last4 := NULL;
    v_payment_token := NULL;
    v_should_capture_payment := false;
  ELSIF v_checkout_method = 'firstpay_offline' THEN
    v_payment_provider := 'firstpay_offline';
    v_payment_brand := 'FirstPay (offline)';
    v_payment_last4 := NULL;
    v_payment_token := NULL;
    v_should_capture_payment := false;
  END IF;

  IF v_is_self_checkout
     AND NOT v_should_capture_payment
     AND NOT v_is_admin
     AND v_checkout_method NOT IN ('on_account', 'stripe_offline', 'firstpay_offline') THEN
    RAISE EXCEPTION 'Payment details are required before you can place your order.';
  END IF;

  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) AS x(
      product_id integer, product_name text, product_price numeric, product_type text, quantity integer
    )
  LOOP
    v_total_amount := v_total_amount + (COALESCE(v_item.product_price, 0) * GREATEST(COALESCE(v_item.quantity, 1), 1));
  END LOOP;

  v_order_status := CASE WHEN v_should_capture_payment THEN 'confirmed' ELSE 'pending' END;
  v_payment_status := CASE WHEN v_should_capture_payment THEN 'settled' ELSE 'initiated' END;
  v_payment_event_type := CASE WHEN v_should_capture_payment THEN 'payment_captured' ELSE 'payment_pending' END;

  INSERT INTO public.orders (
    user_id, total_amount, status, customer_name, contact_email, contact_phone,
    shipping_address, billing_address, checkout_method
  )
  VALUES (
    p_target_user_id, v_total_amount, v_order_status,
    COALESCE(v_full_name, NULLIF(BTRIM(COALESCE(v_profile.full_name, '')), ''), NULLIF(BTRIM(COALESCE(v_profile.display_name, '')), ''), NULLIF(BTRIM(COALESCE(v_auth_user.raw_user_meta_data ->> 'full_name', '')), ''), COALESCE(v_auth_user.email, 'Customer')),
    COALESCE(v_email, NULLIF(BTRIM(COALESCE(v_auth_user.email, '')), '')),
    COALESCE(v_phone, NULLIF(BTRIM(COALESCE(v_profile.phone, '')), '')),
    v_shipping_address, COALESCE(v_billing_address, v_shipping_address), v_checkout_method
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, product_name, product_price, product_type, quantity)
  SELECT v_order_id, x.product_id, x.product_name, x.product_price,
    COALESCE(NULLIF(x.product_type, ''), 'lens'), GREATEST(COALESCE(x.quantity, 1), 1)
  FROM jsonb_to_recordset(p_items) AS x(
    product_id integer, product_name text, product_price numeric, product_type text, quantity integer
  );

  INSERT INTO public.order_payments (
    order_id, user_id, payment_method_id, amount, status, provider,
    payment_token, card_brand, card_last4, metadata
  )
  VALUES (
    v_order_id, p_target_user_id, v_payment_method_id, v_total_amount,
    v_payment_status, v_payment_provider, v_payment_token, v_payment_brand, v_payment_last4,
    jsonb_build_object(
      'placed_by', v_actor_user_id,
      'on_behalf', NOT v_is_self_checkout,
      'staff_self_order', v_is_self_checkout AND v_is_admin,
      'checkout_method', v_checkout_method,
      'requires_manual_payment_review', NOT v_should_capture_payment
    )
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO public.order_payment_events (payment_id, event_type, payload)
  VALUES (
    v_payment_id, v_payment_event_type,
    jsonb_build_object(
      'placed_by', v_actor_user_id, 'target_user_id', p_target_user_id,
      'amount', v_total_amount, 'payment_method_id', v_payment_method_id,
      'staff_self_order', v_is_self_checkout AND v_is_admin,
      'requires_manual_payment_review', NOT v_should_capture_payment
    )
  );

  INSERT INTO public.profiles (
    user_id, full_name, phone, shipping_address, billing_address
  )
  VALUES (
    p_target_user_id,
    COALESCE(v_full_name, v_profile.full_name),
    COALESCE(v_phone, v_profile.phone),
    COALESCE(v_shipping_address, v_profile.shipping_address),
    COALESCE(v_billing_address, v_profile.billing_address)
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    shipping_address = COALESCE(EXCLUDED.shipping_address, public.profiles.shipping_address),
    billing_address = COALESCE(EXCLUDED.billing_address, public.profiles.billing_address),
    updated_at = now();

  DELETE FROM public.cart_items WHERE user_id = p_target_user_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_customer_order(uuid, jsonb, jsonb, uuid) TO authenticated;