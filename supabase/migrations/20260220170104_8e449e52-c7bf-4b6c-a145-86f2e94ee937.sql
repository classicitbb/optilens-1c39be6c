-- Seed demo matrix_allocations for version 3
INSERT INTO public.matrix_allocations (pricelist_version_id, category, material_index, treatment_type, lens_id, allocated_price_bbd, is_active)
VALUES
  (3, 'Progressive - Best',    '1.50', 'clear', '0dc7be08-a2cb-435b-a71c-7335d968886f', 233.10, true),
  (3, 'Progressive - Better',  '1.50', 'clear', '10a338fe-ec3a-4406-9ccb-3528898065d6', 138.60, true),
  (3, 'Progressive - Good',    '1.50', 'clear', 'b7d70bc0-c361-49c4-b5c6-53a67f08f681', 161.70, true),
  (3, 'Single Vision - Best',  '1.50', 'clear', 'fbae9835-e3b5-4a8b-bf35-53812a6ed87c',  16.00, true),
  (3, 'Single Vision - Better','1.50', 'clear', '10a338fe-ec3a-4406-9ccb-3528898065d6',  95.00, true)
ON CONFLICT (pricelist_version_id, category, material_index, treatment_type) DO NOTHING;

-- Seed lens catalog rows for list format
INSERT INTO public.pricelist_catalog_rows (pricelist_version_id, catalog_type, row_key, row_type, section, display_description, bbd_price, sort_order)
VALUES
  (3, 'rx', 'matrix::clear::Progressive - Best::1.50',     'lens', 'Progressive - Best',   '1.50 LBUC PROG Essential Steady SRCoated', 233.10, 10),
  (3, 'rx', 'matrix::clear::Progressive - Better::1.50',   'lens', 'Progressive - Better', '1.50 LBUC PROG Classic PAL SRCoated',      138.60, 20),
  (3, 'rx', 'matrix::clear::Progressive - Good::1.50',     'lens', 'Progressive - Good',   '1.50 LBUC PROG Endless Plus SRCoated',     161.70, 30),
  (3, 'rx', 'matrix::clear::Single Vision - Best::1.50',   'lens', 'Single Vision',        '1.50 FIN SV Regular Sync HMC',              16.00, 40),
  (3, 'rx', 'matrix::clear::Single Vision - Better::1.50', 'lens', 'Single Vision',        '1.50 LBUC PROG Classic PAL SRCoated',       95.00, 50)
ON CONFLICT (row_key) DO NOTHING;

-- Seed add-on catalog rows
INSERT INTO public.pricelist_catalog_rows (pricelist_version_id, catalog_type, row_key, row_type, section, display_description, bbd_price, item_id, sort_order)
VALUES
  (3, 'rx', 'addon::9707821a-67d5-4555-8927-911f0822d87d', 'addon', 'Treatments & Add-ons', 'Super AR',         75.00,  '9707821a-67d5-4555-8927-911f0822d87d', 100),
  (3, 'rx', 'addon::b64bdf0a-89b1-4201-a3bc-df3acb32ce30', 'addon', 'Treatments & Add-ons', 'Classic AR',       70.00,  'b64bdf0a-89b1-4201-a3bc-df3acb32ce30', 110),
  (3, 'rx', 'addon::bbb00994-533d-46bb-8a18-8b19586bb4de', 'addon', 'Treatments & Add-ons', 'Blue Defense AR+', 90.00,  'bbb00994-533d-46bb-8a18-8b19586bb4de', 120),
  (3, 'rx', 'addon::3b62dd0d-9535-4068-b7d2-b9928a5112b7', 'addon', 'Treatments & Add-ons', 'Supreme AR',      135.00,  '3b62dd0d-9535-4068-b7d2-b9928a5112b7', 130),
  (3, 'rx', 'addon::8b951384-c2ef-4d88-b2c7-21e0096645ca', 'addon', 'Treatments & Add-ons', 'Sync AR',          80.00,  '8b951384-c2ef-4d88-b2c7-21e0096645ca', 140),
  (3, 'rx', 'addon::63310bfd-912f-43a4-bdb8-884b52685ef5', 'addon', 'Treatments & Add-ons', 'Mirror Coating',  100.00,  '63310bfd-912f-43a4-bdb8-884b52685ef5', 150)
ON CONFLICT (row_key) DO NOTHING;