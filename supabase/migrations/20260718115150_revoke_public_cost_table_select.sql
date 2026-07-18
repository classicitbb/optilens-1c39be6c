-- Keep cost-bearing base tables inaccessible through the Data API. Storefront
-- reads use the cost-safe get_*_safe RPCs instead.
REVOKE SELECT ON public.lenses FROM anon, authenticated;
REVOKE SELECT ON public.addons FROM anon, authenticated;
REVOKE SELECT ON public.supplies FROM anon, authenticated;
