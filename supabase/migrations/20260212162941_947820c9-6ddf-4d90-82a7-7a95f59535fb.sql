
-- Allow editors to delete from reference tables
CREATE POLICY "Editors can delete suppliers" ON public.suppliers FOR DELETE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete brands" ON public.brands FOR DELETE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete materials" ON public.materials FOR DELETE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete mftypes" ON public.mftypes FOR DELETE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete lenstypes" ON public.lenstypes FOR DELETE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete lens_options" ON public.lens_options FOR DELETE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete finishtypes" ON public.finishtypes FOR DELETE USING (has_edit_role(auth.uid()));
