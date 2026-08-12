-- Keep storefront publication separate from the source catalog's
-- show_on_website flag. NULL preserves legacy publication until staff toggles it.
ALTER TABLE public.store_product_overrides
  ADD COLUMN IF NOT EXISTS is_published boolean;

NOTIFY pgrst, 'reload schema';
