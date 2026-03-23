BEGIN;

ALTER TABLE public.matrix_allocations
  DROP CONSTRAINT IF EXISTS matrix_allocations_treatment_type_check;

ALTER TABLE public.matrix_allocations
  ADD CONSTRAINT matrix_allocations_treatment_type_check
  CHECK (char_length(trim(treatment_type)) > 0);

CREATE TABLE IF NOT EXISTS public.rx_price_groupings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  default_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rx_price_categories (
  id BIGSERIAL PRIMARY KEY,
  grouping_id BIGINT NOT NULL REFERENCES public.rx_price_groupings(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  default_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rx_price_categories_grouping_key_unique UNIQUE (grouping_id, key)
);

CREATE TABLE IF NOT EXISTS public.rx_price_grouping_versions (
  id BIGSERIAL PRIMARY KEY,
  pricelist_version_id BIGINT NOT NULL REFERENCES public.pricelist_versions(id) ON DELETE CASCADE,
  grouping_id BIGINT NOT NULL REFERENCES public.rx_price_groupings(id) ON DELETE CASCADE,
  display_name TEXT NULL,
  sort_order INTEGER NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rx_price_grouping_versions_version_group_unique UNIQUE (pricelist_version_id, grouping_id)
);

CREATE TABLE IF NOT EXISTS public.rx_price_category_versions (
  id BIGSERIAL PRIMARY KEY,
  pricelist_version_id BIGINT NOT NULL REFERENCES public.pricelist_versions(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES public.rx_price_categories(id) ON DELETE CASCADE,
  display_name TEXT NULL,
  sort_order INTEGER NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rx_price_category_versions_version_category_unique UNIQUE (pricelist_version_id, category_id)
);

ALTER TABLE public.rx_price_groupings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rx_price_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rx_price_grouping_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rx_price_category_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select rx_price_groupings"
ON public.rx_price_groupings FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can mutate rx_price_groupings"
ON public.rx_price_groupings FOR ALL
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select rx_price_categories"
ON public.rx_price_categories FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can mutate rx_price_categories"
ON public.rx_price_categories FOR ALL
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select rx_price_grouping_versions"
ON public.rx_price_grouping_versions FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can mutate rx_price_grouping_versions"
ON public.rx_price_grouping_versions FOR ALL
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Role users can select rx_price_category_versions"
ON public.rx_price_category_versions FOR SELECT
USING (has_role(auth.uid(), 'viewer'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Editors can mutate rx_price_category_versions"
ON public.rx_price_category_versions FOR ALL
USING (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.rx_price_groupings (key, default_name, sort_order)
VALUES
  ('clear', 'Clear Lenses', 0),
  ('transitions', 'Transitions', 1),
  ('photochromic', 'Photochromic', 2),
  ('polarized', 'Polarized', 3),
  ('bluefilter', 'Bluefilter', 4)
ON CONFLICT (key) DO UPDATE
SET default_name = EXCLUDED.default_name,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = now();

WITH grouping_keys AS (
  SELECT id, key
  FROM public.rx_price_groupings
),
seed_categories AS (
  SELECT * FROM (VALUES
    ('clear', 'progressive_best', 'Progressive - Best', 0),
    ('clear', 'progressive_better', 'Progressive - Better', 1),
    ('clear', 'progressive_good', 'Progressive - Good', 2),
    ('clear', 'specific_use_office', 'Specific Use - Office', 3),
    ('clear', 'specific_use_bifocal_ft', 'Specific Use - Bifocal FT', 4),
    ('clear', 'specific_use_drive_pal', 'Specific Use - Drive PAL', 5),
    ('clear', 'specific_use_drive_sv', 'Specific Use - Drive SV', 6),
    ('clear', 'specific_use_curved_lens', 'Specific Use - Curved Lens', 7),
    ('clear', 'single_vision_antifatigue', 'Single Vision - Antifatigue', 8),
    ('clear', 'single_vision_single_vision', 'Single Vision - Single Vision', 9),
    ('transitions', 'progressive_best', 'Progressive - Best', 0),
    ('transitions', 'progressive_better', 'Progressive - Better', 1),
    ('transitions', 'progressive_good', 'Progressive - Good', 2),
    ('transitions', 'specific_use_office', 'Specific Use - Office', 3),
    ('transitions', 'specific_use_bifocal_ft', 'Specific Use - Bifocal FT', 4),
    ('transitions', 'specific_use_drive_pal', 'Specific Use - Drive PAL', 5),
    ('transitions', 'specific_use_drive_sv', 'Specific Use - Drive SV', 6),
    ('transitions', 'specific_use_curved_lens', 'Specific Use - Curved Lens', 7),
    ('transitions', 'single_vision_antifatigue', 'Single Vision - Antifatigue', 8),
    ('transitions', 'single_vision_single_vision', 'Single Vision - Single Vision', 9),
    ('photochromic', 'progressive_best', 'Progressive - Best', 0),
    ('photochromic', 'progressive_better', 'Progressive - Better', 1),
    ('photochromic', 'progressive_good', 'Progressive - Good', 2),
    ('photochromic', 'specific_use_office', 'Specific Use - Office', 3),
    ('photochromic', 'specific_use_bifocal_ft', 'Specific Use - Bifocal FT', 4),
    ('photochromic', 'specific_use_drive_pal', 'Specific Use - Drive PAL', 5),
    ('photochromic', 'specific_use_drive_sv', 'Specific Use - Drive SV', 6),
    ('photochromic', 'specific_use_curved_lens', 'Specific Use - Curved Lens', 7),
    ('photochromic', 'single_vision_antifatigue', 'Single Vision - Antifatigue', 8),
    ('photochromic', 'single_vision_single_vision', 'Single Vision - Single Vision', 9),
    ('polarized', 'progressive_best', 'Progressive - Best', 0),
    ('polarized', 'progressive_better', 'Progressive - Better', 1),
    ('polarized', 'progressive_good', 'Progressive - Good', 2),
    ('polarized', 'specific_use_office', 'Specific Use - Office', 3),
    ('polarized', 'specific_use_bifocal_ft', 'Specific Use - Bifocal FT', 4),
    ('polarized', 'specific_use_drive_pal', 'Specific Use - Drive PAL', 5),
    ('polarized', 'specific_use_drive_sv', 'Specific Use - Drive SV', 6),
    ('polarized', 'specific_use_curved_lens', 'Specific Use - Curved Lens', 7),
    ('polarized', 'single_vision_antifatigue', 'Single Vision - Antifatigue', 8),
    ('polarized', 'single_vision_single_vision', 'Single Vision - Single Vision', 9),
    ('bluefilter', 'progressive_best', 'Progressive - Best', 0),
    ('bluefilter', 'progressive_better', 'Progressive - Better', 1),
    ('bluefilter', 'progressive_good', 'Progressive - Good', 2),
    ('bluefilter', 'specific_use_office', 'Specific Use - Office', 3),
    ('bluefilter', 'specific_use_bifocal_ft', 'Specific Use - Bifocal FT', 4),
    ('bluefilter', 'specific_use_drive_pal', 'Specific Use - Drive PAL', 5),
    ('bluefilter', 'specific_use_drive_sv', 'Specific Use - Drive SV', 6),
    ('bluefilter', 'specific_use_curved_lens', 'Specific Use - Curved Lens', 7),
    ('bluefilter', 'single_vision_antifatigue', 'Single Vision - Antifatigue', 8),
    ('bluefilter', 'single_vision_single_vision', 'Single Vision - Single Vision', 9)
  ) AS t(group_key, category_key, category_name, sort_order)
)
INSERT INTO public.rx_price_categories (grouping_id, key, default_name, sort_order)
SELECT g.id, s.category_key, s.category_name, s.sort_order
FROM seed_categories s
JOIN grouping_keys g ON g.key = s.group_key
ON CONFLICT (grouping_id, key) DO UPDATE
SET default_name = EXCLUDED.default_name,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    updated_at = now();

INSERT INTO public.rx_price_grouping_versions (pricelist_version_id, grouping_id, display_name, sort_order, is_enabled)
SELECT v.id, g.id, NULL, g.sort_order, TRUE
FROM public.pricelist_versions v
CROSS JOIN public.rx_price_groupings g
ON CONFLICT (pricelist_version_id, grouping_id) DO UPDATE
SET sort_order = COALESCE(public.rx_price_grouping_versions.sort_order, EXCLUDED.sort_order),
    is_enabled = TRUE,
    updated_at = now();

INSERT INTO public.rx_price_category_versions (pricelist_version_id, category_id, display_name, sort_order, is_enabled)
SELECT v.id, c.id, NULL, c.sort_order, TRUE
FROM public.pricelist_versions v
CROSS JOIN public.rx_price_categories c
ON CONFLICT (pricelist_version_id, category_id) DO UPDATE
SET sort_order = COALESCE(public.rx_price_category_versions.sort_order, EXCLUDED.sort_order),
    is_enabled = TRUE,
    updated_at = now();

UPDATE public.matrix_allocations AS ma
SET category = mapped.category_key
FROM (
  SELECT g.key AS group_key, c.key AS category_key, c.default_name AS category_name
  FROM public.rx_price_groupings g
  JOIN public.rx_price_categories c ON c.grouping_id = g.id
) AS mapped
WHERE ma.treatment_type = mapped.group_key
  AND ma.category = mapped.category_name;

UPDATE public.pricelist_catalog_rows AS pcr
SET row_key = CONCAT('matrix::', mapped.group_key, '::', mapped.category_key, '::', split_part(pcr.row_key, '::', 4))
FROM (
  SELECT g.key AS group_key, c.key AS category_key, c.default_name AS category_name
  FROM public.rx_price_groupings g
  JOIN public.rx_price_categories c ON c.grouping_id = g.id
) AS mapped
WHERE pcr.row_key LIKE 'matrix::%'
  AND split_part(pcr.row_key, '::', 2) = mapped.group_key
  AND split_part(pcr.row_key, '::', 3) = mapped.category_name;

COMMIT;
