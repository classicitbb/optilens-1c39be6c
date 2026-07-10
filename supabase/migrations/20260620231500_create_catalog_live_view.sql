-- Phase 1 of the live-sync catalog: a read-only view that unifies the three
-- product tables (lenses, supplies, addons) into one catalog shape the
-- pricelist builder consumes. No data is copied — every read reflects the
-- current product tables, so there is nothing to "publish" or keep in sync.
--
-- Cost is served in USD (lenses/addons have no currency column and are USD;
-- supplies carries its own currency). The pricelist builder grades competitive
-- prices by supplier, so supplier_name is denormalised in for its parity check.
--
-- Only active products are exposed. To include inactive rows later, drop the
-- `WHERE ... is_active` clauses (is_active is already a column on the view).
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
    l.updated_at           AS updated_at
  FROM public.lenses l
  LEFT JOIN public.suppliers s ON s.id = l.supplier_id
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
    sp.updated_at
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
    a.updated_at
  FROM public.addons a
  LEFT JOIN public.suppliers s ON s.id = a.supplier_id
  WHERE a.is_active;

-- The api-v1 edge function reads this view with the service-role key. Cost is
-- intentionally NOT granted to anon/authenticated — it is only reachable
-- through the scoped x-api-key API (catalog:read).
GRANT SELECT ON public.catalog_live TO service_role;
