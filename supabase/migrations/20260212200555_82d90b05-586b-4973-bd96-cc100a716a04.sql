
-- Add columns to addons
ALTER TABLE public.addons
  ADD COLUMN sku text NOT NULL DEFAULT '',
  ADD COLUMN show_on_website boolean NOT NULL DEFAULT false;

-- Junction table
CREATE TABLE public.addon_pricing_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id uuid NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  pricing_sheet_id uuid NOT NULL REFERENCES public.pricing_sheets(id) ON DELETE CASCADE,
  price_override numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(addon_id, pricing_sheet_id)
);

ALTER TABLE public.addon_pricing_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can insert addon_pricing_sheets"
  ON public.addon_pricing_sheets FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update addon_pricing_sheets"
  ON public.addon_pricing_sheets FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete addon_pricing_sheets"
  ON public.addon_pricing_sheets FOR DELETE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select addon_pricing_sheets"
  ON public.addon_pricing_sheets FOR SELECT
  USING (has_any_role(auth.uid()));
