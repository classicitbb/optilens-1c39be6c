-- Round out catalog_live with the lens-classification attributes the pricing
-- engine uses to match equivalent lenses across suppliers in the Rx matrix:
-- lenstype, material, mftype. These are FK lookups on `lenses`, resolved to
-- readable names; supplies/addons carry NULL for them.
--
-- CREATE OR REPLACE only allows appending columns, so the existing 16 columns
-- stay in the same order and the three new ones are added at the end.
CREATE OR REPLACE VIEW public.catalog_live AS
  SELECT
    l.id                   AS id,
    'lens'::text           AS product_type,
    l.id                   AS product_id,
    NULL::text             AS sku,
    l.name                 AS name,
    l.pricing_category     AS category,
    l.supplier_id          AS supplier_id,
    s.name                 AS supplier_name,
    l.base_price           AS cost,
    l.sell_price           AS sell_price,
    'USD'::text            AS currency,
    l.show_on_website      AS web_enabled,
    l.show_in_ws_pricelist AS wspl_enabled,
    l.is_active            AS is_active,
    l.created_at           AS created_at,
    l.updated_at           AS updated_at,
    lt.name                AS lenstype,
    m.name                 AS material,
    mf.name                AS mftype
  FROM public.lenses l
  LEFT JOIN public.suppliers s  ON s.id  = l.supplier_id
  LEFT JOIN public.lenstypes lt ON lt.id = l.lenstype_id
  LEFT JOIN public.materials m  ON m.id  = l.material_id
  LEFT JOIN public.mftypes mf   ON mf.id = l.mftype_id
  WHERE l.is_active

  UNION ALL

  SELECT
    sp.id,
    'supply'::text,
    sp.id,
    sp.sku,
    sp.name,
    sp.category,
    sp.supplier_id,
    s.name,
    sp.base_price,
    sp.sell_price,
    COALESCE(sp.currency, 'USD'),
    sp.show_on_website,
    sp.stk_wspl,
    sp.is_active,
    sp.created_at,
    sp.updated_at,
    NULL::text,
    NULL::text,
    NULL::text
  FROM public.supplies sp
  LEFT JOIN public.suppliers s ON s.id = sp.supplier_id
  WHERE sp.is_active

  UNION ALL

  SELECT
    a.id,
    'addon'::text,
    a.id,
    a.sku,
    a.name,
    a.category,
    a.supplier_id,
    s.name,
    a.cost,
    a.price,
    'USD'::text,
    a.show_on_website,
    false,
    a.is_active,
    a.created_at,
    a.updated_at,
    NULL::text,
    NULL::text,
    NULL::text
  FROM public.addons a
  LEFT JOIN public.suppliers s ON s.id = a.supplier_id
  WHERE a.is_active;

GRANT SELECT ON public.catalog_live TO service_role;
