-- Enable RLS on matrix_allocations
ALTER TABLE public.matrix_allocations ENABLE ROW LEVEL SECURITY;

-- Policies matching the same pattern as other tables
CREATE POLICY "Role users can select matrix_allocations"
ON public.matrix_allocations FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can insert matrix_allocations"
ON public.matrix_allocations FOR INSERT
WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update matrix_allocations"
ON public.matrix_allocations FOR UPDATE
USING (has_edit_role(auth.uid()));

CREATE POLICY "Admins can delete matrix_allocations"
ON public.matrix_allocations FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));