
-- Create addons table
CREATE TABLE public.addons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  is_auto boolean NOT NULL DEFAULT false,
  auto_rule jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as supplies)
CREATE POLICY "Role users can select addons"
  ON public.addons FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert addons"
  ON public.addons FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update addons"
  ON public.addons FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete addons"
  ON public.addons FOR DELETE
  USING (has_edit_role(auth.uid()));

-- Timestamp trigger
CREATE TRIGGER update_addons_updated_at
  BEFORE UPDATE ON public.addons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
