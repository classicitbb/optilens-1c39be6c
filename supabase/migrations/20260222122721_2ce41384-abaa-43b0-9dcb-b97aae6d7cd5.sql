-- Drop the overly-restrictive global unique constraint on row_key
-- The composite constraint (pricelist_version_id, catalog_type, row_key) already ensures uniqueness within a version
ALTER TABLE public.pricelist_catalog_rows DROP CONSTRAINT pricelist_catalog_rows_row_key_unique;