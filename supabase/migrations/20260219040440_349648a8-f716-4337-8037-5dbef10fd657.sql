
-- Extend company_settings with all Classic Visions company variable fields
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS company_name text NOT NULL DEFAULT 'Classic Visions',
  ADD COLUMN IF NOT EXISTS primary_contact text NOT NULL DEFAULT 'Randall Hunte',
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT 'info@classicvisions.net',
  ADD COLUMN IF NOT EXISTS tel text NOT NULL DEFAULT '246-433-4928',
  ADD COLUMN IF NOT EXISTS fax text NOT NULL DEFAULT '246-433-4927',
  ADD COLUMN IF NOT EXISTS tax_tin text NOT NULL DEFAULT '1000006494000',
  ADD COLUMN IF NOT EXISTS base_currency text NOT NULL DEFAULT 'BBD',
  ADD COLUMN IF NOT EXISTS business_calendar text NOT NULL DEFAULT 'Business HRS',
  ADD COLUMN IF NOT EXISTS slogan text NOT NULL DEFAULT 'Helping people see better',
  ADD COLUMN IF NOT EXISTS logo_file_name text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  -- Physical address
  ADD COLUMN IF NOT EXISTS physical_country text NOT NULL DEFAULT 'Barbados',
  ADD COLUMN IF NOT EXISTS physical_state text NOT NULL DEFAULT 'St John',
  ADD COLUMN IF NOT EXISTS physical_county text NOT NULL DEFAULT 'Uplands',
  ADD COLUMN IF NOT EXISTS physical_line1 text NOT NULL DEFAULT 'Uplands',
  ADD COLUMN IF NOT EXISTS physical_line2 text NOT NULL DEFAULT 'St. John',
  ADD COLUMN IF NOT EXISTS physical_city text NOT NULL DEFAULT 'Bridgetown',
  ADD COLUMN IF NOT EXISTS physical_postcode text NOT NULL DEFAULT 'BB20031',
  -- Bill-to address
  ADD COLUMN IF NOT EXISTS bill_use_physical boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bill_country text NOT NULL DEFAULT 'Barbados',
  ADD COLUMN IF NOT EXISTS bill_state text NOT NULL DEFAULT 'St John',
  ADD COLUMN IF NOT EXISTS bill_county text NOT NULL DEFAULT 'Uplands',
  ADD COLUMN IF NOT EXISTS bill_line1 text NOT NULL DEFAULT 'Uplands',
  ADD COLUMN IF NOT EXISTS bill_line2 text NOT NULL DEFAULT 'St. John',
  ADD COLUMN IF NOT EXISTS bill_city text NOT NULL DEFAULT 'Bridgetown',
  ADD COLUMN IF NOT EXISTS bill_postcode text NOT NULL DEFAULT 'BB20031',
  -- Ship-to address
  ADD COLUMN IF NOT EXISTS ship_use_physical boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ship_country text NOT NULL DEFAULT 'Barbados',
  ADD COLUMN IF NOT EXISTS ship_state text NOT NULL DEFAULT 'St John',
  ADD COLUMN IF NOT EXISTS ship_county text NOT NULL DEFAULT 'Uplands',
  ADD COLUMN IF NOT EXISTS ship_line1 text NOT NULL DEFAULT 'Uplands',
  ADD COLUMN IF NOT EXISTS ship_line2 text NOT NULL DEFAULT 'St. John',
  ADD COLUMN IF NOT EXISTS ship_city text NOT NULL DEFAULT 'Bridgetown',
  ADD COLUMN IF NOT EXISTS ship_postcode text NOT NULL DEFAULT 'BB20031';

-- Create legacy_rates table
CREATE TABLE IF NOT EXISTS public.legacy_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_code text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  value_type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  currency text,
  effective_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraint: value_type must be one of the allowed values (use trigger for flexibility)
ALTER TABLE public.legacy_rates DROP CONSTRAINT IF EXISTS legacy_rates_value_type_check;
ALTER TABLE public.legacy_rates ADD CONSTRAINT legacy_rates_value_type_check
  CHECK (value_type IN ('percent','fixed','multiplier','per_kg','per_item','per_shipment'));

-- RLS for legacy_rates
ALTER TABLE public.legacy_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage legacy_rates"
  ON public.legacy_rates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select legacy_rates"
  ON public.legacy_rates FOR SELECT
  USING (has_any_role(auth.uid()));

-- updated_at trigger for legacy_rates
CREATE TRIGGER update_legacy_rates_updated_at
  BEFORE UPDATE ON public.legacy_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
