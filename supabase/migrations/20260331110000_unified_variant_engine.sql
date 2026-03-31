-- Unified variant engine for website store (lenses, supplies, services, generic)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'store_variant_mode' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.store_variant_mode AS ENUM ('none', 'lens_grid', 'standard_options', 'service_config', 'generic_matrix');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.store_product_variant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('lens', 'supply', 'addon')),
  product_id uuid NOT NULL,
  variant_mode public.store_variant_mode NOT NULL DEFAULT 'none',
  sku_template text,
  opc_template text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_type, product_id)
);

CREATE TABLE IF NOT EXISTS public.store_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL CHECK (product_type IN ('lens', 'supply', 'addon')),
  product_id uuid NOT NULL,
  title text NOT NULL,
  variant_key text NOT NULL,
  sku text,
  opc_code text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2),
  stock_qty integer NOT NULL DEFAULT 0,
  reserved_qty integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 0,
  allow_backorder boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_type, product_id, variant_key)
);

CREATE INDEX IF NOT EXISTS store_product_variants_lookup_idx
  ON public.store_product_variants(product_type, product_id, is_active, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS store_product_variants_sku_idx
  ON public.store_product_variants(sku)
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

CREATE TABLE IF NOT EXISTS public.store_variant_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid REFERENCES public.store_product_variants(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_user_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_variant_audit_logs_variant_created_idx
  ON public.store_variant_audit_logs(variant_id, created_at DESC);

ALTER TABLE public.store_product_variant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_variant_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active store variants" ON public.store_product_variants;
CREATE POLICY "Public can read active store variants"
  ON public.store_product_variants FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Staff can manage store variants" ON public.store_product_variants;
CREATE POLICY "Staff can manage store variants"
  ON public.store_product_variants FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can manage variant settings" ON public.store_product_variant_settings;
CREATE POLICY "Staff can manage variant settings"
  ON public.store_product_variant_settings FOR ALL
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Staff can read variant audit logs" ON public.store_variant_audit_logs;
CREATE POLICY "Staff can read variant audit logs"
  ON public.store_variant_audit_logs FOR SELECT
  USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "System can insert variant audit logs" ON public.store_variant_audit_logs;
CREATE POLICY "System can insert variant audit logs"
  ON public.store_variant_audit_logs FOR INSERT
  WITH CHECK (public.is_admin_user(auth.uid()));

ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.store_product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS variant_sku text,
  ADD COLUMN IF NOT EXISTS variant_opc_code text,
  ADD COLUMN IF NOT EXISTS variant_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.store_product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text,
  ADD COLUMN IF NOT EXISTS variant_sku text,
  ADD COLUMN IF NOT EXISTS variant_opc_code text,
  ADD COLUMN IF NOT EXISTS variant_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS unit_price_snapshot numeric(12,2);

UPDATE public.order_items
SET unit_price_snapshot = COALESCE(unit_price_snapshot, product_price)
WHERE unit_price_snapshot IS NULL;

ALTER TABLE public.order_items
  ALTER COLUMN unit_price_snapshot SET DEFAULT 0;

ALTER TABLE public.order_items
  ALTER COLUMN unit_price_snapshot SET NOT NULL;

ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_product_unique;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_variant_unique_idx
  ON public.cart_items(user_id, product_type, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE OR REPLACE FUNCTION public.store_product_variants_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_product_variants_write_audit_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.store_variant_audit_logs (
    variant_id,
    action,
    actor_user_id,
    before_state,
    after_state
  )
  VALUES (
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN 'create' ELSE 'update' END,
    auth.uid(),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_product_variants_set_updated_at ON public.store_product_variants;
CREATE TRIGGER store_product_variants_set_updated_at
  BEFORE UPDATE ON public.store_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.store_product_variants_set_updated_at();

DROP TRIGGER IF EXISTS store_product_variants_audit_insert ON public.store_product_variants;
CREATE TRIGGER store_product_variants_audit_insert
  AFTER INSERT ON public.store_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.store_product_variants_write_audit_log();

DROP TRIGGER IF EXISTS store_product_variants_audit_update ON public.store_product_variants;
CREATE TRIGGER store_product_variants_audit_update
  AFTER UPDATE ON public.store_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.store_product_variants_write_audit_log();

CREATE OR REPLACE VIEW public.store_product_variant_summary AS
SELECT
  product_type,
  product_id,
  COUNT(*)::int AS total_variants,
  COUNT(*) FILTER (WHERE is_active)::int AS active_variants,
  COUNT(*) FILTER (WHERE is_active AND (stock_qty - reserved_qty) <= low_stock_threshold)::int AS low_stock_variants,
  MIN(price) FILTER (WHERE is_active) AS min_price,
  MAX(price) FILTER (WHERE is_active) AS max_price
FROM public.store_product_variants
GROUP BY product_type, product_id;

CREATE OR REPLACE FUNCTION public.add_variant_items_to_cart(
  p_items jsonb,
  p_target_user_id uuid DEFAULT auth.uid()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_variant public.store_product_variants%ROWTYPE;
  v_qty integer;
  v_inserted integer := 0;
BEGIN
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'A target user is required.';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_target_user_id AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'You do not have permission to modify this cart.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No variant items were provided.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(v_item->>'variant_id', '') = '' THEN
      RAISE EXCEPTION 'Each row must include variant_id.';
    END IF;

    SELECT *
    INTO v_variant
    FROM public.store_product_variants
    WHERE id = (v_item->>'variant_id')::uuid
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Variant % is unavailable.', v_item->>'variant_id';
    END IF;

    v_qty := GREATEST(COALESCE((v_item->>'quantity')::integer, 0), 0);
    IF v_qty <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.cart_items (
      user_id,
      product_id,
      product_name,
      product_price,
      product_type,
      quantity,
      variant_id,
      variant_label,
      variant_sku,
      variant_opc_code,
      variant_metadata
    )
    VALUES (
      p_target_user_id,
      abs(hashtext(v_variant.product_type || ':' || v_variant.product_id::text)),
      v_variant.title,
      v_variant.price,
      v_variant.product_type,
      v_qty,
      v_variant.id,
      v_variant.title,
      v_variant.sku,
      v_variant.opc_code,
      jsonb_build_object('attributes', v_variant.attributes, 'source', 'variant_engine')
    )
    ON CONFLICT (user_id, product_type, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
      quantity = cart_items.quantity + EXCLUDED.quantity,
      product_price = EXCLUDED.product_price,
      product_name = EXCLUDED.product_name,
      variant_label = EXCLUDED.variant_label,
      variant_sku = EXCLUDED.variant_sku,
      variant_opc_code = EXCLUDED.variant_opc_code,
      variant_metadata = EXCLUDED.variant_metadata,
      updated_at = now();

    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_variant_items_to_cart(jsonb, uuid) TO authenticated;
