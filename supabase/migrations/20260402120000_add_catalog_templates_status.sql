ALTER TABLE public.catalog_templates
ADD COLUMN IF NOT EXISTS status text;

UPDATE public.catalog_templates
SET status = 'draft'
WHERE status IS NULL;

ALTER TABLE public.catalog_templates
ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.catalog_templates
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.catalog_templates
DROP CONSTRAINT IF EXISTS catalog_templates_status_check;

ALTER TABLE public.catalog_templates
ADD CONSTRAINT catalog_templates_status_check
CHECK (status IN ('draft', 'published'));
