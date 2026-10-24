-- Direct credit-account Rx submissions bypass normal cart checkout, so they
-- must supply the authenticated account's saved shipping address themselves.
CREATE OR REPLACE FUNCTION public.place_rx_order_direct(
  p_items jsonb,
  p_checkout jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_cart jsonb;
  v_checkout jsonb;
  v_shipping_address jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to place an order.';
  END IF;

  IF NOT public.is_credit_approved_portal_user(v_user) THEN
    RAISE EXCEPTION 'Instant Rx submission is only available on credit-approved accounts.';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) <> 1 THEN
    RAISE EXCEPTION 'A direct Rx submission carries exactly one Rx job.';
  END IF;

  IF COALESCE(p_items -> 0 -> 'variant_metadata' ->> 'rx_quote_id', '') !~* '^[0-9a-f-]{36}$' THEN
    RAISE EXCEPTION 'A direct Rx submission must carry its rx_quote_id.';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
  INTO v_cart
  FROM public.cart_items c
  WHERE c.user_id = v_user;

  -- Keep address resolution tied to the authenticated customer. Match the
  -- portal's default-first, oldest-address fallback and then the legacy
  -- profile address. place_customer_order() still enforces line1 and country.
  SELECT jsonb_build_object(
    'recipient', recipient, 'line1', line1, 'line2', line2,
    'city', city, 'state', state, 'postalCode', postal_code, 'country', country
  )
  INTO v_shipping_address
  FROM public.customer_addresses
  WHERE user_id = v_user
  ORDER BY is_default_shipping DESC, created_at ASC
  LIMIT 1;

  IF v_shipping_address IS NULL THEN
    SELECT shipping_address
    INTO v_shipping_address
    FROM public.profiles
    WHERE user_id = v_user;
  END IF;

  v_checkout := COALESCE(p_checkout, '{}'::jsonb)
    || jsonb_build_object('checkout_method', 'on_account');
  IF v_shipping_address IS NOT NULL THEN
    v_checkout := jsonb_set(v_checkout, '{shipping_address}', v_shipping_address, true);
  END IF;

  v_order_id := public.place_customer_order(v_user, p_items, v_checkout, v_user);

  IF jsonb_array_length(v_cart) > 0 THEN
    INSERT INTO public.cart_items
    SELECT * FROM jsonb_populate_recordset(NULL::public.cart_items, v_cart);
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_rx_order_direct(jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.place_rx_order_direct(jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.place_rx_order_direct(jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.place_rx_order_direct(jsonb, jsonb) IS
  'Places one Rx job on a credit-approved account, using its saved shipping address and leaving cart_items intact.';
