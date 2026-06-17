
-- ============================================================
-- Hide cost / margin columns from anonymous + customer access
-- by replacing direct table policies with security_invoker views
-- that exclude cost / base_price / internal margin fields.
-- ============================================================

-- ---------- ADDONS ----------
DROP POLICY IF EXISTS "Anon can view website addons" ON public.addons;

CREATE OR REPLACE VIEW public.addons_public
WITH (security_invoker=true) AS
  SELECT id, supplier_id, name, sku, category, description, price,
         is_active, is_auto, auto_rule, show_on_website, sort_order,
         created_at, updated_at
  FROM public.addons
  WHERE show_on_website = true AND is_active = true;

GRANT SELECT ON public.addons_public TO anon, authenticated;

-- ---------- LENSES ----------
DROP POLICY IF EXISTS "Anon can view website lenses" ON public.lenses;

CREATE OR REPLACE VIEW public.lenses_public
WITH (security_invoker=true) AS
  SELECT id, name, sell_price, notes,
         lenstype_id, material_id, mftype_id,
         is_active, show_on_website
  FROM public.lenses
  WHERE show_on_website = true AND is_active = true;

GRANT SELECT ON public.lenses_public TO anon, authenticated;

-- ---------- SUPPLIES ----------
DROP POLICY IF EXISTS "Anon can view website supplies" ON public.supplies;
-- supplies_public already exists with the correct safe columns

-- ---------- STORE_PRODUCT_VARIANTS ----------
DROP POLICY IF EXISTS "Public can read active store variants" ON public.store_product_variants;

CREATE POLICY "Authenticated staff can read store variants"
  ON public.store_product_variants FOR SELECT
  TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE OR REPLACE VIEW public.store_product_variants_public
WITH (security_invoker=true) AS
  SELECT id, product_type, product_id, title, variant_key, sku, opc_code,
         attributes, metadata, price,
         stock_qty, reserved_qty, low_stock_threshold,
         allow_backorder, is_active, sort_order,
         created_at, updated_at
  FROM public.store_product_variants
  WHERE is_active = true;

GRANT SELECT ON public.store_product_variants_public TO anon, authenticated;

-- ---------- PRODUCT_VARIANTS (legacy) ----------
DROP POLICY IF EXISTS "Anyone can view variants for website products" ON public.product_variants;
-- No replacement needed: not read from client code.

-- ---------- QUOTES ----------
DROP POLICY IF EXISTS "Users can read authorized quotes" ON public.quotes;

CREATE POLICY "Staff can read all quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (has_edit_role(auth.uid()));

CREATE OR REPLACE VIEW public.quotes_customer
WITH (security_invoker=true) AS
  SELECT id, quote_number, quote_type, status,
         customer_name, account_id,
         contact_name, contact_email, contact_phone,
         currency, valid_until, lead_time_days,
         notes_customer,
         subtotal_sell, grand_total,
         created_by, created_at, updated_at
  FROM public.quotes
  WHERE created_by = auth.uid()
    AND can_access_customer_portal_feature(auth.uid(), 'quotes');

GRANT SELECT ON public.quotes_customer TO authenticated;

-- ---------- QUOTE_LINES ----------
DROP POLICY IF EXISTS "Customers can view own quote lines" ON public.quote_lines;
-- Staff policy already exists ("Staff can view all quote lines")

CREATE OR REPLACE VIEW public.quote_lines_customer
WITH (security_invoker=true) AS
  SELECT ql.id, ql.quote_id, ql.line_type, ql.product_id,
         ql.sku, ql.item_name, ql.description_override, ql.qty,
         ql.unit_sell_price_bbd,
         ql.group_key, ql.parent_line_id, ql.sort_order,
         ql.line_note, ql.created_at, ql.updated_at
  FROM public.quote_lines ql
  WHERE EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = ql.quote_id
      AND q.created_by = auth.uid()
      AND can_access_customer_portal_feature(auth.uid(), 'quotes')
  );

GRANT SELECT ON public.quote_lines_customer TO authenticated;
