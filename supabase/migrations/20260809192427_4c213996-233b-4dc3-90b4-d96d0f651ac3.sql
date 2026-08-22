DROP VIEW IF EXISTS public.store_product_variants_public;

CREATE OR REPLACE FUNCTION public.get_store_product_variants_public(
  p_product_type text,
  p_product_id uuid
)
RETURNS TABLE (
  id uuid,
  product_type text,
  product_id uuid,
  title text,
  variant_key text,
  sku text,
  opc_code text,
  attributes jsonb,
  metadata jsonb,
  price numeric,
  stock_qty integer,
  reserved_qty integer,
  low_stock_threshold integer,
  allow_backorder boolean,
  is_active boolean,
  sort_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    v.id,
    v.product_type,
    v.product_id,
    v.title,
    v.variant_key,
    v.sku,
    v.opc_code,
    v.attributes,
    v.metadata,
    v.price,
    GREATEST(v.stock_qty - v.reserved_qty, 0)::integer AS stock_qty,
    0::integer AS reserved_qty,
    v.low_stock_threshold,
    v.allow_backorder,
    v.is_active,
    v.sort_order
  FROM public.store_product_variants AS v
  WHERE v.is_active = true
    AND v.product_type = p_product_type
    AND v.product_id = p_product_id
  ORDER BY v.sort_order ASC;
$$;

REVOKE ALL ON FUNCTION public.get_store_product_variants_public(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_store_product_variants_public(text, uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';