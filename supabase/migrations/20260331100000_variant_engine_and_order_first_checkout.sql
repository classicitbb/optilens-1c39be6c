-- Unified variant engine + order-first checkout workflow.

CREATE TABLE IF NOT EXISTS public.product_variant_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('lens', 'supply', 'addon')),
  product_id uuid NOT NULL,
  variant_mode text NOT NULL DEFAULT 'none' CHECK (variant_mode IN ('none', 'lens_grid', 'standard_options', 'service_config', 'generic_matrix')),
  attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  sku_template text,
  opc_template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_type, product_id)
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('lens', 'supply', 'addon')),
  product_id uuid NOT NULL,
  variant_mode text NOT NULL DEFAULT 'none' CHECK (variant_mode IN ('none', 'lens_grid', 'standard_options', 'service_config', 'generic_matrix')),
  variant_key text NOT NULL,
  title text NOT NULL,
  display_label text,
  sku text,
  opc_code text,
  price numeric NOT NULL DEFAULT 0,
  cost numeric,
  stock_qty integer,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  allow_backorder boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  attribute_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_type, product_id, variant_key)
);

CREATE INDEX IF NOT EXISTS product_variants_lookup_idx ON public.product_variants(product_type, product_id, is_active, sort_order, id);
CREATE INDEX IF NOT EXISTS product_variants_attr_gin_idx ON public.product_variants USING GIN(attribute_values);

ALTER TABLE public.product_variant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view variants for website products" ON public.product_variants;
CREATE POLICY "Anyone can view variants for website products"
  ON public.product_variants FOR SELECT
  USING (
    is_active = true
    AND (
      (product_type = 'lens' AND EXISTS (SELECT 1 FROM public.lenses l WHERE l.id = product_id AND l.show_on_website = true AND l.is_active = true))
      OR (product_type = 'supply' AND EXISTS (SELECT 1 FROM public.supplies s WHERE s.id = product_id AND s.show_on_website = true AND s.is_active = true))
      OR (product_type = 'addon' AND EXISTS (SELECT 1 FROM public.addons a WHERE a.id = product_id AND a.show_on_website = true AND a.is_active = true))
    )
  );

DROP POLICY IF EXISTS "Staff can manage product variant configs" ON public.product_variant_configs;
CREATE POLICY "Staff can manage product variant configs"
  ON public.product_variant_configs FOR ALL
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage product variants" ON public.product_variants;
CREATE POLICY "Staff can manage product variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

DROP TRIGGER IF EXISTS update_product_variant_configs_updated_at ON public.product_variant_configs;
CREATE TRIGGER update_product_variant_configs_updated_at
  BEFORE UPDATE ON public.product_variant_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS opc_code text,
  ADD COLUMN IF NOT EXISTS variant_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS opc_code text,
  ADD COLUMN IF NOT EXISTS variant_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'draft', 'submitted', 'pending_review', 'awaiting_payment', 'paid',
    'partially_allocated', 'ready_for_fulfilment', 'fulfilled', 'cancelled',
    'backordered', 'partially_fulfilled',
    'pending', 'confirmed', 'processing', 'shipped', 'completed'
  ));

CREATE TABLE IF NOT EXISTS public.order_payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS order_payment_links_user_idx ON public.order_payment_links(user_id, created_at DESC);

ALTER TABLE public.order_payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own payment links" ON public.order_payment_links;
CREATE POLICY "Users can view their own payment links"
  ON public.order_payment_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage payment links" ON public.order_payment_links;
CREATE POLICY "Staff can manage payment links"
  ON public.order_payment_links FOR ALL
  TO authenticated
  USING (public.has_edit_role(auth.uid()))
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.order_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revision_type text NOT NULL,
  before_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_note text,
  customer_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_revisions_order_idx ON public.order_revisions(order_id, created_at DESC);

ALTER TABLE public.order_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own order revisions" ON public.order_revisions;
CREATE POLICY "Users can read own order revisions"
  ON public.order_revisions FOR SELECT
  TO authenticated
  USING (
    public.has_edit_role(auth.uid())
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_revisions.order_id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Staff can insert order revisions" ON public.order_revisions;
CREATE POLICY "Staff can insert order revisions"
  ON public.order_revisions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

CREATE OR REPLACE FUNCTION public.place_customer_order_v2(
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
  v_payment_link_token text;
  v_total_amount numeric := 0;
  v_item record;
BEGIN
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'place_customer_order_v2 requires a target user id';
  END IF;

  IF v_actor_user_id IS NULL OR (NOT v_is_self_checkout AND NOT v_is_admin) THEN
    RAISE EXCEPTION 'You do not have permission to place this order.';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item.';
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
  ) VALUES (
    p_target_user_id,
    v_total_amount,
    'submitted',
    COALESCE(NULLIF(BTRIM(p_checkout ->> 'full_name'), ''), 'Customer'),
    NULLIF(BTRIM(p_checkout ->> 'email'), ''),
    NULLIF(BTRIM(p_checkout ->> 'phone'), ''),
    COALESCE(p_checkout -> 'shipping_address', '{}'::jsonb),
    COALESCE(p_checkout -> 'billing_address', p_checkout -> 'shipping_address', '{}'::jsonb),
    'manual_review'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, product_price, product_type, quantity,
    variant_id, variant_label, sku, opc_code, variant_snapshot
  )
  SELECT
    v_order_id,
    x.product_id,
    x.product_name,
    x.product_price,
    COALESCE(NULLIF(x.product_type, ''), 'lens'),
    GREATEST(COALESCE(x.quantity, 1), 1),
    NULLIF(x.variant_id, '')::uuid,
    NULLIF(x.variant_label, ''),
    NULLIF(x.sku, ''),
    NULLIF(x.opc_code, ''),
    COALESCE(x.variant_snapshot, '{}'::jsonb)
  FROM jsonb_to_recordset(p_items) AS x(
    product_id integer,
    product_name text,
    product_price numeric,
    product_type text,
    quantity integer,
    variant_id text,
    variant_label text,
    sku text,
    opc_code text,
    variant_snapshot jsonb
  );

  INSERT INTO public.order_payments (
    order_id,
    user_id,
    amount,
    status,
    provider,
    metadata
  ) VALUES (
    v_order_id,
    p_target_user_id,
    v_total_amount,
    'initiated',
    'manual_review',
    jsonb_build_object('requires_admin_review', true)
  ) RETURNING id INTO v_payment_id;

  INSERT INTO public.order_payment_events (payment_id, event_type, payload)
  VALUES (
    v_payment_id,
    'payment_pending',
    jsonb_build_object('order_id', v_order_id, 'requires_admin_review', true)
  );

  v_payment_link_token := encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.order_payment_links (order_id, user_id, token)
  VALUES (v_order_id, p_target_user_id, v_payment_link_token);

  INSERT INTO public.order_revisions (order_id, actor_user_id, revision_type, after_snapshot)
  VALUES (
    v_order_id,
    v_actor_user_id,
    'order_submitted',
    jsonb_build_object('status', 'submitted', 'total_amount', v_total_amount)
  );

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_customer_order_v2(uuid, jsonb, jsonb, uuid) TO authenticated;
