-- Enable RLS on pricelist_notes (last table without RLS)
ALTER TABLE public.pricelist_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select pricelist_notes"
  ON public.pricelist_notes FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert pricelist_notes"
  ON public.pricelist_notes FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_notes"
  ON public.pricelist_notes FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete pricelist_notes"
  ON public.pricelist_notes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));