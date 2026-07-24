-- ============================================================
-- Scotia eCom+ — switch from embedded IFRAME to full-page redirect
-- ------------------------------------------------------------
-- test.ipg-online.com refuses to be framed cross-origin (X-Frame-Options /
-- frame-ancestors from Fiserv's side, not our CSP), so the integration moves
-- to "Direct Sale" mode (manual page 11): full-page redirect to the gateway,
-- then a browser-POSTed return to a new public `scotia-return` Edge Function,
-- which validates the hash and settles the outcome via service role.
--
-- Idempotent / safe to re-run, and self-contained regardless of whether the
-- earlier 20260723150000_statement_card_payments.sql migration was applied.
-- ============================================================

-- ── 1. account_payments: ensure it exists, add a 'pending' status ──────────
-- ('pending' = intent created before redirecting to Scotia; the gateway
-- return flips it to 'settled' or 'failed'.)
CREATE TABLE IF NOT EXISTS public.account_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crm_customer_id integer,
  account_number text,
  statement_id text,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT '840',
  provider text NOT NULL DEFAULT 'scotia',
  status text NOT NULL DEFAULT 'pending',
  gateway_oid text,
  gateway_response_code text,
  gateway_fail_rc text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_payments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.account_payments ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS account_payments_user_idx ON public.account_payments(user_id);
CREATE INDEX IF NOT EXISTS account_payments_gateway_oid_idx
  ON public.account_payments(gateway_oid) WHERE gateway_oid IS NOT NULL;

DROP TRIGGER IF EXISTS update_account_payments_updated_at ON public.account_payments;
CREATE TRIGGER update_account_payments_updated_at
  BEFORE UPDATE ON public.account_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.account_payments DROP CONSTRAINT IF EXISTS account_payments_status_check;
DO $do$ BEGIN
  ALTER TABLE public.account_payments
    ADD CONSTRAINT account_payments_status_check
    CHECK (status IN ('pending', 'settled', 'failed'));
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; -- already present → fine
END $do$;

ALTER TABLE public.account_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own or staff account_payments" ON public.account_payments;
CREATE POLICY "Read own or staff account_payments"
  ON public.account_payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "No direct writes to account_payments" ON public.account_payments;
CREATE POLICY "No direct writes to account_payments"
  ON public.account_payments FOR ALL
  TO authenticated
  USING (false) WITH CHECK (false);

-- ── 2. create_pending_statement_payment() ───────────────────────────────────
-- Called by the authenticated buyer's browser BEFORE redirecting to Scotia,
-- while a normal session still exists. Returns the payment id, which becomes
-- the gateway `oid` (as "STMT-<id>") so scotia-return can find it again after
-- the buyer comes back with no session at all.
CREATE OR REPLACE FUNCTION public.create_pending_statement_payment(
  p_amount numeric,
  p_statement_id text DEFAULT NULL,
  p_crm_customer_id integer DEFAULT NULL,
  p_account_number text DEFAULT NULL,
  p_actor_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := COALESCE(p_actor_user_id, auth.uid());
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  IF v_actor <> auth.uid() AND NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'You do not have permission to start this payment.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'create_pending_statement_payment requires a positive amount';
  END IF;

  INSERT INTO public.account_payments (
    user_id, crm_customer_id, account_number, statement_id, amount, status
  ) VALUES (
    v_actor,
    p_crm_customer_id,
    NULLIF(BTRIM(COALESCE(p_account_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_statement_id, '')), ''),
    ROUND(p_amount, 2),
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.create_pending_statement_payment(numeric, text, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pending_statement_payment(numeric, text, integer, text, uuid) TO authenticated;

-- ── 3. settle_statement_payment() — REPLACED signature ──────────────────────
-- Old shape (amount/statement_id/... + insert-a-fresh-row) belonged to the
-- iframe design. Redirect mode always has a pre-created pending row, so this
-- now just flips that row to settled/failed by id. Service-role only: called
-- exclusively by scotia-return AFTER it has independently verified the
-- gateway's response hash — no client should ever call this directly.
DROP FUNCTION IF EXISTS public.settle_statement_payment(numeric, text, integer, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.settle_statement_payment(
  p_payment_id uuid,
  p_gateway jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approved boolean := COALESCE((p_gateway ->> 'approved')::boolean, false);
  v_updated_id uuid;
BEGIN
  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'settle_statement_payment requires a payment id';
  END IF;

  UPDATE public.account_payments
  SET
    status = CASE WHEN v_approved THEN 'settled' ELSE 'failed' END,
    gateway_oid = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'oid', '')), ''), gateway_oid),
    gateway_response_code = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'association_response_code', '')), ''), gateway_response_code),
    gateway_fail_rc = NULLIF(BTRIM(COALESCE(p_gateway ->> 'fail_rc', '')), ''),
    currency = COALESCE(NULLIF(BTRIM(COALESCE(p_gateway ->> 'currency', '')), ''), currency)
  WHERE id = p_payment_id AND status = 'pending'
  RETURNING id INTO v_updated_id;

  -- No row matched: either a bad id, or (more likely) a replay — Fiserv or the
  -- buyer's browser re-posting the same return. Treat as a no-op, not a hard
  -- error, so a retry doesn't 500 the redirect.
  IF v_updated_id IS NULL THEN
    SELECT id INTO v_updated_id FROM public.account_payments WHERE id = p_payment_id;
    IF v_updated_id IS NULL THEN
      RAISE EXCEPTION 'No statement payment found for id %', p_payment_id;
    END IF;
  END IF;

  RETURN v_updated_id;
END; $$;

REVOKE ALL ON FUNCTION public.settle_statement_payment(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_statement_payment(uuid, jsonb) TO service_role;

-- ── 4. settle_scotia_payment() — tighten grants ──────────────────────────────
-- Previously callable by any authenticated session (client called it directly
-- after the iframe's postMessage). Redirect mode settles exclusively from
-- scotia-return via service role, so close that off — this also closes a
-- latent gap where any authenticated user could pass an arbitrary
-- p_actor_user_id matching an order's owner and settle someone else's order.
REVOKE ALL ON FUNCTION public.settle_scotia_payment(uuid, jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_scotia_payment(uuid, jsonb, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.settle_scotia_payment(uuid, jsonb, uuid) TO service_role;

-- ── 5. place_customer_order() — accept 'scotia_ecom' ─────────────────────────
-- Pre-existing gap: the checkout_method whitelist never included
-- 'scotia_ecom', so every Scotia order (iframe OR redirect) would fail at
-- "Unsupported checkout method." Redirect mode needs the order created
-- (pending) BEFORE sending the buyer to the gateway, so this must work.
CREATE OR REPLACE FUNCTION public.place_customer_order(p_target_user_id uuid, p_items jsonb, p_checkout jsonb DEFAULT '{}'::jsonb, p_actor_user_id uuid DEFAULT auth.uid())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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
    'on_account', 'stripe_offline', 'firstpay_offline', 'bimpay_offline',
    'scotia_ecom'
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
  ELSIF v_checkout_method = 'bimpay_offline' THEN
    v_payment_provider := 'bimpay_offline';
    v_payment_brand := 'BimPay (offline)';
    v_payment_last4 := NULL;
    v_payment_token := NULL;
    v_should_capture_payment := false;
  ELSIF v_checkout_method = 'scotia_ecom' THEN
    -- Order is created BEFORE the buyer is redirected to Scotia (redirect
    -- mode needs the order id to hand the gateway as `oid`). Payment is not
    -- yet captured — settle_scotia_payment (called by scotia-return, service
    -- role, after the buyer comes back) flips order + order_payments status
    -- based on the verified gateway result.
    v_payment_provider := 'scotia';
    v_payment_brand := 'Scotiabank (eCom+)';
    v_payment_last4 := NULL;
    v_payment_token := NULL;
    v_should_capture_payment := false;
  END IF;

  IF v_is_self_checkout
     AND NOT v_should_capture_payment
     AND NOT v_is_admin
     AND v_checkout_method NOT IN ('on_account', 'stripe_offline', 'firstpay_offline', 'bimpay_offline', 'scotia_ecom') THEN
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
$function$;
