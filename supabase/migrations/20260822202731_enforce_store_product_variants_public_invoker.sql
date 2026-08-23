-- Views in the exposed public schema must execute with the querying role so
-- the underlying store_product_variants RLS policies remain authoritative.
ALTER VIEW public.store_product_variants_public
  SET (security_invoker = true, security_barrier = true);

NOTIFY pgrst, 'reload schema';
