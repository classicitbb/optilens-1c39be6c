
-- Create pricing_settings table
CREATE TABLE public.pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Currency & FX
  base_currency text NOT NULL DEFAULT 'BBD',
  fx_rates jsonb NOT NULL DEFAULT '{"USD":1,"BBD":2}',
  fx_risk_buffer numeric NOT NULL DEFAULT 0.02,

  -- Barbados Import Defaults
  vat_rate numeric NOT NULL DEFAULT 0.175,
  duty_rates jsonb NOT NULL DEFAULT '{"lenses":0.20,"frames":0.30,"supplies":0.20,"addons":0.15}',
  brokerage_fee numeric NOT NULL DEFAULT 0,
  port_charges numeric NOT NULL DEFAULT 0,
  freight_method text NOT NULL DEFAULT 'per_unit',
  insurance_percent numeric NOT NULL DEFAULT 0.01,

  -- Financial & Operational
  cost_of_capital numeric NOT NULL DEFAULT 0.08,
  inventory_holding numeric NOT NULL DEFAULT 0.05,
  avg_days_in_stock integer NOT NULL DEFAULT 90,
  overhead_percent numeric NOT NULL DEFAULT 0.10,
  shrinkage_percent numeric NOT NULL DEFAULT 0.02,

  -- Pricing Strategy
  target_margin numeric NOT NULL DEFAULT 0.50,
  category_margin_floors jsonb NOT NULL DEFAULT '{"lenses":0.30,"frames":0.35,"supplies":0.25,"addons":0.20}',
  category_target_margins jsonb NOT NULL DEFAULT '{"lenses":0.50,"frames":0.50,"supplies":0.45,"addons":0.40}',
  max_price_increase numeric NOT NULL DEFAULT 0.10,
  rounding_rule numeric NOT NULL DEFAULT 0.50,
  psychological_rounding boolean NOT NULL DEFAULT false,

  -- Governance Rules
  block_below_floor boolean NOT NULL DEFAULT true,
  block_loss boolean NOT NULL DEFAULT true,
  require_concession_reason boolean NOT NULL DEFAULT true,
  price_reduction_threshold numeric NOT NULL DEFAULT 0.10
);

-- Enable RLS
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Role holders can read
CREATE POLICY "Role users can select pricing_settings"
  ON public.pricing_settings FOR SELECT
  USING (has_any_role(auth.uid()));

-- Editors can insert
CREATE POLICY "Editors can insert pricing_settings"
  ON public.pricing_settings FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

-- Editors can update
CREATE POLICY "Editors can update pricing_settings"
  ON public.pricing_settings FOR UPDATE
  USING (has_edit_role(auth.uid()));

-- Editors can delete
CREATE POLICY "Editors can delete pricing_settings"
  ON public.pricing_settings FOR DELETE
  USING (has_edit_role(auth.uid()));

-- Seed default version 1
INSERT INTO public.pricing_settings (version, label, is_active) VALUES (1, 'Initial defaults', true);
