-- ============================================================
-- B2B on-account checkout + B2C offline payment approval flow
-- ============================================================
-- Adds:
--   1. 'pending_review' to order_payments_status_check constraint
--   2. Updated place_customer_order() — routes on_account and
--      *_offline checkout methods to the correct order/payment statuses
--   3. approve_pending_payment(order_id) — admin RPC to approve
--      an offline/pending-payment order
-- ============================================================

-- 1. Expand order_payments status constraint to include pending_review
-- ---------------------------------------------------------------
ALTER TABLE public.order_payments
  DROP CONSTRAINT IF EXISTS order_payments_status_check;

ALTER TABLE public.order_payments
  ADD CONSTRAINT order_payments_status_check
  CHECK (status IN (
    'initiated',
    'authorized',
    'settled',
    'failed',
    'refunded',
    'void',
    'pending_review'
  ));

-- 2. Replace place_customer_order to handle new checkout methods
-- ---------------------------------------------------------------
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
  v_order_id uuid;
  v_payment_id uuid;
  v_profile record;
  v_shipping_address jsonb := NULL;
  v_billing_address jsonb := NULL;
  v_payment_method record;
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
  v_last4 text := RIGHT(REGEXP_REPLACE(COALESCE(p_checkout ->> 'card_last4', '0000'), '\D', '', 'g'), 4);
  v_expiry_month integer := COALESCE(NULLIF(p_checkout ->> 'expiry_month', '')::integer, 1);
  v_expiry_year integer := COALESCE(NULLIF(p_checkout ->> 'expiry_year', '')::integer, EXTRACT(year FROM now())::integer);
  v_save_payment_method boolean := COALESCE((p_checkout ->> 'save_payment_method')::boolean, false);
  v_new_payment_token text;
  v_item record;
  -- Derived state
  v_is_on_account boolean;
  v_is_offline_payment boolean;
  v_order_status text;
  v_payment_status text;
BEGIN
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'place_customer_order requires a target user id';
  END IF;

  IF v_actor_user_id IS NULL OR (v_actor_user_id <> p_target_user_id AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'You do not have permission to place this order.';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
  END IF;

  -- Determine checkout path
  v_is_on_account     := v_checkout_method = 'on_account';
  v_is_offline_payment := v_checkout_method IN ('stripe_offline', 'firstpay_offline', 'bimpay_offline');

  -- Order status: offline payments wait for admin approval; everything else goes straight to confirmed
  v_order_status := CASE
    WHEN v_is_offline_payment THEN 'pending_payment'
    WHEN v_is_on_account      THEN 'pending'
    ELSE                           'confirmed'
  END;

  -- Payment status: offline/account payments are not yet settled
  v_payment_status := CASE
    WHEN v_is_offline_payment OR v_is_on_account THEN 'initiated'
    ELSE                                               'settled'
  END;

  -- Payment provider label
  v_payment_provider := CASE
    WHEN v_is_on_account       THEN 'account'
    WHEN v_checkout_method = 'stripe_offline'   THEN 'stripe'
    WHEN v_checkout_method = 'firstpay_offline' THEN 'firstpay'
    WHEN v_checkout_method = 'bimpay_offline'   THEN 'bimpay'
    ELSE 'demo'
  END;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = p_target_user_id;

  -- Resolve shipping address
  IF v_shipping_address_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'recipient', recipient,
      'line1', line1,
      'line2', line2,
      'city', city,
      'state', state,
      'postalCode', postal_code,
      'country', country
    )
    INTO v_shipping_address
    FROM public.customer_addresses
    WHERE id = v_shipping_address_id
      AND user_id = p_target_user_id;
  ELSIF p_checkout ? 'shipping_address' THEN
    v_shipping_address := p_checkout -> 'shipping_address';
  END IF;

  -- Resolve billing address
  IF v_billing_address_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'recipient', recipient,
      'line1', line1,
      'line2', line2,
      'city', city,
      'state', state,
      'postalCode', postal_code,
      'country', country
    )
    INTO v_billing_address
    FROM public.customer_addresses
    WHERE id = v_billing_address_id
      AND user_id = p_target_user_id;
  ELSIF p_checkout ? 'billing_address' THEN
    v_billing_address := p_checkout -> 'billing_address';
  ELSE
    v_billing_address := v_shipping_address;
  END IF;

  -- Resolve demo card payment methods (existing path — skipped for on_account / offline)
  IF NOT v_is_on_account AND NOT v_is_offline_payment THEN
    IF v_payment_method_id IS NOT NULL THEN
      SELECT *
      INTO v_payment_method
      FROM public.customer_payment_methods
      WHERE id = v_payment_method_id
        AND user_id = p_target_user_id
        AND status = 'active';

      IF FOUND THEN
        v_payment_provider := COALESCE(v_payment_method.provider, 'demo');
        v_payment_brand := COALESCE(v_payment_method.brand, v_brand);
        v_payment_last4 := COALESCE(v_payment_method.last4, v_last4);
        v_payment_token := v_payment_method.payment_token;
      END IF;
    END IF;

    IF NOT FOUND AND COALESCE(NULLIF(v_last4, ''), '') <> '' AND char_length(v_last4) = 4 THEN
      v_new_payment_token := CONCAT('demo_', p_target_user_id::text, '_', floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text);

      IF v_save_payment_method THEN
        INSERT INTO public.customer_payment_methods (
          user_id,
          provider,
          payment_token,
          cardholder_name,
          brand,
          last4,
          expiry_month,
          expiry_year,
          is_default,
          is_demo
        )
        VALUES (
          p_target_user_id,
          'demo',
          v_new_payment_token,
          COALESCE(v_cardholder_name, v_full_name, COALESCE(v_profile.full_name, 'Cardholder')),
          v_brand,
          v_last4,
          v_expiry_month,
          v_expiry_year,
          COALESCE((SELECT COUNT(*) = 0 FROM public.customer_payment_methods WHERE user_id = p_target_user_id AND status = 'active'), true),
          true
        )
        RETURNING * INTO v_payment_method;
        v_payment_method_id := v_payment_method.id;
        v_payment_provider := COALESCE(v_payment_method.provider, 'demo');
        v_payment_brand := COALESCE(v_payment_method.brand, v_brand);
        v_payment_last4 := COALESCE(v_payment_method.last4, v_last4);
        v_payment_token := v_payment_method.payment_token;
      ELSE
        v_payment_provider := 'demo';
        v_payment_brand := v_brand;
        v_payment_last4 := v_last4;
        v_payment_token := v_new_payment_token;
      END IF;
    END IF;
  END IF;

  -- For on_account / offline, set neutral card placeholders
  IF v_is_on_account OR v_is_offline_payment THEN
    v_payment_brand := NULL;
    v_payment_last4 := NULL;
    v_payment_method_id := NULL;
  END IF;

  -- Calculate order total
  FOR v_item IN
    SELECT *
    FROM jsonb_to_recordset(p_items) AS x(
      product_id integer,
      product_name text,
      product_price numeric,
      product_type text,
      quantity integer
    )
  LOOP
    v_total_amount := v_total_amount + (COALESCE(v_item.product_price, 0) * GREATEST(COALESCE(v_item.quantity, 1), 1));
  END LOOP;

  -- Insert order
  INSERT INTO public.orders (
    user_id,
    total_amount,
    status,
    customer_name,
    contact_email,
    contact_phone,
    shipping_address,
    billing_address,
    checkout_method
  )
  VALUES (
    p_target_user_id,
    v_total_amount,
    v_order_status,
    COALESCE(v_full_name, v_profile.full_name, v_profile.display_name),
    COALESCE(v_email, (SELECT email FROM auth.users WHERE id = p_target_user_id)),
    COALESCE(v_phone, v_profile.phone),
    v_shipping_address,
    COALESCE(v_billing_address, v_shipping_address),
    v_checkout_method
  )
  RETURNING id INTO v_order_id;

  -- Insert order items
  INSERT INTO public.order_items (order_id, product_id, product_name, product_price, product_type, quantity)
  SELECT
    v_order_id,
    x.product_id,
    x.product_name,
    x.product_price,
    COALESCE(NULLIF(x.product_type, ''), 'lens'),
    GREATEST(COALESCE(x.quantity, 1), 1)
  FROM jsonb_to_recordset(p_items) AS x(
    product_id integer,
    product_name text,
    product_price numeric,
    product_type text,
    quantity integer
  );

  -- Insert payment record
  INSERT INTO public.order_payments (
    order_id,
    user_id,
    payment_method_id,
    amount,
    status,
    provider,
    payment_token,
    card_brand,
    card_last4,
    metadata
  )
  VALUES (
    v_order_id,
    p_target_user_id,
    v_payment_method_id,
    v_total_amount,
    v_payment_status,
    v_payment_provider,
    COALESCE(v_payment_token, v_new_payment_token),
    v_payment_brand,
    v_payment_last4,
    jsonb_build_object(
      'placed_by', v_actor_user_id,
      'on_behalf', v_actor_user_id <> p_target_user_id,
      'checkout_method', v_checkout_method
    )
  )
  RETURNING id INTO v_payment_id;

  -- Insert payment event
  INSERT INTO public.order_payment_events (payment_id, event_type, payload)
  VALUES (
    v_payment_id,
    CASE
      WHEN v_is_on_account      THEN 'account_order_placed'
      WHEN v_is_offline_payment THEN 'offline_payment_submitted'
      ELSE                           'payment_captured'
    END,
    jsonb_build_object(
      'placed_by', v_actor_user_id,
      'target_user_id', p_target_user_id,
      'amount', v_total_amount,
      'payment_method_id', v_payment_method_id,
      'checkout_method', v_checkout_method
    )
  );

  -- Update profile with latest contact / address info
  UPDATE public.profiles
  SET
    full_name = COALESCE(v_full_name, full_name),
    phone = COALESCE(v_phone, phone),
    shipping_address = COALESCE(v_shipping_address, shipping_address),
    billing_address = COALESCE(v_billing_address, billing_address),
    updated_at = now()
  WHERE user_id = p_target_user_id;

  -- Clear cart
  DELETE FROM public.cart_items
  WHERE user_id = p_target_user_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_customer_order(uuid, jsonb, jsonb, uuid) TO authenticated;

-- 3. Admin RPC: approve a pending offline payment order
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_pending_payment(
  p_order_id uuid,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order record;
  v_payment record;
  v_actor_user_id uuid := COALESCE(p_actor_user_id, auth.uid());
BEGIN
  -- Only admins and operators may approve
  IF NOT public.has_edit_role(v_actor_user_id) THEN
    RAISE EXCEPTION 'Only admins and operators can approve payments.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF v_order.status <> 'pending_payment' THEN
    RAISE EXCEPTION 'Order % is not in pending_payment status (current: %)', p_order_id, v_order.status;
  END IF;

  -- Move order to confirmed
  UPDATE public.orders
  SET status = 'confirmed', updated_at = now()
  WHERE id = p_order_id;

  -- Settle the payment record
  UPDATE public.order_payments
  SET status = 'settled', updated_at = now()
  WHERE order_id = p_order_id
    AND status IN ('initiated', 'pending_review');

  -- Record the approval event
  SELECT id INTO v_payment FROM public.order_payments WHERE order_id = p_order_id LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.order_payment_events (payment_id, event_type, payload)
    VALUES (
      v_payment.id,
      'payment_approved',
      jsonb_build_object(
        'approved_by', v_actor_user_id,
        'order_id', p_order_id
      )
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_pending_payment(uuid, uuid) TO authenticated;

-- 4. Admin RPC: fetch all orders across all users (for admin orders page)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_orders_admin(
  p_status_filter text DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  status text,
  total_amount numeric,
  checkout_method text,
  customer_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz,
  updated_at timestamptz,
  payment_status text,
  payment_provider text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_edit_role(COALESCE(p_status_filter::uuid, auth.uid())) THEN
    NULL; -- fall through — has_edit_role takes a uuid, this is a text arg, handle below
  END IF;

  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins and operators can view all orders.';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.user_id,
    o.status,
    o.total_amount,
    o.checkout_method,
    o.customer_name,
    o.contact_email,
    o.contact_phone,
    o.created_at,
    o.updated_at,
    p.status AS payment_status,
    p.provider AS payment_provider
  FROM public.orders o
  LEFT JOIN LATERAL (
    SELECT status, provider
    FROM public.order_payments
    WHERE order_id = o.id
    ORDER BY created_at DESC
    LIMIT 1
  ) p ON true
  WHERE (p_status_filter IS NULL OR o.status = p_status_filter)
  ORDER BY o.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_orders_admin(text, integer, integer) TO authenticated;
