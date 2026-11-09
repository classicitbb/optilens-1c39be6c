-- Landed-cost model shared by the edit-modal calculator and Auto Price.
-- Blended import charges (freight, insurance, brokerage, clearance) as a % of
-- the converted supplier price, from lens shipments Jun–Nov 2026 (~0.46 BBD of
-- charges per USD at the 2.00 peg), plus the Central Bank 2% foreign exchange fee.
-- Additive and defaulted: existing readers keep working, and the app falls back
-- to the same defaults while the column is absent.
ALTER TABLE public.pricing_settings
  ADD COLUMN IF NOT EXISTS import_charges_percent numeric NOT NULL DEFAULT 0.23,
  ADD COLUMN IF NOT EXISTS fx_fee_percent numeric NOT NULL DEFAULT 0.02;

COMMENT ON COLUMN public.pricing_settings.import_charges_percent IS
  'Blended freight + insurance + brokerage + clearance as a fraction of converted supplier cost.';
COMMENT ON COLUMN public.pricing_settings.fx_fee_percent IS
  'Central Bank of Barbados foreign exchange fee as a fraction of CIF.';
