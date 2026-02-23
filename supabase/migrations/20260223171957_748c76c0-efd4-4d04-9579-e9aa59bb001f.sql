-- Add RLS policies to pricelist_child_sections
ALTER TABLE public.pricelist_child_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can insert pricelist_child_sections"
ON public.pricelist_child_sections FOR INSERT
WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_child_sections"
ON public.pricelist_child_sections FOR UPDATE
USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete pricelist_child_sections"
ON public.pricelist_child_sections FOR DELETE
USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select pricelist_child_sections"
ON public.pricelist_child_sections FOR SELECT
USING (has_any_role(auth.uid()));

-- Add RLS policies to pricelist_line_overrides (also missing)
ALTER TABLE public.pricelist_line_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can insert pricelist_line_overrides"
ON public.pricelist_line_overrides FOR INSERT
WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_line_overrides"
ON public.pricelist_line_overrides FOR UPDATE
USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete pricelist_line_overrides"
ON public.pricelist_line_overrides FOR DELETE
USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select pricelist_line_overrides"
ON public.pricelist_line_overrides FOR SELECT
USING (has_any_role(auth.uid()));