
-- Enable RLS on all 4 tables missing it
ALTER TABLE public.catalog_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- catalog_templates: role users can read, editors can manage, admins can delete
CREATE POLICY "Role users can select catalog_templates" ON public.catalog_templates FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert catalog_templates" ON public.catalog_templates FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update catalog_templates" ON public.catalog_templates FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Admins can delete catalog_templates" ON public.catalog_templates FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- catalog_sections: role users can read, editors can manage, admins can delete
CREATE POLICY "Role users can select catalog_sections" ON public.catalog_sections FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert catalog_sections" ON public.catalog_sections FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update catalog_sections" ON public.catalog_sections FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Admins can delete catalog_sections" ON public.catalog_sections FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- catalog_assignments: role users can read, editors can manage, admins can delete
CREATE POLICY "Role users can select catalog_assignments" ON public.catalog_assignments FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert catalog_assignments" ON public.catalog_assignments FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update catalog_assignments" ON public.catalog_assignments FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Admins can delete catalog_assignments" ON public.catalog_assignments FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- customers: role users can read, editors can manage, admins can delete
CREATE POLICY "Role users can select customers" ON public.customers FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Editors can insert customers" ON public.customers FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update customers" ON public.customers FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Admins can delete customers" ON public.customers FOR DELETE USING (has_role(auth.uid(), 'admin'));
