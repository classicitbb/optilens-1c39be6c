
-- Shipment status enum
CREATE TYPE public.shipment_status AS ENUM ('draft', 'reviewed', 'locked');

-- Shipments table
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('lens', 'non-lens')),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  commodity TEXT NOT NULL DEFAULT '',
  date_ordered DATE,
  po_ref TEXT DEFAULT '',
  date_received DATE NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC NOT NULL DEFAULT 2,
  fob_foreign NUMERIC NOT NULL DEFAULT 0,
  invoice_total_foreign NUMERIC NOT NULL DEFAULT 0,
  status shipment_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES public.shipments(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select shipments" ON public.shipments FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert shipments" ON public.shipments FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update shipments" ON public.shipments FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Admins can delete shipments" ON public.shipments FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Shipment charges table
CREATE TABLE public.shipment_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  charge_type TEXT NOT NULL,
  amount_bbd NUMERIC NOT NULL DEFAULT 0,
  vat_bbd NUMERIC DEFAULT 0,
  duty_bbd NUMERIC DEFAULT 0,
  vat_reclaimable BOOLEAN DEFAULT false,
  notes TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select shipment_charges" ON public.shipment_charges FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert shipment_charges" ON public.shipment_charges FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update shipment_charges" ON public.shipment_charges FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete shipment_charges" ON public.shipment_charges FOR DELETE USING (has_edit_role(auth.uid()));

-- Shipment line items table
CREATE TABLE public.shipment_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL DEFAULT 'free' CHECK (product_type IN ('lens', 'supply', 'addon', 'free')),
  lens_id UUID REFERENCES public.lenses(id),
  supply_id UUID REFERENCES public.supplies(id),
  addon_id UUID REFERENCES public.addons(id),
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_fob_foreign NUMERIC NOT NULL DEFAULT 0,
  line_fob_foreign NUMERIC NOT NULL DEFAULT 0,
  markup_percent NUMERIC NOT NULL DEFAULT 30,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select shipment_lines" ON public.shipment_lines FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert shipment_lines" ON public.shipment_lines FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update shipment_lines" ON public.shipment_lines FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete shipment_lines" ON public.shipment_lines FOR DELETE USING (has_edit_role(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shipment_charges_updated_at BEFORE UPDATE ON public.shipment_charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shipment_lines_updated_at BEFORE UPDATE ON public.shipment_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed costings permission for all roles
INSERT INTO public.role_permissions (role, feature, can_view, can_edit) VALUES
  ('admin', 'costings', true, true),
  ('operator', 'costings', true, true),
  ('viewer', 'costings', true, false),
  ('customer', 'costings', false, false);
