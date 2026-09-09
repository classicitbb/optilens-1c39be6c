-- Repair the stock-order catalog and HA Optical's Innova family links.
-- Stock lens rows are pair prices; stock-order lines are individual lenses.

DO $migration$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public.resolve_stock_order_price(integer,text,uuid,numeric,text)'::regprocedure)
  INTO v_def;
  IF position('round(v_price / 2, 2)' in v_def) = 0 THEN
    v_def := replace(
      v_def,
      'RETURN QUERY SELECT v_price, v_source,',
      'IF p_product_type = ''lens'' THEN v_price := round(v_price / 2, 2); END IF;' || chr(10) || chr(10) ||
      '  RETURN QUERY SELECT v_price, v_source,'
    );
    EXECUTE v_def;
  END IF;

  SELECT pg_get_functiondef('public._price_stock_order_items(integer,jsonb)'::regprocedure)
  INTO v_def;
  IF position('round(v_unit_price / 2, 2)' in v_def) = 0 THEN
    v_def := replace(
      v_def,
      'IF v_unit_price IS NULL THEN',
      'IF v_product_type = ''lens'' AND v_unit_price IS NOT NULL THEN v_unit_price := round(v_unit_price / 2, 2); END IF;' || chr(10) || chr(10) ||
      '    IF v_unit_price IS NULL THEN'
    );
    EXECUTE v_def;
  END IF;

  SELECT pg_get_functiondef('public.get_stock_order_catalog(integer)'::regprocedure)
  INTO v_def;
  v_def := replace(
    v_def,
    'SELECT lower(btrim(name)) = ''retail'' INTO v_is_retail FROM public.customers WHERE id = p_account_id;',
    'SELECT lower(btrim(c.name)) = ''retail'' INTO v_is_retail FROM public.customers c WHERE c.id = p_account_id;'
  );
  EXECUTE v_def;
END
$migration$;

UPDATE public.innovations_family_lens_map
SET lens_id = CASE innovations_lens_id
    WHEN '1:8:4:40:9:2:5' THEN '15420a5a-2960-4d5f-956a-d85a20bad396'::uuid
    WHEN '1:7:4:17:9:19:0' THEN '129389bb-9bcf-48ad-b2ba-cf8ded7e5da0'::uuid
    WHEN '1:1:4:171:1:2:0' THEN 'a193d18b-9b49-4dfa-86f3-24cf233cd3c4'::uuid
  END,
  match_source = 'manual', confidence = 1, updated_at = now()
WHERE innovations_lens_id IN ('1:8:4:40:9:2:5', '1:7:4:17:9:19:0', '1:1:4:171:1:2:0');

UPDATE public.lenses
SET show_on_website = true
WHERE id = '0b93c038-cbb0-4fec-9ad7-8fc1c3a6bc0d'::uuid AND is_active;

UPDATE public.pricelist_catalog_rows
SET bbd_price = CASE item_id
    WHEN '0b93c038-cbb0-4fec-9ad7-8fc1c3a6bc0d'::uuid THEN 108
    WHEN '5926cb3e-4053-4be3-b7d7-7abe84869e4b'::uuid THEN 9
    WHEN 'd31c43b0-3dfb-4a62-a196-763403290e41'::uuid THEN 82
  END,
  updated_at = now()
WHERE pricelist_version_id = 21 AND catalog_type = 'stock' AND row_type = 'lens'
  AND item_id IN (
    '0b93c038-cbb0-4fec-9ad7-8fc1c3a6bc0d'::uuid,
    '5926cb3e-4053-4be3-b7d7-7abe84869e4b'::uuid,
    'd31c43b0-3dfb-4a62-a196-763403290e41'::uuid
  );

INSERT INTO public.pricelist_catalog_rows
  (pricelist_version_id, catalog_type, row_key, row_type, section, display_description, bbd_price, item_id, sort_order)
VALUES
  (21, 'stock', 'lens-15420a5a-2960-4d5f-956a-d85a20bad396', 'lens', '4',
   '1.67 SF PROG Accolade Trans 8 Gray', 283, '15420a5a-2960-4d5f-956a-d85a20bad396', 3)
ON CONFLICT (pricelist_version_id, catalog_type, row_key)
DO UPDATE SET bbd_price = excluded.bbd_price, item_id = excluded.item_id,
  display_description = excluded.display_description, updated_at = now();

INSERT INTO public.store_product_variants
  (product_type, product_id, title, variant_key, sku, opc_code, attributes, metadata,
   price, cost, stock_qty, reserved_qty, low_stock_threshold, allow_backorder, is_active, sort_order)
VALUES
  ('lens', '0b93c038-cbb0-4fec-9ad7-8fc1c3a6bc0d', 'SPHERE 4.00 / ADD 2.75',
   'sphere:4|cylinder:2.75|diameter:76', 'LENS-4.00-2.75-76.00', NULL,
   '{"sphere":4,"cylinder":2.75,"diameter":76}',
   '{"is_chiral":true,"opc_by_eye":{"left":"0011474871","right":"0011474889"},"innovations_power_row_ids":["77f465b0-7743-40f8-8ef1-3d191831af8b"]}',
   266.70, 35, 14, 0, 0, false, true, 80),
  ('lens', '15420a5a-2960-4d5f-956a-d85a20bad396', 'SPHERE 4.00 / ADD 1.50',
   'sphere:4|cylinder:1.5|diameter:78', 'LENS-4.00-1.50-78.00', NULL,
   '{"sphere":4,"cylinder":1.5,"diameter":78}',
   '{"is_chiral":true,"opc_by_eye":{"left":"0209536846","right":"0209537448"},"innovations_power_row_ids":["d5f417e4-a015-4a30-a198-c41571d676a7"]}',
   409.50, 86, 2, 0, 0, false, true, 40),
  ('lens', '5926cb3e-4053-4be3-b7d7-7abe84869e4b', 'SPHERE 6.00 / ADD 2.75',
   'sphere:6|cylinder:2.75|diameter:70', 'LENS-6.00-2.75-70.00', NULL,
   '{"sphere":6,"cylinder":2.75,"diameter":70}',
   '{"is_chiral":true,"opc_by_eye":{"left":"0023408065","right":"0024408072"},"innovations_power_row_ids":["bc439645-7e1f-4452-be99-4f189186ee4b"]}',
   54.60, 8.94, 16, 0, 0, false, true, 4841)
ON CONFLICT (product_type, product_id, variant_key)
DO UPDATE SET title = excluded.title, sku = excluded.sku, opc_code = excluded.opc_code,
  attributes = excluded.attributes, metadata = excluded.metadata,
  stock_qty = excluded.stock_qty, is_active = true, updated_at = now();

NOTIFY pgrst, 'reload schema';
