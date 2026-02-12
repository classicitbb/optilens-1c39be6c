
-- Company settings table
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_duty numeric NOT NULL DEFAULT 0,
  frames_duty numeric NOT NULL DEFAULT 0,
  default_vat numeric NOT NULL DEFAULT 0,
  labour_percent numeric NOT NULL DEFAULT 0,
  profit_percent numeric NOT NULL DEFAULT 0,
  import_multiple numeric NOT NULL DEFAULT 1,
  wholesale_stock_percentage numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select company_settings"
  ON public.company_settings FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can update company_settings"
  ON public.company_settings FOR UPDATE
  USING (has_edit_role(auth.uid()));

-- Seed single row
INSERT INTO public.company_settings (id) VALUES (gen_random_uuid());

-- Add columns to supplies
ALTER TABLE public.supplies
  ADD COLUMN preferred boolean NOT NULL DEFAULT false,
  ADD COLUMN stocked boolean NOT NULL DEFAULT false,
  ADD COLUMN show_in_pricelist boolean NOT NULL DEFAULT false,
  ADD COLUMN bin text NOT NULL DEFAULT '',
  ADD COLUMN detail text NOT NULL DEFAULT '',
  ADD COLUMN currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN bb_item boolean NOT NULL DEFAULT false,
  ADD COLUMN duty_added boolean NOT NULL DEFAULT false,
  ADD COLUMN vat_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN labour_added boolean NOT NULL DEFAULT false,
  ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN stk_wspl boolean NOT NULL DEFAULT false;
