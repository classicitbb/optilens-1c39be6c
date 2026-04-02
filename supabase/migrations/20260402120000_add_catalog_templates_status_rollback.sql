ALTER TABLE public.catalog_templates
DROP CONSTRAINT IF EXISTS catalog_templates_status_check;

ALTER TABLE public.catalog_templates
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.catalog_templates
DROP COLUMN IF EXISTS status;
