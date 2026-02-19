-- Enable RLS on price_matrix and pricelist_versions and pricelist_overrides
ALTER TABLE public.price_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricelist_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricelist_overrides ENABLE ROW LEVEL SECURITY;

-- price_matrix policies
CREATE POLICY "Role users can select price_matrix"
  ON public.price_matrix FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can update price_matrix"
  ON public.price_matrix FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can insert price_matrix"
  ON public.price_matrix FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete price_matrix"
  ON public.price_matrix FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- pricelist_versions policies
CREATE POLICY "Role users can select pricelist_versions"
  ON public.pricelist_versions FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert pricelist_versions"
  ON public.pricelist_versions FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_versions"
  ON public.pricelist_versions FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete pricelist_versions"
  ON public.pricelist_versions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- pricelist_overrides policies
CREATE POLICY "Role users can select pricelist_overrides"
  ON public.pricelist_overrides FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert pricelist_overrides"
  ON public.pricelist_overrides FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricelist_overrides"
  ON public.pricelist_overrides FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete pricelist_overrides"
  ON public.pricelist_overrides FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));