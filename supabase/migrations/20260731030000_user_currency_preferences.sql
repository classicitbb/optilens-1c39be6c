-- Let portal users pick their own display currency (persisted per user)
-- instead of a page-local BBD/USD switch, and expose the full fx_rates map
-- instead of a single derived BBD->USD rate so the dropdown can offer
-- whatever currencies pricing_settings.fx_rates actually contains.
--
-- Scope note (2026-08-01): the only admin UI that edits fx_rates
-- (CurrencyFxSection.tsx) still hardcodes CURRENCIES = ["BBD", "USD"], so in
-- practice this returns exactly those two today. This RPC itself already
-- generalizes to N currencies — extending the admin UI to add more is a
-- separate, deliberately deferred follow-up.

CREATE TABLE IF NOT EXISTS public.user_currency_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency_code text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_currency_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own currency preference" ON public.user_currency_preferences;
CREATE POLICY "Users can select their own currency preference"
  ON public.user_currency_preferences FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own currency preference" ON public.user_currency_preferences;
CREATE POLICY "Users can insert their own currency preference"
  ON public.user_currency_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own currency preference" ON public.user_currency_preferences;
CREATE POLICY "Users can update their own currency preference"
  ON public.user_currency_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own currency preference" ON public.user_currency_preferences;
CREATE POLICY "Users can delete their own currency preference"
  ON public.user_currency_preferences FOR DELETE
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_user_currency_preferences_updated_at ON public.user_currency_preferences;
CREATE TRIGGER update_user_currency_preferences_updated_at
  BEFORE UPDATE ON public.user_currency_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Replaces the old single-derived-rate shape (base_currency, bbd_to_usd_rate)
-- with one row per currency in fx_rates. fx_rates[code] is the price of 1
-- unit of that currency in BBD (confirmed live: {"BBD":1,"USD":2}, matching
-- the real 2:1 peg) — so any BBD-denominated price converts via
-- bbd_price / bbd_per_unit. Only src/ caller is
-- AssignedPricelistsSection.tsx, so this return-type change is safe.

DROP FUNCTION IF EXISTS public.portal_pricing_currency_settings();
CREATE FUNCTION public.portal_pricing_currency_settings()
RETURNS TABLE (
  currency_code text,
  bbd_per_unit numeric,
  is_default boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH active_settings AS (
    SELECT base_currency, fx_rates
    FROM public.pricing_settings
    WHERE is_active
    ORDER BY version DESC
    LIMIT 1
  )
  SELECT
    kv.key AS currency_code,
    NULLIF(kv.value, '')::numeric AS bbd_per_unit,
    kv.key = active_settings.base_currency AS is_default
  FROM active_settings,
       jsonb_each_text(active_settings.fx_rates) AS kv(key, value)
  WHERE (SELECT auth.uid()) IS NOT NULL
  ORDER BY is_default DESC, currency_code;
$function$;

REVOKE ALL ON FUNCTION public.portal_pricing_currency_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_pricing_currency_settings() TO authenticated;

NOTIFY pgrst, 'reload schema';
