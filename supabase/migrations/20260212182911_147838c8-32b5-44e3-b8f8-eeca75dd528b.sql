
-- Pricing sheets: custom named tabs for lens pricing
CREATE TABLE public.pricing_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_sheets ENABLE ROW LEVEL SECURITY;

-- All authenticated users with any role can view
CREATE POLICY "Users with roles can view pricing sheets"
  ON public.pricing_sheets FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

-- Only admin/operator can insert
CREATE POLICY "Editors can insert pricing sheets"
  ON public.pricing_sheets FOR INSERT TO authenticated
  WITH CHECK (public.has_edit_role(auth.uid()));

-- Only admin/operator can update
CREATE POLICY "Editors can update pricing sheets"
  ON public.pricing_sheets FOR UPDATE TO authenticated
  USING (public.has_edit_role(auth.uid()));

-- Only admin can delete
CREATE POLICY "Admins can delete pricing sheets"
  ON public.pricing_sheets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_pricing_sheets_updated_at
  BEFORE UPDATE ON public.pricing_sheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
