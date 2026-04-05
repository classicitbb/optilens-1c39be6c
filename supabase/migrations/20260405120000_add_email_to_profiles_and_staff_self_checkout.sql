-- ============================================================================
-- 1. Add email column to profiles and backfill from auth.users
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- ============================================================================
-- 2. Trigger: keep profiles.email in sync when auth.users.email changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_auth_email_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE user_id = NEW.id
    AND (email IS DISTINCT FROM NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_email_to_profile();

-- ============================================================================
-- 3. Update handle_new_user to include email on profile creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. Belt-and-suspenders: also sync email in sync_customer_portal_identity
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_customer_portal_identity(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  profile_id uuid,
  portal_access_status text,
  portal_access_note text,
  email_verified boolean,
  profile_completed boolean,
  crm_contact_id uuid,
  crm_customer_id integer,
  assigned_pricelist_id integer,
  organization_name text,
  customer_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_contact public.contacts%ROWTYPE;
  v_parent_company_id uuid;
  v_customer public.customers%ROWTYPE;
  v_email text;
  v_email_verified boolean := false;
  v_profile_completed boolean := false;
  v_contact_found boolean := false;
  v_customer_found boolean := false;
  v_status text := 'pending_profile';
  v_note text := 'Complete your profile to create your CRM contact.';
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'sync_customer_portal_identity requires a user id';
  END IF;

  SELECT * INTO v_user
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No auth user found for %', p_user_id;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, email)
    VALUES (p_user_id, v_user.email)
    RETURNING * INTO v_profile;
  END IF;

  v_email := NULLIF(BTRIM(v_user.email), '');
  v_email_verified := v_user.email_confirmed_at IS NOT NULL;
  v_profile_completed := COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), NULL) IS NOT NULL
    AND COALESCE(NULLIF(BTRIM(v_profile.phone), ''), NULL) IS NOT NULL;

  IF COALESCE(NULLIF(BTRIM(v_profile.organization_name), ''), NULL) IS NOT NULL THEN
    SELECT id
    INTO v_parent_company_id
    FROM public.contacts
    WHERE is_company = true
      AND lower(name) = lower(BTRIM(v_profile.organization_name))
    ORDER BY is_customer DESC, updated_at DESC
    LIMIT 1;
  END IF;

  IF v_email_verified AND v_profile_completed THEN
    IF v_profile.crm_contact_id IS NOT NULL THEN
      SELECT * INTO v_contact
      FROM public.contacts
      WHERE id = v_profile.crm_contact_id;
      v_contact_found := FOUND;
    END IF;

    IF NOT v_contact_found AND v_email IS NOT NULL THEN
      SELECT * INTO v_contact
      FROM public.contacts
      WHERE lower(COALESCE(email, '')) = lower(v_email)
      ORDER BY is_customer DESC, updated_at DESC
      LIMIT 1;
      v_contact_found := FOUND;
    END IF;

    IF NOT v_contact_found THEN
      INSERT INTO public.contacts (
        name,
        email,
        phone,
        is_company,
        type,
        business_name,
        parent_id,
        country,
        status,
        is_customer,
        pipeline_stage
      )
      VALUES (
        COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), COALESCE(v_email, 'Customer contact')),
        v_email,
        NULLIF(BTRIM(v_profile.phone), ''),
        false,
        'individual',
        NULLIF(BTRIM(v_profile.organization_name), ''),
        v_parent_company_id,
        'Barbados',
        'lead',
        false,
        'New'
      )
      RETURNING * INTO v_contact;
      v_contact_found := true;
    ELSE
      UPDATE public.contacts
      SET
        name = COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), v_contact.name),
        email = COALESCE(v_email, v_contact.email),
        phone = COALESCE(NULLIF(BTRIM(v_profile.phone), ''), v_contact.phone),
        type = CASE WHEN v_contact.is_company THEN v_contact.type ELSE 'individual' END,
        business_name = COALESCE(NULLIF(BTRIM(v_profile.organization_name), ''), v_contact.business_name),
        parent_id = COALESCE(v_parent_company_id, v_contact.parent_id)
      WHERE id = v_contact.id
      RETURNING * INTO v_contact;
      v_contact_found := true;
    END IF;

    IF v_contact.is_customer THEN
      SELECT * INTO v_customer
      FROM public.customers
      WHERE contact_id = v_contact.id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 1;
      v_customer_found := FOUND;

      IF NOT v_customer_found THEN
        INSERT INTO public.customers (
          name,
          email,
          phone,
          address,
          type,
          pipeline_stage,
          contact_id
        )
        VALUES (
          v_contact.name,
          v_contact.email,
          v_contact.phone,
          NULLIF(v_contact.address, ''),
          CASE WHEN v_contact.is_company THEN 'Company' ELSE 'Person' END,
          COALESCE(NULLIF(v_contact.pipeline_stage, ''), 'Prospect'),
          v_contact.id
        )
        RETURNING * INTO v_customer;
        v_customer_found := true;
      END IF;
    ELSE
      SELECT * INTO v_customer
      FROM public.customers
      WHERE contact_id = v_contact.id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT 1;
      v_customer_found := FOUND;
    END IF;

    IF v_customer_found AND v_customer.id IS NOT NULL THEN
      v_status := 'approved_customer';
      v_note := 'Your account is approved for quotes, helpdesk, pricelists, and private-order workflows.';
    ELSE
      v_status := 'pending_approval';
      v_note := 'Your CRM contact is ready. Customer-only workflows unlock after team approval.';
    END IF;
  ELSIF NOT v_email_verified THEN
    v_status := 'pending_verification';
    v_note := 'Verify your email address to activate your CRM contact and customer workflow.';
  ELSE
    v_status := 'pending_profile';
    v_note := 'Complete your profile with your full name and phone number to activate your CRM contact.';
  END IF;

  UPDATE public.profiles
  SET
    email = COALESCE(v_email, email),
    email_verified_at = CASE WHEN v_email_verified THEN COALESCE(email_verified_at, now()) ELSE NULL END,
    profile_completed_at = CASE WHEN v_profile_completed THEN COALESCE(profile_completed_at, now()) ELSE NULL END,
    crm_contact_id = v_contact.id,
    crm_customer_id = v_customer.id,
    portal_access_status = v_status,
    portal_access_note = v_note
  WHERE user_id = p_user_id
  RETURNING * INTO v_profile;

  RETURN QUERY
  SELECT
    v_profile.id,
    v_profile.portal_access_status,
    COALESCE(v_profile.portal_access_note, v_note),
    v_email_verified,
    v_profile_completed,
    v_profile.crm_contact_id,
    v_profile.crm_customer_id,
    v_customer.assigned_pricelist_id,
    v_profile.organization_name,
    v_customer.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_customer_portal_identity(uuid) TO authenticated;

-- ============================================================================
-- 5. Update place_customer_order: allow staff manual_review self-checkout
--    and tag staff self-orders in payment metadata
-- ============================================================================

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

  IF v_checkout_method NOT IN ('saved_demo_card', 'new_demo_card', 'google_pay', 'manual_review') THEN
    RAISE EXCEPTION 'Unsupported checkout method.';
  END IF;

  -- Allow staff (admin/operator) to use manual_review for self-checkout;
  -- only block non-staff customers from manual_review.
  IF v_is_self_checkout AND v_checkout_method = 'manual_review' AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Customers cannot place manual-review orders.';
  END IF;

  SELECT *
  INTO v_auth_user
  FROM auth.users
  WHERE id = p_target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No account found for this order.';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = p_target_user_id;

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
  ELSE
    v_shipping_address := COALESCE(v_profile.shipping_address, NULL);
  END IF;

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
    v_billing_address := COALESCE(v_profile.billing_address, v_shipping_address);
  END IF;

  IF COALESCE(NULLIF(BTRIM(COALESCE(v_shipping_address ->> 'line1', '')), ''), '') = ''
    OR COALESCE(NULLIF(BTRIM(COALESCE(v_shipping_address ->> 'country', '')), ''), '') = '' THEN
    RAISE EXCEPTION 'A shipping address is required to place an order.';
  END IF;

  IF v_payment_method_id IS NOT NULL THEN
    SELECT *
    INTO v_payment_method
    FROM public.customer_payment_methods
    WHERE id = v_payment_method_id
      AND user_id = p_target_user_id
      AND status = 'active';

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
        COALESCE(v_cardholder_name, v_full_name, v_profile.full_name, 'Cardholder'),
        v_brand,
        v_last4,
        v_expiry_month,
        v_expiry_year,
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
  END IF;

  -- Staff can place orders without payment capture (manual_review);
  -- only block non-staff self-checkout without payment.
  IF v_is_self_checkout AND NOT v_should_capture_payment AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Payment details are required before you can place your order.';
  END IF;

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

  v_order_status := CASE WHEN v_should_capture_payment THEN 'confirmed' ELSE 'pending' END;
  v_payment_status := CASE WHEN v_should_capture_payment THEN 'settled' ELSE 'initiated' END;
  v_payment_event_type := CASE WHEN v_should_capture_payment THEN 'payment_captured' ELSE 'payment_pending' END;

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
    COALESCE(v_full_name, NULLIF(BTRIM(COALESCE(v_profile.full_name, '')), ''), NULLIF(BTRIM(COALESCE(v_profile.display_name, '')), ''), NULLIF(BTRIM(COALESCE(v_auth_user.raw_user_meta_data ->> 'full_name', '')), ''), COALESCE(v_auth_user.email, 'Customer')),
    COALESCE(v_email, NULLIF(BTRIM(COALESCE(v_auth_user.email, '')), '')),
    COALESCE(v_phone, NULLIF(BTRIM(COALESCE(v_profile.phone, '')), '')),
    v_shipping_address,
    COALESCE(v_billing_address, v_shipping_address),
    v_checkout_method
  )
  RETURNING id INTO v_order_id;

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
    v_payment_token,
    v_payment_brand,
    v_payment_last4,
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
    v_payment_id,
    v_payment_event_type,
    jsonb_build_object(
      'placed_by', v_actor_user_id,
      'target_user_id', p_target_user_id,
      'amount', v_total_amount,
      'payment_method_id', v_payment_method_id,
      'staff_self_order', v_is_self_checkout AND v_is_admin,
      'requires_manual_payment_review', NOT v_should_capture_payment
    )
  );

  INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    shipping_address,
    billing_address
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

  DELETE FROM public.cart_items
  WHERE user_id = p_target_user_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_customer_order(uuid, jsonb, jsonb, uuid) TO authenticated;
