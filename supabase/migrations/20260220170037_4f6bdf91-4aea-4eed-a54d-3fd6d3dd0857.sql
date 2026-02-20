-- Add unique constraint on row_key for pricelist_catalog_rows
ALTER TABLE public.pricelist_catalog_rows 
ADD CONSTRAINT pricelist_catalog_rows_row_key_unique UNIQUE (row_key);

-- Also add unique composite constraint for matrix_allocations to allow upserts
ALTER TABLE public.matrix_allocations
ADD CONSTRAINT matrix_allocations_version_cat_mat_treat_unique 
UNIQUE (pricelist_version_id, category, material_index, treatment_type);