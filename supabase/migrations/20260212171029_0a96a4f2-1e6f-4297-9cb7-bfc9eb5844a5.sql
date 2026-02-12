
-- Import batches: tracks each CSV upload
CREATE TABLE public.import_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_rows integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can select import_batches"
  ON public.import_batches FOR SELECT
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can insert import_batches"
  ON public.import_batches FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update import_batches"
  ON public.import_batches FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete import_batches"
  ON public.import_batches FOR DELETE
  USING (has_edit_role(auth.uid()));

CREATE TRIGGER update_import_batches_updated_at
  BEFORE UPDATE ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pricing input rows: staging table for each CSV row
CREATE TABLE public.pricing_input_rows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  raw_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_messages text[] NOT NULL DEFAULT '{}',
  resolved_data jsonb,
  lens_id uuid REFERENCES public.lenses(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_input_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors can select pricing_input_rows"
  ON public.pricing_input_rows FOR SELECT
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can insert pricing_input_rows"
  ON public.pricing_input_rows FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update pricing_input_rows"
  ON public.pricing_input_rows FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete pricing_input_rows"
  ON public.pricing_input_rows FOR DELETE
  USING (has_edit_role(auth.uid()));
