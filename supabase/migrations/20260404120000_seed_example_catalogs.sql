-- Seed example catalog templates that demonstrate the full three-stage pipeline:
-- Cover page → TOC → Info/pricing pages, with canvas layout objects.
-- Uses ON CONFLICT DO NOTHING so this is safe to re-run.

DO $$
DECLARE
  full_template_id  bigint;
  rx_template_id    bigint;
  full_page1_id     text := gen_random_uuid()::text;
  full_page2_id     text := gen_random_uuid()::text;
  full_page3_id     text := gen_random_uuid()::text;
  full_page4_id     text := gen_random_uuid()::text;
  rx_page1_id       text := gen_random_uuid()::text;
  rx_page2_id       text := gen_random_uuid()::text;
  full_sec_rx_id    bigint;
  full_sec_stock_id bigint;
  full_sec_supply_id bigint;
  rx_sec_rx_id      bigint;
BEGIN

  -- ────────────────────────────────────────────────────────────────────────────
  -- Template 1: Full Product Catalog (Cover + TOC + RX + Stock + Supplies)
  -- ────────────────────────────────────────────────────────────────────────────
  INSERT INTO catalog_templates (name, status, cover_title, cover_subtitle, gradient_color_start, gradient_color_end, created_at, updated_at)
  VALUES (
    'Full Product Catalog — Example',
    'canvas_ready',
    'Product Catalog',
    '{"subtitle":"Complete Lens & Supplies Price List","body":"","footer":"","gradientAngle":135,"gradientEnabled":true,"invertText":false,"logoUrl":"","backgroundUrl":""}',
    '#1e3a8a',
    '#0f172a',
    now(),
    now()
  )
  RETURNING id INTO full_template_id;

  -- Sections for full catalog
  INSERT INTO catalog_sections (catalog_template_id, section_type, sort_order, is_included, pricelist_version_id, format_choice, article_id, custom_title)
  VALUES (full_template_id, 'rx_prices',       1, true, null, 'list',   null, 'RX Lens Prices')
  RETURNING id INTO full_sec_rx_id;

  INSERT INTO catalog_sections (catalog_template_id, section_type, sort_order, is_included, pricelist_version_id, format_choice, article_id, custom_title)
  VALUES (full_template_id, 'stock_prices',    2, true, null, 'list',   null, 'Stock Lens Prices')
  RETURNING id INTO full_sec_stock_id;

  INSERT INTO catalog_sections (catalog_template_id, section_type, sort_order, is_included, pricelist_version_id, format_choice, article_id, custom_title)
  VALUES (full_template_id, 'supplies_prices', 3, true, null, 'list',   null, 'Supplies & Consumables')
  RETURNING id INTO full_sec_supply_id;

  -- Pages for full catalog (A4 canvas: 595 × 842 units)
  -- Page 1: Cover
  INSERT INTO catalog_pages (id, catalog_template_id, page_number, page_settings, created_at, updated_at)
  VALUES (full_page1_id, full_template_id, 1, '{}', now(), now());

  -- Page 2: Table of Contents
  INSERT INTO catalog_pages (id, catalog_template_id, page_number, page_settings, created_at, updated_at)
  VALUES (full_page2_id, full_template_id, 2, '{}', now(), now());

  -- Page 3: RX + Stock Prices
  INSERT INTO catalog_pages (id, catalog_template_id, page_number, page_settings, created_at, updated_at)
  VALUES (full_page3_id, full_template_id, 3, '{}', now(), now());

  -- Page 4: Supplies Prices
  INSERT INTO catalog_pages (id, catalog_template_id, page_number, page_settings, created_at, updated_at)
  VALUES (full_page4_id, full_template_id, 4, '{}', now(), now());

  -- Canvas objects: Page 1 — Cover
  INSERT INTO catalog_page_objects (id, page_id, object_type, x, y, width, height, rotation, z_index, content, style, is_locked, is_visible, label, created_at, updated_at)
  VALUES
    -- Full-bleed background gradient rectangle
    (gen_random_uuid()::text, full_page1_id, 'shape_rect',   0,   0, 595, 842, 0, 1,
     '{}',
     '{"backgroundColor":"#1e3a8a","borderRadius":0}',
     true, true, 'Cover background', now(), now()),
    -- Decorative accent bar
    (gen_random_uuid()::text, full_page1_id, 'shape_rect',   0, 540, 595,  60, 0, 2,
     '{}',
     '{"backgroundColor":"#3b82f6","borderRadius":0,"opacity":0.6}',
     true, true, 'Accent bar', now(), now()),
    -- Catalog title
    (gen_random_uuid()::text, full_page1_id, 'text',        60, 300, 475,  70, 0, 3,
     '{"text":"Product Catalog"}',
     '{"fontSize":48,"fontFamily":"DM Sans","color":"#ffffff","fontWeight":"bold","textAlign":"center","lineHeight":1.1}',
     false, true, 'Cover title', now(), now()),
    -- Subtitle
    (gen_random_uuid()::text, full_page1_id, 'text',        60, 380, 475,  40, 0, 4,
     '{"text":"Complete Lens & Supplies Price List"}',
     '{"fontSize":18,"fontFamily":"DM Sans","color":"rgba(255,255,255,0.8)","textAlign":"center","lineHeight":1.3}',
     false, true, 'Cover subtitle', now(), now()),
    -- Company name placeholder
    (gen_random_uuid()::text, full_page1_id, 'text',        60, 760, 475,  30, 0, 5,
     '{"text":"Your Company Name  ·  yourcompany.com"}',
     '{"fontSize":11,"fontFamily":"DM Sans","color":"rgba(255,255,255,0.65)","textAlign":"center"}',
     false, true, 'Company footer', now(), now());

  -- Canvas objects: Page 2 — Table of Contents
  INSERT INTO catalog_page_objects (id, page_id, object_type, x, y, width, height, rotation, z_index, content, style, is_locked, is_visible, label, created_at, updated_at)
  VALUES
    -- Header bar
    (gen_random_uuid()::text, full_page2_id, 'shape_rect', 0, 0, 595, 56, 0, 1,
     '{}',
     '{"backgroundColor":"#1e3a8a","borderRadius":0}',
     true, true, 'Header bar', now(), now()),
    -- Header title
    (gen_random_uuid()::text, full_page2_id, 'text', 28, 14, 300, 28, 0, 2,
     '{"text":"Table of Contents"}',
     '{"fontSize":20,"fontFamily":"DM Sans","color":"#ffffff","fontWeight":"bold"}',
     false, true, 'TOC heading', now(), now()),
    -- TOC entry: RX Lens Prices
    (gen_random_uuid()::text, full_page2_id, 'text', 40, 100, 480, 28, 0, 3,
     '{"text":"1.  RX Lens Prices ........................................................ 3"}',
     '{"fontSize":13,"fontFamily":"DM Sans","color":"#1e293b","lineHeight":1.5}',
     false, true, 'TOC entry 1', now(), now()),
    -- TOC entry: Stock Lens Prices
    (gen_random_uuid()::text, full_page2_id, 'text', 40, 136, 480, 28, 0, 4,
     '{"text":"2.  Stock Lens Prices ..................................................... 3"}',
     '{"fontSize":13,"fontFamily":"DM Sans","color":"#1e293b","lineHeight":1.5}',
     false, true, 'TOC entry 2', now(), now()),
    -- TOC entry: Supplies
    (gen_random_uuid()::text, full_page2_id, 'text', 40, 172, 480, 28, 0, 5,
     '{"text":"3.  Supplies & Consumables ........................................... 4"}',
     '{"fontSize":13,"fontFamily":"DM Sans","color":"#1e293b","lineHeight":1.5}',
     false, true, 'TOC entry 3', now(), now()),
    -- Divider line
    (gen_random_uuid()::text, full_page2_id, 'shape_line', 40, 90, 515, 1, 0, 6,
     '{}',
     '{"backgroundColor":"#e2e8f0"}',
     false, true, 'TOC divider', now(), now());

  -- Canvas objects: Page 3 — RX + Stock pricing blocks
  INSERT INTO catalog_page_objects (id, page_id, object_type, x, y, width, height, rotation, z_index, content, style, is_locked, is_visible, label, created_at, updated_at)
  VALUES
    -- Header bar
    (gen_random_uuid()::text, full_page3_id, 'shape_rect', 0, 0, 595, 56, 0, 1,
     '{}',
     '{"backgroundColor":"#1e3a8a","borderRadius":0}',
     true, true, 'Header bar', now(), now()),
    -- Page title
    (gen_random_uuid()::text, full_page3_id, 'text', 28, 14, 300, 28, 0, 2,
     '{"text":"Lens Price List"}',
     '{"fontSize":20,"fontFamily":"DM Sans","color":"#ffffff","fontWeight":"bold"}',
     false, true, 'Page title', now(), now()),
    -- RX Prices block
    (gen_random_uuid()::text, full_page3_id, 'pricing_block', 28, 72, 539, 320, 0, 3,
     jsonb_build_object(
       'source_section_id', full_sec_rx_id,
       'section_type', 'rx_prices',
       'pricelist_version_id', null,
       'format', 'list',
       'custom_title', 'RX Lens Prices'
     ),
     '{}',
     false, true, 'RX Prices', now(), now()),
    -- Stock Prices block
    (gen_random_uuid()::text, full_page3_id, 'pricing_block', 28, 408, 539, 280, 0, 4,
     jsonb_build_object(
       'source_section_id', full_sec_stock_id,
       'section_type', 'stock_prices',
       'pricelist_version_id', null,
       'format', 'list',
       'custom_title', 'Stock Lens Prices'
     ),
     '{}',
     false, true, 'Stock Prices', now(), now());

  -- Canvas objects: Page 4 — Supplies pricing block
  INSERT INTO catalog_page_objects (id, page_id, object_type, x, y, width, height, rotation, z_index, content, style, is_locked, is_visible, label, created_at, updated_at)
  VALUES
    -- Header bar
    (gen_random_uuid()::text, full_page4_id, 'shape_rect', 0, 0, 595, 56, 0, 1,
     '{}',
     '{"backgroundColor":"#1e3a8a","borderRadius":0}',
     true, true, 'Header bar', now(), now()),
    -- Page title
    (gen_random_uuid()::text, full_page4_id, 'text', 28, 14, 300, 28, 0, 2,
     '{"text":"Supplies & Consumables"}',
     '{"fontSize":20,"fontFamily":"DM Sans","color":"#ffffff","fontWeight":"bold"}',
     false, true, 'Page title', now(), now()),
    -- Supplies Prices block
    (gen_random_uuid()::text, full_page4_id, 'pricing_block', 28, 72, 539, 400, 0, 3,
     jsonb_build_object(
       'source_section_id', full_sec_supply_id,
       'section_type', 'supplies_prices',
       'pricelist_version_id', null,
       'format', 'list',
       'custom_title', 'Supplies & Consumables'
     ),
     '{}',
     false, true, 'Supplies Prices', now(), now());


  -- ────────────────────────────────────────────────────────────────────────────
  -- Template 2: RX Price List (Cover + RX pricing page)
  -- ────────────────────────────────────────────────────────────────────────────
  INSERT INTO catalog_templates (name, status, cover_title, cover_subtitle, gradient_color_start, gradient_color_end, created_at, updated_at)
  VALUES (
    'RX Price List — Example',
    'canvas_ready',
    'RX Lens Price List',
    '{"subtitle":"Prescription Lens Pricing","body":"","footer":"","gradientAngle":160,"gradientEnabled":true,"invertText":false,"logoUrl":"","backgroundUrl":""}',
    '#064e3b',
    '#022c22',
    now(),
    now()
  )
  RETURNING id INTO rx_template_id;

  -- Section for RX catalog
  INSERT INTO catalog_sections (catalog_template_id, section_type, sort_order, is_included, pricelist_version_id, format_choice, article_id, custom_title)
  VALUES (rx_template_id, 'rx_prices', 1, true, null, 'matrix', null, 'RX Lens Prices')
  RETURNING id INTO rx_sec_rx_id;

  -- Pages for RX catalog
  INSERT INTO catalog_pages (id, catalog_template_id, page_number, page_settings, created_at, updated_at)
  VALUES (rx_page1_id, rx_template_id, 1, '{}', now(), now());

  INSERT INTO catalog_pages (id, catalog_template_id, page_number, page_settings, created_at, updated_at)
  VALUES (rx_page2_id, rx_template_id, 2, '{}', now(), now());

  -- Canvas objects: Page 1 — Cover (green theme)
  INSERT INTO catalog_page_objects (id, page_id, object_type, x, y, width, height, rotation, z_index, content, style, is_locked, is_visible, label, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, rx_page1_id, 'shape_rect', 0, 0, 595, 842, 0, 1,
     '{}',
     '{"backgroundColor":"#064e3b","borderRadius":0}',
     true, true, 'Cover background', now(), now()),
    (gen_random_uuid()::text, rx_page1_id, 'shape_rect', 0, 600, 595, 4, 0, 2,
     '{}',
     '{"backgroundColor":"#10b981","borderRadius":0}',
     true, true, 'Accent line', now(), now()),
    (gen_random_uuid()::text, rx_page1_id, 'text', 60, 280, 475, 80, 0, 3,
     '{"text":"RX Lens Price List"}',
     '{"fontSize":44,"fontFamily":"DM Sans","color":"#ffffff","fontWeight":"bold","textAlign":"center","lineHeight":1.1}',
     false, true, 'Cover title', now(), now()),
    (gen_random_uuid()::text, rx_page1_id, 'text', 60, 370, 475, 36, 0, 4,
     '{"text":"Prescription Lens Pricing"}',
     '{"fontSize":16,"fontFamily":"DM Sans","color":"rgba(255,255,255,0.75)","textAlign":"center"}',
     false, true, 'Cover subtitle', now(), now());

  -- Canvas objects: Page 2 — RX pricing block (matrix format)
  INSERT INTO catalog_page_objects (id, page_id, object_type, x, y, width, height, rotation, z_index, content, style, is_locked, is_visible, label, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, rx_page2_id, 'shape_rect', 0, 0, 595, 56, 0, 1,
     '{}',
     '{"backgroundColor":"#064e3b","borderRadius":0}',
     true, true, 'Header bar', now(), now()),
    (gen_random_uuid()::text, rx_page2_id, 'text', 28, 14, 300, 28, 0, 2,
     '{"text":"RX Lens Prices"}',
     '{"fontSize":20,"fontFamily":"DM Sans","color":"#ffffff","fontWeight":"bold"}',
     false, true, 'Page title', now(), now()),
    (gen_random_uuid()::text, rx_page2_id, 'pricing_block', 28, 72, 539, 500, 0, 3,
     jsonb_build_object(
       'source_section_id', rx_sec_rx_id,
       'section_type', 'rx_prices',
       'pricelist_version_id', null,
       'format', 'matrix',
       'custom_title', 'RX Lens Prices'
     ),
     '{}',
     false, true, 'RX Prices Matrix', now(), now());

END $$;
