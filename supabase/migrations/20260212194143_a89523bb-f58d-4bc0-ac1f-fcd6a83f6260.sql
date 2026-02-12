
-- Create supplies table
CREATE TABLE public.supplies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'lab',
  description text NOT NULL DEFAULT '',
  sku text DEFAULT '',
  base_price numeric NOT NULL DEFAULT 0,
  sell_price numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'each',
  quantity_per_unit integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  show_on_website boolean NOT NULL DEFAULT false,
  image_url text DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

-- RLS policies mirroring lenses pattern
CREATE POLICY "Editors can insert supplies"
  ON public.supplies FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update supplies"
  ON public.supplies FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete supplies"
  ON public.supplies FOR DELETE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select supplies"
  ON public.supplies FOR SELECT
  USING (has_any_role(auth.uid()));

-- Allow anonymous/authenticated users to see website-visible supplies
CREATE POLICY "Anyone can view website supplies"
  ON public.supplies FOR SELECT
  USING (show_on_website = true);

-- Also allow anyone to see website-visible lenses (for storefront)
CREATE POLICY "Anyone can view website lenses"
  ON public.lenses FOR SELECT
  USING (show_on_website = true);

-- Trigger for updated_at
CREATE TRIGGER update_supplies_updated_at
  BEFORE UPDATE ON public.supplies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add product_type to cart_items and order_items
ALTER TABLE public.cart_items ADD COLUMN product_type text NOT NULL DEFAULT 'lens';
ALTER TABLE public.order_items ADD COLUMN product_type text NOT NULL DEFAULT 'lens';
