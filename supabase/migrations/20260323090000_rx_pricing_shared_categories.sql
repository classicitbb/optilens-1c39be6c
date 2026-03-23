BEGIN;

WITH active_groupings AS (
  SELECT id
  FROM public.rx_price_groupings
  WHERE is_active = TRUE
),
shared_category_keys AS (
  SELECT
    key,
    MIN(default_name) AS default_name,
    MIN(sort_order) AS sort_order
  FROM public.rx_price_categories
  WHERE is_active = TRUE
  GROUP BY key
),
missing_group_category_pairs AS (
  SELECT
    g.id AS grouping_id,
    c.key,
    c.default_name,
    c.sort_order
  FROM active_groupings g
  CROSS JOIN shared_category_keys c
  LEFT JOIN public.rx_price_categories existing
    ON existing.grouping_id = g.id
   AND existing.key = c.key
  WHERE existing.id IS NULL
)
INSERT INTO public.rx_price_categories (grouping_id, key, default_name, sort_order, is_active)
SELECT grouping_id, key, default_name, sort_order, TRUE
FROM missing_group_category_pairs;

WITH category_rows AS (
  SELECT id, key, sort_order
  FROM public.rx_price_categories
  WHERE is_active = TRUE
),
existing_version_overrides AS (
  SELECT
    cv.pricelist_version_id,
    c.key,
    MIN(cv.sort_order) AS sort_order,
    MAX(cv.display_name) FILTER (WHERE cv.display_name IS NOT NULL AND trim(cv.display_name) <> '') AS display_name,
    BOOL_AND(cv.is_enabled) AS is_enabled
  FROM public.rx_price_category_versions cv
  JOIN category_rows c ON c.id = cv.category_id
  GROUP BY cv.pricelist_version_id, c.key
),
missing_category_version_rows AS (
  SELECT
    pv.id AS pricelist_version_id,
    c.id AS category_id,
    evo.display_name,
    COALESCE(evo.sort_order, c.sort_order) AS sort_order,
    COALESCE(evo.is_enabled, TRUE) AS is_enabled
  FROM public.pricelist_versions pv
  CROSS JOIN category_rows c
  LEFT JOIN public.rx_price_category_versions existing
    ON existing.pricelist_version_id = pv.id
   AND existing.category_id = c.id
  LEFT JOIN existing_version_overrides evo
    ON evo.pricelist_version_id = pv.id
   AND evo.key = c.key
  WHERE existing.id IS NULL
)
INSERT INTO public.rx_price_category_versions (pricelist_version_id, category_id, display_name, sort_order, is_enabled)
SELECT pricelist_version_id, category_id, display_name, sort_order, is_enabled
FROM missing_category_version_rows;

UPDATE public.rx_price_grouping_versions gv
SET display_name = NULL,
    sort_order = g.sort_order,
    is_enabled = TRUE,
    updated_at = now()
FROM public.rx_price_groupings g
WHERE gv.grouping_id = g.id;

COMMIT;
