
DROP VIEW IF EXISTS public.catalog_live;

CREATE VIEW public.catalog_live
WITH (security_invoker = true) AS
SELECT
  ('lens:' || l.id::text)         AS id,
  'lens'::text                    AS product_type,
  l.id                            AS product_id,
  NULL::text                      AS sku,
  l.name                          AS name,
  NULL::text                      AS category,
  l.supplier_id                   AS supplier_id,
  s.name                          AS supplier_name,
  l.base_price                    AS cost,
  l.sell_price                    AS sell_price,
  'USD'::text                     AS currency,
  l.show_on_website               AS web_enabled,
  l.show_in_ws_pricelist          AS wspl_enabled,
  l.is_active                     AS is_active,
  l.created_at                    AS created_at,
  l.updated_at                    AS updated_at
FROM public.lenses l
LEFT JOIN public.suppliers s ON s.id = l.supplier_id
WHERE l.is_active = true

UNION ALL

SELECT
  ('supply:' || sup.id::text)     AS id,
  'supply'::text                  AS product_type,
  sup.id                          AS product_id,
  sup.sku                         AS sku,
  sup.name                        AS name,
  sup.category                    AS category,
  sup.supplier_id                 AS supplier_id,
  s.name                          AS supplier_name,
  sup.base_price                  AS cost,
  sup.sell_price                  AS sell_price,
  COALESCE(sup.currency, 'USD')   AS currency,
  sup.show_on_website             AS web_enabled,
  sup.stk_wspl                    AS wspl_enabled,
  sup.is_active                   AS is_active,
  sup.created_at                  AS created_at,
  sup.updated_at                  AS updated_at
FROM public.supplies sup
LEFT JOIN public.suppliers s ON s.id = sup.supplier_id
WHERE sup.is_active = true

UNION ALL

SELECT
  ('addon:' || a.id::text)        AS id,
  'addon'::text                   AS product_type,
  a.id                            AS product_id,
  a.sku                           AS sku,
  a.name                          AS name,
  a.category                      AS category,
  a.supplier_id                   AS supplier_id,
  s.name                          AS supplier_name,
  a.cost                          AS cost,
  a.price                         AS sell_price,
  'USD'::text                     AS currency,
  a.show_on_website               AS web_enabled,
  false                           AS wspl_enabled,
  a.is_active                     AS is_active,
  a.created_at                    AS created_at,
  a.updated_at                    AS updated_at
FROM public.addons a
LEFT JOIN public.suppliers s ON s.id = a.supplier_id
WHERE a.is_active = true;

GRANT SELECT ON public.catalog_live TO service_role;
