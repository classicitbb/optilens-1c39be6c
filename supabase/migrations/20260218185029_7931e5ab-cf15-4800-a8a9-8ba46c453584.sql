
-- Add 'quotations' to the features list for role_permissions
INSERT INTO public.role_permissions (role, feature, can_view, can_edit)
VALUES
  ('admin', 'quotations', true, true),
  ('operator', 'quotations', true, true),
  ('viewer', 'quotations', true, false),
  ('customer', 'quotations', false, false)
ON CONFLICT DO NOTHING;

-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  quote_type TEXT NOT NULL CHECK (quote_type IN ('STOCK', 'RX')),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Void')),
  customer_name TEXT NOT NULL DEFAULT '',
  account_id TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  currency TEXT NOT NULL DEFAULT 'BBD',
  price_profile_id TEXT,
  valid_until DATE,
  lead_time_days INTEGER,
  notes_customer TEXT,
  notes_internal TEXT,
  subtotal_sell NUMERIC NOT NULL DEFAULT 0,
  total_landed_cost NUMERIC NOT NULL DEFAULT 0,
  gp_amount NUMERIC NOT NULL DEFAULT 0,
  gp_percent NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select quotes" ON public.quotes
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert quotes" ON public.quotes
  FOR INSERT WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update quotes" ON public.quotes
  FOR UPDATE USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete quotes" ON public.quotes
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-generate quote_number sequence
CREATE SEQUENCE public.quote_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := 'Q-' || LPAD(nextval('public.quote_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_quote_number();

-- Updated_at trigger
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create quote_lines table
CREATE TABLE public.quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL DEFAULT 'Stock' CHECK (line_type IN ('Stock', 'Lens', 'AddOn', 'Supply', 'Fee', 'Discount')),
  product_id UUID,
  sku TEXT NOT NULL DEFAULT '',
  item_name TEXT NOT NULL DEFAULT '',
  description_override TEXT,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit_cost_landed_bbd NUMERIC NOT NULL DEFAULT 0,
  unit_base_price_bbd NUMERIC NOT NULL DEFAULT 0,
  unit_sell_price_bbd NUMERIC NOT NULL DEFAULT 0,
  price_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT CHECK (override_reason IS NULL OR override_reason IN (
    'Match competitor', 'Strategic account/relationship', 'Clearance/aging stock',
    'Pricing error correction', 'Bundle/package deal', 'Warranty/remake/service recovery', 'Other'
  )),
  override_note TEXT,
  profit_status TEXT NOT NULL DEFAULT 'NoCost' CHECK (profit_status IN ('Profitable', 'AtCost', 'BelowCost', 'NoCost')),
  threshold_percent NUMERIC NOT NULL DEFAULT 28,
  threshold_status TEXT NOT NULL DEFAULT 'NoCost' CHECK (threshold_status IN ('AboveThreshold', 'BelowThreshold', 'AtCost', 'BelowCost', 'NoCost')),
  gp_amount NUMERIC NOT NULL DEFAULT 0,
  gp_percent NUMERIC NOT NULL DEFAULT 0,
  group_key TEXT,
  parent_line_id UUID REFERENCES public.quote_lines(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select quote_lines" ON public.quote_lines
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert quote_lines" ON public.quote_lines
  FOR INSERT WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update quote_lines" ON public.quote_lines
  FOR UPDATE USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete quote_lines" ON public.quote_lines
  FOR DELETE USING (has_edit_role(auth.uid()));

CREATE TRIGGER update_quote_lines_updated_at
  BEFORE UPDATE ON public.quote_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create rx_details table
CREATE TABLE public.rx_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_line_id UUID NOT NULL UNIQUE REFERENCES public.quote_lines(id) ON DELETE CASCADE,
  od_sph NUMERIC,
  od_cyl NUMERIC,
  od_axis NUMERIC,
  od_add NUMERIC,
  os_sph NUMERIC,
  os_cyl NUMERIC,
  os_axis NUMERIC,
  os_add NUMERIC,
  pd TEXT,
  seg_height TEXT,
  fitting_height TEXT,
  rx_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rx_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select rx_details" ON public.rx_details
  FOR SELECT USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert rx_details" ON public.rx_details
  FOR INSERT WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update rx_details" ON public.rx_details
  FOR UPDATE USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete rx_details" ON public.rx_details
  FOR DELETE USING (has_edit_role(auth.uid()));

CREATE TRIGGER update_rx_details_updated_at
  BEFORE UPDATE ON public.rx_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
