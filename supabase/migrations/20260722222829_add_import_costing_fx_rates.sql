-- Import-costing FX must be independent from product-pricing FX.
-- Existing settings start with the same rates, then can be managed separately.
ALTER TABLE public.pricing_settings
  ADD COLUMN IF NOT EXISTS import_costing_fx_rates jsonb;

UPDATE public.pricing_settings
SET import_costing_fx_rates = fx_rates
WHERE import_costing_fx_rates IS NULL;

ALTER TABLE public.pricing_settings
  ALTER COLUMN import_costing_fx_rates SET DEFAULT '{"USD":2,"BBD":1}'::jsonb,
  ALTER COLUMN import_costing_fx_rates SET NOT NULL;
