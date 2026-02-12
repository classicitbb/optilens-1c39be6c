CREATE POLICY "Editors can delete lenses"
ON public.lenses
FOR DELETE
USING (has_edit_role(auth.uid()));