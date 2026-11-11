-- Innovations <-> website pricing reconciliation (phase 1, read-only). Reads the inn_* mirror and the
-- existing website tables; writes nothing. Needs 20261110170000 (tables) and 20261110170100 (lens path view).
--
-- Website lens <-> Innovations option link: lens_alias_map.innovations_alias -> inn_lens_alias.alias -> option.
-- Where a lens has several aliases the PRIMARY one (then highest match_confidence) is used.
--
--   (a) inn_recon_price_vs_website       website price vs Innovations price, per lens, per list, per eye
--   (b) inn_recon_website_lens_off       lenses sold on the website that are OFF (or unverifiable) in Innovations
--   (c) inn_recon_zero_cost_lens_lines   2026 lens invoice lines with CostPrice = 0 (+ _summary)
--   (d) inn_recon_stale_cost_lists       cost lists in use whose items are older than 2022

CREATE OR REPLACE VIEW public.inn_recon_primary_alias WITH (security_invoker = true) AS
SELECT DISTINCT ON (m.lens_id) m.lens_id, m.innovations_alias AS alias
FROM public.lens_alias_map m
ORDER BY m.lens_id, m.is_primary DESC, m.match_confidence DESC NULLS LAST, m.innovations_alias;

-- (a) ---------------------------------------------------------------------------------------------------
-- Only website price documents mapped to an Innovations list in inn_pricelist_map are compared (there is no
-- id link today; staff fill that table). Units: the website stores a PAIR price in BBD; Rx is charged per eye
-- (each side half its own pair price), so the website per-eye price is pair / 2. Innovations PriceRxPOSItems.Price
-- is taken as a per-eye price in the list's currency, converted to BBD with Currencies.CurrentExchangeRate
-- (units of that currency per 1 BBD). Rows with price = 0 are group-level placeholders and are ignored: a lens
-- that is priced only through a PriceLensGroup shows as no_innovations_price (the mirror holds no lens -> group link).
-- status: match | differs | no_innovations_price | alias_not_in_innovations | no_alias_mapping | no_currency_rate
CREATE OR REPLACE VIEW public.inn_recon_price_vs_website WITH (security_invoker = true) AS
WITH site AS (
  SELECT
    ma.id AS allocation_id, ma.pricelist_version_id, pv.name AS version_name, pm.inn_price_list_id,
    ma.treatment_type, ma.category, ma.material_index, ma.lens_id, l.name AS lens_name,
    ma.allocated_price_bbd AS website_pair_bbd,
    round(ma.allocated_price_bbd / 2.0, 2) AS website_per_eye_bbd
  FROM public.matrix_allocations ma
  JOIN public.inn_pricelist_map pm ON pm.pricelist_version_id = ma.pricelist_version_id
  JOIN public.pricelist_versions pv ON pv.id = ma.pricelist_version_id
  JOIN public.lenses l ON l.id = ma.lens_id
  WHERE ma.is_active IS NOT FALSE AND ma.allocated_price_bbd IS NOT NULL
)
SELECT
  s.allocation_id, s.pricelist_version_id, s.version_name, s.inn_price_list_id, pl.price_list_name AS inn_price_list_name,
  s.treatment_type, s.category, s.material_index, s.lens_id, s.lens_name,
  pa.alias, a.lens_option_id, ps.path_code, ps.on_full_path AS option_on_full_path,
  s.website_pair_bbd, s.website_per_eye_bbd,
  inn.n_rows AS inn_price_rows, inn.min_bbd AS inn_min_per_eye_bbd, inn.max_bbd AS inn_max_per_eye_bbd,
  CASE
    WHEN pa.alias IS NULL THEN 'no_alias_mapping'
    WHEN a.lens_option_id IS NULL THEN 'alias_not_in_innovations'
    WHEN COALESCE(cu.current_exchange_rate, 0) = 0 THEN 'no_currency_rate'
    WHEN inn.n_rows = 0 THEN 'no_innovations_price'
    WHEN inn.any_match THEN 'match'
    ELSE 'differs'
  END AS status,
  CASE WHEN inn.n_rows > 0 AND NOT inn.any_match THEN round(s.website_per_eye_bbd - inn.min_bbd, 2) END AS diff_vs_min_bbd,
  CASE WHEN inn.n_rows > 0 AND NOT inn.any_match THEN round(s.website_per_eye_bbd - inn.max_bbd, 2) END AS diff_vs_max_bbd
FROM site s
LEFT JOIN public.inn_recon_primary_alias pa ON pa.lens_id = s.lens_id
LEFT JOIN public.inn_lens_alias a ON a.alias = pa.alias
LEFT JOIN public.inn_lens_path_status ps ON ps.lens_option_id = a.lens_option_id
LEFT JOIN public.inn_price_lists pl ON pl.price_list_id = s.inn_price_list_id
LEFT JOIN public.inn_currencies cu ON cu.currency_id = pl.currency_id
LEFT JOIN LATERAL (
  SELECT
    count(*)::int AS n_rows,
    min(round(it.price / NULLIF(cu.current_exchange_rate::numeric, 0), 2)) AS min_bbd,
    max(round(it.price / NULLIF(cu.current_exchange_rate::numeric, 0), 2)) AS max_bbd,
    COALESCE(bool_or(abs(round(it.price / NULLIF(cu.current_exchange_rate::numeric, 0), 2) - s.website_per_eye_bbd) < 0.01), false) AS any_match
  FROM public.inn_rx_pos_items it
  JOIN public.inn_rx_pos_sheets sh
    ON sh.price_rx_pos_sheet_id = it.price_rx_pos_sheet_id AND sh.price_list_id = s.inn_price_list_id AND sh.is_active IS NOT FALSE
  WHERE a.lens_option_id IS NOT NULL
    AND it.price > 0
    AND it.material_group_num = a.group_num AND it.material_num = a.material_num AND it.mf_type_num = a.mf_num
    AND it.lens_type_num = a.lens_type_num AND it.lens_option_num = a.option_num
) inn ON true;

-- (b) ---------------------------------------------------------------------------------------------------
-- "Sold on the website" = active lens that is shown on the website or sits in an active price-matrix cell.
-- reason: off_in_innovations (a level of its path is OFF or missing) | alias_not_in_innovations | no_alias_mapping
CREATE OR REPLACE VIEW public.inn_recon_website_lens_off WITH (security_invoker = true) AS
SELECT
  l.id AS lens_id, l.name AS lens_name, l.show_on_website, l.show_in_pricelist, l.show_in_ws_pricelist,
  pa.alias, a.lens_option_id, ps.path_code, ps.option_name AS innovations_option_name,
  ps.group_state, ps.material_state, ps.mf_type_state, ps.lens_type_state, ps.option_state,
  ps.first_failing_level, ps.first_failing_reason,
  CASE
    WHEN pa.alias IS NULL THEN 'no_alias_mapping'
    WHEN a.lens_option_id IS NULL OR ps.lens_option_id IS NULL THEN 'alias_not_in_innovations'
    ELSE 'off_in_innovations'
  END AS reason
FROM public.lenses l
LEFT JOIN public.inn_recon_primary_alias pa ON pa.lens_id = l.id
LEFT JOIN public.inn_lens_alias a ON a.alias = pa.alias
LEFT JOIN public.inn_lens_path_status ps ON ps.lens_option_id = a.lens_option_id
WHERE l.is_active
  AND (l.show_on_website OR EXISTS (
    SELECT 1 FROM public.matrix_allocations ma
    WHERE ma.lens_id = l.id AND ma.is_active IS NOT FALSE AND ma.allocated_price_bbd IS NOT NULL))
  AND (pa.alias IS NULL OR a.lens_option_id IS NULL OR ps.lens_option_id IS NULL OR NOT ps.on_full_path);

-- (c) ---------------------------------------------------------------------------------------------------
-- Lens lines (CategoryType 1) on 2026 invoices with no cost. charged_unsuppressed marks the Phase 0 definition
-- (InvoicePrice > 0 and not a suppressed package component). Package components carry cost on suppressed
-- lines, so also read the summary, which counts charged_unsuppressed lines only.
CREATE OR REPLACE VIEW public.inn_recon_zero_cost_lens_lines WITH (security_invoker = true) AS
SELECT
  il.invoice_line_id, il.invoice_id, il.customer_id, il.invoice_time, il.price_list_id, il.price_list_name,
  il.price_group_id, il.package_id, il.suppressed, il.quantity, il.price_list_price, il.invoice_price, il.cost_price,
  il.description, il.sku, il.reference_order_id,
  (COALESCE(il.invoice_price, 0) > 0 AND NOT COALESCE(il.suppressed, false)) AS charged_unsuppressed
FROM public.inn_invoice_lines il
WHERE il.invoice_time >= timestamptz '2026-01-01' AND il.invoice_time < timestamptz '2027-01-01'
  AND il.category_type = 1
  AND COALESCE(il.cost_price, 0) = 0;

CREATE OR REPLACE VIEW public.inn_recon_zero_cost_lens_summary WITH (security_invoker = true) AS
SELECT
  date_trunc('month', z.invoice_time)::date AS invoice_month, z.price_list_id, z.price_list_name,
  count(*)::int AS zero_cost_lines, sum(z.invoice_price) AS revenue_on_zero_cost_lines
FROM public.inn_recon_zero_cost_lens_lines z
WHERE z.charged_unsuppressed
GROUP BY 1, 2, 3;

-- (d) ---------------------------------------------------------------------------------------------------
-- Cost lists (PricelistGroup = 1) that are active and used by at least one lab (LabExtras.LabID = Labs.num).
-- Items = Rx POS items plus stock-lens items.
-- flag: all_items_older_than_2022 | some_items_older_than_2022 | no_items | ok.
CREATE OR REPLACE VIEW public.inn_recon_stale_cost_lists WITH (security_invoker = true) AS
WITH used AS (
  SELECT le.price_list_id, string_agg(DISTINCT lb.name, ', ' ORDER BY lb.name) AS labs, count(DISTINCT lb.lab_num)::int AS lab_count
  FROM public.inn_lab_extras le
  JOIN public.inn_labs lb ON lb.lab_num = le.lab_num
  WHERE le.price_list_id IS NOT NULL
  GROUP BY le.price_list_id
), items AS (
  SELECT sh.price_list_id, it.source_updated_at FROM public.inn_rx_pos_items it
    JOIN public.inn_rx_pos_sheets sh ON sh.price_rx_pos_sheet_id = it.price_rx_pos_sheet_id
  UNION ALL
  SELECT sl.price_list_id, si.source_updated_at FROM public.inn_stock_lens_items si
    JOIN public.inn_stock_lenses sl ON sl.price_stock_lens_id = si.price_stock_lens_id
), agg AS (
  SELECT price_list_id, count(*)::int AS n_items,
         count(*) FILTER (WHERE source_updated_at < timestamptz '2022-01-01')::int AS n_items_before_2022,
         min(source_updated_at) AS oldest_item_updated, max(source_updated_at) AS newest_item_updated
  FROM items GROUP BY price_list_id
)
SELECT
  pl.price_list_id, pl.price_list_name, pl.currency_id, pl.source_updated_at AS list_updated,
  u.labs, u.lab_count,
  COALESCE(g.n_items, 0) AS n_items, COALESCE(g.n_items_before_2022, 0) AS n_items_before_2022,
  g.oldest_item_updated, g.newest_item_updated,
  CASE
    WHEN COALESCE(g.n_items, 0) = 0 THEN 'no_items'
    WHEN g.newest_item_updated < timestamptz '2022-01-01' THEN 'all_items_older_than_2022'
    WHEN g.n_items_before_2022 > 0 THEN 'some_items_older_than_2022'
    ELSE 'ok'
  END AS flag
FROM public.inn_price_lists pl
JOIN used u ON u.price_list_id = pl.price_list_id
LEFT JOIN agg g ON g.price_list_id = pl.price_list_id
WHERE pl.price_list_group = 1 AND pl.is_active IS NOT FALSE;

GRANT SELECT ON public.inn_recon_primary_alias, public.inn_recon_price_vs_website, public.inn_recon_website_lens_off,
  public.inn_recon_zero_cost_lens_lines, public.inn_recon_zero_cost_lens_summary, public.inn_recon_stale_cost_lists TO authenticated;
GRANT SELECT ON public.inn_recon_primary_alias, public.inn_recon_price_vs_website, public.inn_recon_website_lens_off,
  public.inn_recon_zero_cost_lens_lines, public.inn_recon_zero_cost_lens_summary, public.inn_recon_stale_cost_lists TO service_role;
NOTIFY pgrst, 'reload schema';
