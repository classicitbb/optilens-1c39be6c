
-- Fix search_path on new functions
CREATE OR REPLACE FUNCTION public.store_product_variants_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_product_variants_write_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.store_variant_audit_logs (
    variant_id, action, actor_user_id, before_state, after_state
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

-- Fix security definer view by making it a regular view with explicit schema
DROP VIEW IF EXISTS public.store_product_variant_summary;
CREATE VIEW public.store_product_variant_summary AS
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
