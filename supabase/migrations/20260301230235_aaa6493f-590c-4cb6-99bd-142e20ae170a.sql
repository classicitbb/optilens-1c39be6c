
-- Enable RLS on pre-existing tables missing it
ALTER TABLE public.lead_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_catalog ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_audits
CREATE POLICY "Authenticated users can view lead_audits"
  ON public.lead_audits FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert lead_audits"
  ON public.lead_audits FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update lead_audits"
  ON public.lead_audits FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete lead_audits"
  ON public.lead_audits FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS policies for notes
CREATE POLICY "Authenticated users can view notes"
  ON public.notes FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert notes"
  ON public.notes FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update notes"
  ON public.notes FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete notes"
  ON public.notes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- RLS policies for price_catalog
CREATE POLICY "Authenticated users can view price_catalog"
  ON public.price_catalog FOR SELECT TO authenticated
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert price_catalog"
  ON public.price_catalog FOR INSERT TO authenticated
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update price_catalog"
  ON public.price_catalog FOR UPDATE TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete price_catalog"
  ON public.price_catalog FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));
