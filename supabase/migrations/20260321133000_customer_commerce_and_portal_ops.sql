-- Customer commerce foundation: saved addresses, saved demo payment methods,
-- structured payments, admin notifications, and abandoned-cart alerting.

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Address',
  recipient text NOT NULL DEFAULT '',
  line1 text NOT NULL DEFAULT '',
  line2 text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  is_default_shipping boolean NOT NULL DEFAULT false,
  is_default_billing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_addresses_user_id_idx
  ON public.customer_addresses(user_id, created_at DESC);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own customer addresses" ON public.customer_addresses;
CREATE POLICY "Users can view their own customer addresses"
  ON public.customer_addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own customer addresses" ON public.customer_addresses;
CREATE POLICY "Users can insert their own customer addresses"
  ON public.customer_addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own customer addresses" ON public.customer_addresses;
CREATE POLICY "Users can update their own customer addresses"
  ON public.customer_addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own customer addresses" ON public.customer_addresses;
CREATE POLICY "Users can delete their own customer addresses"
  ON public.customer_addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_customer_address_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.customer_addresses
  WHERE user_id = NEW.user_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_count >= 2 THEN
    RAISE EXCEPTION 'A customer can only store up to 2 addresses.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_customer_address_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default_shipping THEN
    UPDATE public.customer_addresses
    SET is_default_shipping = false
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default_shipping = true;
  END IF;

  IF NEW.is_default_billing THEN
    UPDATE public.customer_addresses
    SET is_default_billing = false
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default_billing = true;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_addresses_enforce_limit_trigger ON public.customer_addresses;
CREATE TRIGGER customer_addresses_enforce_limit_trigger
  BEFORE INSERT ON public.customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_customer_address_limit();

DROP TRIGGER IF EXISTS customer_addresses_normalize_defaults_trigger ON public.customer_addresses;
CREATE TRIGGER customer_addresses_normalize_defaults_trigger
  BEFORE INSERT OR UPDATE ON public.customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_customer_address_defaults();

CREATE TABLE IF NOT EXISTS public.customer_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'demo',
  payment_token text NOT NULL UNIQUE,
  cardholder_name text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT 'Visa',
  last4 text NOT NULL DEFAULT '0000',
  expiry_month integer NOT NULL DEFAULT 1,
  expiry_year integer NOT NULL DEFAULT EXTRACT(year FROM now())::integer,
  is_default boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_payment_methods_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT customer_payment_methods_provider_check CHECK (provider IN ('demo')),
  CONSTRAINT customer_payment_methods_last4_check CHECK (char_length(last4) = 4),
  CONSTRAINT customer_payment_methods_expiry_month_check CHECK (expiry_month BETWEEN 1 AND 12)
);

CREATE INDEX IF NOT EXISTS customer_payment_methods_user_id_idx
  ON public.customer_payment_methods(user_id, created_at DESC);

ALTER TABLE public.customer_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payment methods" ON public.customer_payment_methods;
CREATE POLICY "Users can view their own payment methods"
  ON public.customer_payment_methods FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own payment methods" ON public.customer_payment_methods;
CREATE POLICY "Users can insert their own payment methods"
  ON public.customer_payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own payment methods" ON public.customer_payment_methods;
CREATE POLICY "Users can update their own payment methods"
  ON public.customer_payment_methods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own payment methods" ON public.customer_payment_methods;
CREATE POLICY "Users can delete their own payment methods"
  ON public.customer_payment_methods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

CREATE OR REPLACE FUNCTION public.normalize_customer_payment_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.customer_payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default = true;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_payment_methods_normalize_default_trigger ON public.customer_payment_methods;
CREATE TRIGGER customer_payment_methods_normalize_default_trigger
  BEFORE INSERT OR UPDATE ON public.customer_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_customer_payment_default();

CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method_id uuid NULL REFERENCES public.customer_payment_methods(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'settled',
  provider text NOT NULL DEFAULT 'demo',
  payment_token text,
  card_brand text,
  card_last4 text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_payments_status_check CHECK (status IN ('initiated', 'authorized', 'settled', 'failed', 'refunded', 'void'))
);

CREATE INDEX IF NOT EXISTS order_payments_order_id_idx ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS order_payments_user_id_idx ON public.order_payments(user_id, created_at DESC);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own order payments" ON public.order_payments;
CREATE POLICY "Users can view their own order payments"
  ON public.order_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own order payments" ON public.order_payments;
CREATE POLICY "Users can insert their own order payments"
  ON public.order_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own order payments" ON public.order_payments;
CREATE POLICY "Users can update their own order payments"
  ON public.order_payments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.order_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.order_payments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_payment_events_payment_id_idx ON public.order_payment_events(payment_id, created_at DESC);

ALTER TABLE public.order_payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payment events" ON public.order_payment_events;
CREATE POLICY "Users can view their own payment events"
  ON public.order_payment_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_payments p
      WHERE p.id = order_payment_events.payment_id
        AND (p.user_id = auth.uid() OR public.has_edit_role(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can insert their own payment events" ON public.order_payment_events;
CREATE POLICY "Users can insert their own payment events"
  ON public.order_payment_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.order_payments p
      WHERE p.id = order_payment_events.payment_id
        AND (p.user_id = auth.uid() OR public.has_edit_role(auth.uid()))
    )
  );

CREATE TABLE IF NOT EXISTS public.customer_portal_feature_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key),
  CONSTRAINT customer_portal_feature_overrides_feature_key_check CHECK (feature_key IN ('quotes', 'helpdesk', 'pricelists', 'private-orders'))
);

ALTER TABLE public.customer_portal_feature_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage portal feature overrides" ON public.customer_portal_feature_overrides;
CREATE POLICY "Admins can manage portal feature overrides"
  ON public.customer_portal_feature_overrides FOR ALL
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own portal feature overrides" ON public.customer_portal_feature_overrides;
CREATE POLICY "Users can view their own portal feature overrides"
  ON public.customer_portal_feature_overrides FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  href text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_ticket_id uuid REFERENCES public.helpdesk_tickets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_notifications_severity_check CHECK (severity IN ('info', 'warning', 'error'))
);

CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_event_type_idx ON public.admin_notifications(event_type, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read admin notifications" ON public.admin_notifications;
CREATE POLICY "Staff can read admin notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'operator')
    OR public.has_role(auth.uid(), 'viewer')
  );

DROP POLICY IF EXISTS "Staff can create admin notifications" ON public.admin_notifications;
CREATE POLICY "Staff can create admin notifications"
  ON public.admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.customer_automation_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'email',
  template_key text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL,
  CONSTRAINT customer_automation_outbox_channel_check CHECK (channel IN ('email')),
  CONSTRAINT customer_automation_outbox_status_check CHECK (status IN ('queued', 'sent', 'failed'))
);

ALTER TABLE public.customer_automation_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage automation outbox" ON public.customer_automation_outbox;
CREATE POLICY "Staff can manage automation outbox"
  ON public.customer_automation_outbox FOR ALL
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.abandoned_cart_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_items integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  cutoff_hours integer NOT NULL DEFAULT 24,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  helpdesk_ticket_id uuid REFERENCES public.helpdesk_tickets(id) ON DELETE SET NULL,
  notification_id uuid REFERENCES public.admin_notifications(id) ON DELETE SET NULL,
  email_outbox_id uuid REFERENCES public.customer_automation_outbox(id) ON DELETE SET NULL,
  CONSTRAINT abandoned_cart_alerts_status_check CHECK (status IN ('open', 'resolved'))
);

CREATE UNIQUE INDEX IF NOT EXISTS abandoned_cart_alerts_user_open_idx
  ON public.abandoned_cart_alerts(user_id)
  WHERE status = 'open';

ALTER TABLE public.abandoned_cart_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own abandoned cart alerts" ON public.abandoned_cart_alerts;
CREATE POLICY "Users can view their own abandoned cart alerts"
  ON public.abandoned_cart_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage abandoned cart alerts" ON public.abandoned_cart_alerts;
CREATE POLICY "Staff can manage abandoned cart alerts"
  ON public.abandoned_cart_alerts FOR ALL
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP TRIGGER IF EXISTS update_customer_payment_methods_updated_at ON public.customer_payment_methods;
CREATE TRIGGER update_customer_payment_methods_updated_at
  BEFORE UPDATE ON public.customer_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_payments_updated_at ON public.order_payments;
CREATE TRIGGER update_order_payments_updated_at
  BEFORE UPDATE ON public.order_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_portal_feature_overrides_updated_at ON public.customer_portal_feature_overrides;
CREATE TRIGGER update_customer_portal_feature_overrides_updated_at
  BEFORE UPDATE ON public.customer_portal_feature_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE user_id = p_target_user_id;

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
    'confirmed',
    COALESCE(v_full_name, v_profile.full_name, v_profile.display_name),
    COALESCE(v_email, (SELECT email FROM auth.users WHERE id = p_target_user_id)),
    COALESCE(v_phone, v_profile.phone),
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
    'settled',
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

  INSERT INTO public.order_payment_events (payment_id, event_type, payload)
  VALUES (
    v_payment_id,
    'payment_captured',
    jsonb_build_object(
      'placed_by', v_actor_user_id,
      'target_user_id', p_target_user_id,
      'amount', v_total_amount,
      'payment_method_id', v_payment_method_id
    )
  );

  UPDATE public.profiles
  SET
    full_name = COALESCE(v_full_name, full_name),
    phone = COALESCE(v_phone, phone),
    shipping_address = COALESCE(v_shipping_address, shipping_address),
    billing_address = COALESCE(v_billing_address, billing_address),
    updated_at = now()
  WHERE user_id = p_target_user_id;

  DELETE FROM public.cart_items
  WHERE user_id = p_target_user_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_customer_order(uuid, jsonb, jsonb, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.queue_abandoned_cart_alerts(p_cutoff_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_created_count integer := 0;
  v_updated_count integer := 0;
  v_now timestamptz := now();
  v_cutoff timestamptz := now() - make_interval(hours => GREATEST(COALESCE(p_cutoff_hours, 24), 1));
  v_cart record;
  v_profile record;
  v_notification_id uuid;
  v_ticket_id uuid;
  v_outbox_id uuid;
  v_existing_alert_id uuid;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can queue abandoned cart alerts.';
  END IF;

  FOR v_cart IN
    SELECT
      ci.user_id,
      MAX(ci.updated_at) AS last_updated_at,
      SUM(ci.quantity) AS total_items,
      SUM(ci.product_price * ci.quantity) AS total_amount,
      jsonb_agg(
        jsonb_build_object(
          'product_id', ci.product_id,
          'product_name', ci.product_name,
          'product_price', ci.product_price,
          'product_type', ci.product_type,
          'quantity', ci.quantity
        ) ORDER BY ci.created_at
      ) AS cart_snapshot
    FROM public.cart_items ci
    GROUP BY ci.user_id
    HAVING MAX(ci.updated_at) <= v_cutoff
  LOOP
    SELECT p.*, u.email
    INTO v_profile
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE p.user_id = v_cart.user_id;

    SELECT id
    INTO v_existing_alert_id
    FROM public.abandoned_cart_alerts
    WHERE user_id = v_cart.user_id
      AND status = 'open'
    LIMIT 1;

    IF v_existing_alert_id IS NOT NULL THEN
      UPDATE public.abandoned_cart_alerts
      SET
        cart_snapshot = v_cart.cart_snapshot,
        total_items = v_cart.total_items,
        total_amount = v_cart.total_amount,
        last_detected_at = v_now,
        cutoff_hours = GREATEST(COALESCE(p_cutoff_hours, 24), 1)
      WHERE id = v_existing_alert_id;
      v_updated_count := v_updated_count + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.admin_notifications (
      event_type,
      severity,
      title,
      message,
      href,
      metadata,
      related_user_id
    )
    VALUES (
      'abandoned_cart',
      'warning',
      'Abandoned cart detected',
      COALESCE(NULLIF(BTRIM(v_profile.full_name), ''), COALESCE(v_profile.email, 'Customer')) || ' left ' || v_cart.total_items || ' item(s) in cart without checkout.',
      '/admin/website/portals',
      jsonb_build_object(
        'total_items', v_cart.total_items,
        'total_amount', v_cart.total_amount,
        'cutoff_hours', GREATEST(COALESCE(p_cutoff_hours, 24), 1)
      ),
      v_cart.user_id
    )
    RETURNING id INTO v_notification_id;

    INSERT INTO public.helpdesk_tickets (
      ticket_number,
      title,
      description,
      priority,
      partner_contact_id,
      source_channel,
      opened_at
    )
    VALUES (
      CONCAT(
        'ABN-',
        to_char(v_now, 'YYYYMMDDHH24MISS'),
        '-',
        substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8)
      ),
      'Abandoned cart recovery',
      'Customer cart exceeded the configured inactivity window and needs follow-up.',
      2,
      v_profile.crm_contact_id,
      'portal',
      v_now
    )
    RETURNING id INTO v_ticket_id;

    INSERT INTO public.helpdesk_ticket_events (ticket_id, event_type, payload)
    VALUES (
      v_ticket_id,
      'ticket_created',
      jsonb_build_object(
        'source', 'abandoned_cart_automation',
        'user_id', v_cart.user_id,
        'total_items', v_cart.total_items,
        'total_amount', v_cart.total_amount
      )
    );

    INSERT INTO public.customer_automation_outbox (
      channel,
      template_key,
      recipient_email,
      subject,
      payload,
      status
    )
    VALUES (
      'email',
      'abandoned_cart_recovery',
      COALESCE(v_profile.email, ''),
      'You still have items waiting in your cart',
      jsonb_build_object(
        'user_id', v_cart.user_id,
        'full_name', v_profile.full_name,
        'total_items', v_cart.total_items,
        'total_amount', v_cart.total_amount,
        'cart_snapshot', v_cart.cart_snapshot
      ),
      CASE WHEN COALESCE(v_profile.email, '') = '' THEN 'failed' ELSE 'queued' END
    )
    RETURNING id INTO v_outbox_id;

    INSERT INTO public.abandoned_cart_alerts (
      user_id,
      cart_snapshot,
      total_items,
      total_amount,
      status,
      cutoff_hours,
      first_detected_at,
      last_detected_at,
      helpdesk_ticket_id,
      notification_id,
      email_outbox_id
    )
    VALUES (
      v_cart.user_id,
      v_cart.cart_snapshot,
      v_cart.total_items,
      v_cart.total_amount,
      'open',
      GREATEST(COALESCE(p_cutoff_hours, 24), 1),
      v_now,
      v_now,
      v_ticket_id,
      v_notification_id,
      v_outbox_id
    );

    v_created_count := v_created_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created_count,
    'updated', v_updated_count,
    'cutoff_hours', GREATEST(COALESCE(p_cutoff_hours, 24), 1)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.queue_abandoned_cart_alerts(integer) TO authenticated;
