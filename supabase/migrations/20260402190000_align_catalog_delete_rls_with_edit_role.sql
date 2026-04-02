-- Align catalog delete permissions with the editor-facing catalog publisher UI.
-- Editors already have insert/update access and the app performs delete operations
-- when reassigning customers or removing catalog templates.

DROP POLICY IF EXISTS "Admins can delete catalog_templates" ON public.catalog_templates;
CREATE POLICY "Editors can delete catalog_templates"
  ON public.catalog_templates
  FOR DELETE
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete catalog_sections" ON public.catalog_sections;
CREATE POLICY "Editors can delete catalog_sections"
  ON public.catalog_sections
  FOR DELETE
  USING (public.has_edit_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete catalog_assignments" ON public.catalog_assignments;
CREATE POLICY "Editors can delete catalog_assignments"
  ON public.catalog_assignments
  FOR DELETE
  USING (public.has_edit_role(auth.uid()));
