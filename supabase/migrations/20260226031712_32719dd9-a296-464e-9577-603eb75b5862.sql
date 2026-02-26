
-- Charge types reference table
CREATE TABLE public.charge_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.charge_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read charge_types" ON public.charge_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert charge_types" ON public.charge_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update charge_types" ON public.charge_types FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete charge_types" ON public.charge_types FOR DELETE USING (auth.uid() IS NOT NULL);

-- Seed with existing hardcoded values
INSERT INTO public.charge_types (name, sort_order) VALUES
  ('Shipping Charge', 1),
  ('Landing Charge', 2),
  ('Duties & VAT', 3),
  ('Brokerage', 4),
  ('Local Freight', 5),
  ('Courier Charges', 6),
  ('Bank Expenses (Card Payment)', 7),
  ('Miscellaneous', 8),
  ('Storage Cost', 9);

-- Shipment types reference table
CREATE TABLE public.shipment_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read shipment_types" ON public.shipment_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert shipment_types" ON public.shipment_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update shipment_types" ON public.shipment_types FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete shipment_types" ON public.shipment_types FOR DELETE USING (auth.uid() IS NOT NULL);

-- Seed with existing hardcoded values
INSERT INTO public.shipment_types (name, code, sort_order) VALUES
  ('Lens', 'lens', 1),
  ('Non-Lens', 'non-lens', 2);
