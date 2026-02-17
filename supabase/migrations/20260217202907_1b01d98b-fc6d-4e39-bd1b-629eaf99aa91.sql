
-- Create supply_categories reference table
CREATE TABLE public.supply_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbrev TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Seed with existing categories
INSERT INTO public.supply_categories (name, code) VALUES
  ('Lab Supplies', 'lab'),
  ('Optical Supplies', 'optical'),
  ('Eyewear Accessories', 'accessories');

-- Enable RLS
ALTER TABLE public.supply_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select supply_categories" ON public.supply_categories FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert supply_categories" ON public.supply_categories FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update supply_categories" ON public.supply_categories FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete supply_categories" ON public.supply_categories FOR DELETE USING (has_edit_role(auth.uid()));
