-- Step 1: Fix treatment_type CHECK constraint (lowercase)
ALTER TABLE public.matrix_allocations 
DROP CONSTRAINT IF EXISTS matrix_allocations_treatment_type_check;

ALTER TABLE public.matrix_allocations 
ADD CONSTRAINT matrix_allocations_treatment_type_check 
CHECK (treatment_type = ANY (ARRAY[
  'clear', 'transitions', 'photochromic', 'polarized', 'bluefilter'
]));