
CREATE TABLE public.import_ref_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ref_table text NOT NULL,
  csv_value text NOT NULL,
  mapped_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ref_table, csv_value)
);

ALTER TABLE public.import_ref_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can select import_ref_mappings" ON public.import_ref_mappings FOR SELECT USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can insert import_ref_mappings" ON public.import_ref_mappings FOR INSERT WITH CHECK (has_edit_role(auth.uid()));
CREATE POLICY "Editors can update import_ref_mappings" ON public.import_ref_mappings FOR UPDATE USING (has_edit_role(auth.uid()));
CREATE POLICY "Editors can delete import_ref_mappings" ON public.import_ref_mappings FOR DELETE USING (has_edit_role(auth.uid()));
