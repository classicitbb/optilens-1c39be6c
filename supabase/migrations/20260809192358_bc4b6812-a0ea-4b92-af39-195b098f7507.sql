DROP POLICY IF EXISTS "Public can read active store variants" ON public.store_product_variants;

DROP VIEW IF EXISTS public.store_product_variants_public;

CREATE VIEW public.store_product_variants_public
WITH (security_invoker=false) AS
  SELECT id, product_type, product_id, title, variant_key, sku, opc_code,
         attributes, metadata, price,
         stock_qty, low_stock_threshold,
         allow_backorder, is_active, sort_order,
         created_at, updated_at
  FROM public.store_product_variants
  WHERE is_active = true;

ALTER VIEW public.store_product_variants_public SET (security_barrier=true);
REVOKE ALL ON public.store_product_variants_public FROM PUBLIC;
GRANT SELECT ON public.store_product_variants_public TO anon, authenticated;

NOTIFY pgrst, 'reload schema';