-- Fix: allow lens deletion when pricing_input_rows references the lens.
-- The previous FK had no ON DELETE action (defaults to RESTRICT), blocking
-- lens deletes whenever an import batch row referenced that lens.
-- Changing to ON DELETE SET NULL clears the reference without cascading.

ALTER TABLE public.pricing_input_rows
  DROP CONSTRAINT IF EXISTS pricing_input_rows_lens_id_fkey;

ALTER TABLE public.pricing_input_rows
  ADD CONSTRAINT pricing_input_rows_lens_id_fkey
  FOREIGN KEY (lens_id) REFERENCES public.lenses(id) ON DELETE SET NULL;
