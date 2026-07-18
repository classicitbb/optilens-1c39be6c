-- The portal cannot read pricing_settings directly because it contains staff-only
-- costing controls. Expose only the active display currency and USD conversion
-- rate needed to render a customer's assigned pricelist.
CREATE OR REPLACE FUNCTION public.portal_pricing_currency_settings()
RETURNS TABLE (
  base_currency text,
  bbd_to_usd_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    settings.base_currency,
    CASE
      WHEN settings.base_currency = 'USD' THEN NULLIF(settings.fx_rates ->> 'BBD', '')::numeric
      ELSE 1 / NULLIF(settings.fx_rates ->> 'USD', '')::numeric
    END
  FROM public.pricing_settings AS settings
  WHERE settings.is_active
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY settings.version DESC
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.portal_pricing_currency_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_pricing_currency_settings() TO authenticated;

NOTIFY pgrst, 'reload schema';
