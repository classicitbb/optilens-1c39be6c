-- Canonical stock quotation pricing.  This migration deliberately builds on
-- pricelist_versions/pricelist_catalog_rows; do not use the retired
-- pricelists/pricelist_lines scaffolding for this workflow.

ALTER TABLE public.stock_order_submissions
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS docstudio_document_id uuid REFERENCES public.docstudio_billing_documents(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS stock_order_submissions_quote_id_key
  ON public.stock_order_submissions(quote_id) WHERE quote_id IS NOT NULL;

-- One authoritative, non-zero price resolver.  It intentionally accepts an
-- optional manual price only for editing staff, and records that exception in
-- the draft/quote payload rather than trusting a browser-supplied base price.
CREATE OR REPLACE FUNCTION public.resolve_stock_order_price(
  p_account_id integer,
  p_product_type text,
  p_product_id uuid,
  p_manual_price numeric DEFAULT NULL,
  p_manual_reason text DEFAULT NULL
)
RETURNS TABLE (
  unit_price numeric,
  price_source text,
  source_trail jsonb,
  unit_cost numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_account record;
  v_retail record;
  v_catalog_price numeric;
  v_cost numeric;
  v_price numeric;
  v_source text;
  v_retail_matches integer;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editing staff can resolve stock-order prices.' USING ERRCODE = '42501';
  END IF;
  IF p_product_type NOT IN ('lens', 'supply', 'addon') OR p_product_id IS NULL THEN
    RAISE EXCEPTION 'A valid website product is required.';
  END IF;

  SELECT id, name, assigned_pricelist_id INTO v_account
  FROM public.customers WHERE id = p_account_id;
  IF NOT FOUND OR v_account.assigned_pricelist_id IS NULL THEN
    RAISE EXCEPTION 'The selected account has no assigned pricelist.';
  END IF;

  SELECT count(*) INTO v_retail_matches
  FROM public.customers WHERE lower(btrim(name)) = 'retail';
  IF v_retail_matches <> 1 THEN
    RAISE EXCEPTION 'Stock pricing requires exactly one customer named Retail; found %.', v_retail_matches;
  END IF;
  SELECT id, assigned_pricelist_id INTO v_retail
  FROM public.customers WHERE lower(btrim(name)) = 'retail';
  IF v_retail.assigned_pricelist_id IS NULL THEN
    RAISE EXCEPTION 'The Retail account has no assigned pricelist.';
  END IF;

  IF p_product_type = 'lens' THEN
    SELECT sell_price, base_price INTO v_catalog_price, v_cost FROM public.lenses WHERE id = p_product_id AND show_on_website AND is_active;
  ELSIF p_product_type = 'supply' THEN
    SELECT sell_price, base_price INTO v_catalog_price, v_cost FROM public.supplies WHERE id = p_product_id AND show_on_website AND is_active;
  ELSE
    SELECT sell_price, base_price INTO v_catalog_price, v_cost FROM public.addons WHERE id = p_product_id AND show_on_website AND is_active;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This product is no longer published for sale.';
  END IF;

  SELECT max(r.bbd_price) INTO v_price
  FROM public.pricelist_catalog_rows r
  WHERE r.pricelist_version_id = v_account.assigned_pricelist_id
    AND r.catalog_type = 'stock' AND r.row_type = p_product_type
    AND r.item_id = p_product_id AND r.bbd_price > 0;
  IF v_price > 0 THEN v_source := 'assigned_pricelist'; END IF;

  IF v_price IS NULL OR v_price <= 0 THEN
    SELECT max(r.bbd_price) INTO v_price
    FROM public.pricelist_catalog_rows r
    WHERE r.pricelist_version_id = v_retail.assigned_pricelist_id
      AND r.catalog_type = 'stock' AND r.row_type = p_product_type
      AND r.item_id = p_product_id AND r.bbd_price > 0;
    IF v_price > 0 THEN v_source := 'retail_pricelist'; END IF;
  END IF;
  IF v_price IS NULL OR v_price <= 0 THEN
    v_price := v_catalog_price;
    IF v_price > 0 THEN v_source := 'catalog'; END IF;
  END IF;
  IF v_price IS NULL OR v_price <= 0 THEN
    IF p_manual_price IS NULL OR p_manual_price <= 0 OR nullif(btrim(coalesce(p_manual_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'No non-zero price exists. Enter a manual price and reason, or repair the account, Retail, or catalog price.';
    END IF;
    v_price := p_manual_price;
    v_source := 'manual';
  END IF;

  RETURN QUERY SELECT v_price, v_source,
    jsonb_build_array('assigned_pricelist', 'retail_pricelist', 'catalog', CASE WHEN v_source = 'manual' THEN 'manual' END),
    CASE WHEN public.has_edit_role(auth.uid()) THEN coalesce(v_cost, 0) ELSE NULL END;
END;
$function$;
REVOKE ALL ON FUNCTION public.resolve_stock_order_price(integer, text, uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_stock_order_price(integer, text, uuid, numeric, text) TO authenticated;

-- Catalog selection uses the same resolver, including Retail's full published
-- catalogue access.  Non-Retail customers may browse only assigned-price rows.
DROP FUNCTION IF EXISTS public.get_stock_order_catalog(integer);
CREATE FUNCTION public.get_stock_order_catalog(p_account_id integer)
RETURNS TABLE (product_type text, product_id uuid, name text, category text, sku text, unit_price numeric, has_variants boolean, price_source text, source_trail jsonb, unit_cost numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_is_retail boolean;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN RAISE EXCEPTION 'Not authorized to read the stock-order catalog.'; END IF;
  SELECT lower(btrim(name)) = 'retail' INTO v_is_retail FROM public.customers WHERE id = p_account_id;
  IF v_is_retail IS NULL THEN RAISE EXCEPTION 'The selected account no longer exists.'; END IF;
  RETURN QUERY
  WITH products AS (
    SELECT 'lens'::text type, l.id, l.name, 'Lens'::text category, NULL::text sku FROM public.lenses l WHERE l.show_on_website AND l.is_active
    UNION ALL SELECT 'supply', s.id, s.name, s.category, s.sku FROM public.supplies s WHERE s.show_on_website AND s.is_active
    UNION ALL SELECT 'addon', a.id, a.name, coalesce(a.category, 'Service'), a.sku FROM public.addons a WHERE a.show_on_website AND a.is_active
  ), assigned AS (
    SELECT DISTINCT r.row_type, r.item_id FROM public.pricelist_catalog_rows r JOIN public.customers c ON c.id = p_account_id
    WHERE r.pricelist_version_id = c.assigned_pricelist_id AND r.catalog_type = 'stock' AND r.row_type IN ('lens','supply','addon') AND r.item_id IS NOT NULL
  )
  SELECT p.type, p.id, p.name, p.category, p.sku, resolved.unit_price,
    EXISTS (SELECT 1 FROM public.store_product_variants v WHERE v.product_type = p.type AND v.product_id = p.id AND v.is_active),
    resolved.price_source, resolved.source_trail, resolved.unit_cost
  FROM products p
  JOIN LATERAL public.resolve_stock_order_price(p_account_id, p.type, p.id, NULL, NULL) resolved ON true
  WHERE v_is_retail OR EXISTS (SELECT 1 FROM assigned a WHERE a.row_type = p.type AND a.item_id = p.id);
END;
$function$;
REVOKE ALL ON FUNCTION public.get_stock_order_catalog(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stock_order_catalog(integer) TO authenticated;

-- Quote creation is kept atomic: clients submit only a staged draft id.  The
-- server snapshots priced lines, creates a STOCK quote, and records its linked
-- DocStudio billing document in the same transaction.
CREATE OR REPLACE FUNCTION public.save_stock_order_as_quote(p_submission_id uuid)
RETURNS TABLE (quote_id uuid, quote_number text, docstudio_document_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_submission record; v_quote_id uuid; v_quote_number text; v_doc_id uuid; v_item jsonb; v_resolved record; v_line_total numeric := 0; v_cost_total numeric := 0; v_doc_content jsonb; v_quoted_items jsonb := '[]'::jsonb; v_doc_rows jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN RAISE EXCEPTION 'Only editing staff can save quotations.' USING ERRCODE = '42501'; END IF;
  SELECT s.*, c.name customer_name, c.account_number INTO v_submission FROM public.stock_order_submissions s JOIN public.customers c ON c.id = s.account_id
  WHERE s.id = p_submission_id AND s.status IN ('staged', 'failed') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This draft is not available for quotation.'; END IF;
  IF jsonb_array_length(coalesce(v_submission.payload->'items','[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Add at least one priced item before saving a quotation.'; END IF;
  IF v_submission.quote_id IS NULL THEN
    INSERT INTO public.quotes (quote_type, customer_name, account_id, currency, created_by, quote_number)
    VALUES ('STOCK', v_submission.customer_name, v_submission.account_id, 'BBD', auth.uid(), '') RETURNING id, quote_number INTO v_quote_id, v_quote_number;
  ELSE
    v_quote_id := v_submission.quote_id; SELECT quote_number INTO v_quote_number FROM public.quotes WHERE id = v_quote_id;
    DELETE FROM public.quote_lines WHERE quote_id = v_quote_id;
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_submission.payload->'items') LOOP
    SELECT * INTO v_resolved FROM public.resolve_stock_order_price(
      v_submission.account_id,
      v_item->>'product_type',
      (v_item->>'product_id')::uuid,
      NULLIF(v_item->>'manual_price', '')::numeric,
      v_item->>'manual_reason'
    );
    INSERT INTO public.quote_lines (quote_id, line_type, product_id, sku, item_name, qty, unit_cost_landed_bbd, unit_base_price_bbd, unit_sell_price_bbd, sort_order)
    VALUES (v_quote_id, CASE coalesce(v_item->>'product_type','') WHEN 'lens' THEN 'Lens' WHEN 'supply' THEN 'Supply' ELSE 'AddOn' END,
      (v_item->>'product_id')::uuid, coalesce(v_item->>'sku',''), coalesce(v_item->>'description','Stock item'),
      greatest(coalesce((v_item->>'quantity')::numeric,1),1), coalesce(v_resolved.unit_cost, 0), v_resolved.unit_price, v_resolved.unit_price,
      (SELECT count(*) FROM public.quote_lines WHERE quote_id = v_quote_id));
    v_line_total := v_line_total + (v_resolved.unit_price * greatest(coalesce((v_item->>'quantity')::numeric,1),1));
    v_cost_total := v_cost_total + (coalesce(v_resolved.unit_cost, 0) * greatest(coalesce((v_item->>'quantity')::numeric,1),1));
    v_quoted_items := v_quoted_items || jsonb_build_object(
      'product_type', v_item->>'product_type', 'product_id', v_item->>'product_id', 'sku', v_item->>'sku',
      'description', v_item->>'description', 'quantity', v_item->>'quantity', 'unit_price', v_resolved.unit_price,
      'price_source', v_resolved.price_source
    );
    v_doc_rows := v_doc_rows || jsonb_build_object(
      'id', gen_random_uuid()::text, 'code', coalesce(v_item->>'sku', ''),
      'desc', coalesce(v_item->>'description', 'Stock item'),
      'qty', greatest(coalesce((v_item->>'quantity')::numeric, 1), 1)::text,
      'unit', v_resolved.unit_price::text, 'taxable', false
    );
  END LOOP;
  UPDATE public.quotes SET subtotal_sell = v_line_total, grand_total = v_line_total, total_landed_cost = v_cost_total, gp_amount = v_line_total-v_cost_total,
    gp_percent = CASE WHEN v_line_total > 0 THEN ((v_line_total-v_cost_total)/v_line_total)*100 ELSE 0 END WHERE id = v_quote_id;
  -- These are DocStudio's persisted billing-file fields. Keeping the quote
  -- snapshot in this shape means preview, print and download render the same
  -- numbers staff approved in the authoritative quote.
  v_doc_content := jsonb_build_object(
    'billType', 'quote', 'blNumber', v_quote_number, 'blDate', current_date::text,
    'blDue', '', 'blPO', coalesce(v_submission.po_number, ''),
    'blToName', v_submission.customer_name, 'blToCompany', v_submission.customer_name,
    'blToAddr', '', 'blToAttn', '', 'blCurrency', 'BBD', 'blVatEnabled', false,
    'blVatRate', '0', 'blDiscount', '', 'blShipping', '', 'blRows', v_doc_rows,
    'blNotes', coalesce(v_submission.payload->>'instructions', ''),
    'billPaperSize', 'letter', 'selectedBillingCustomer', jsonb_build_object(
      'id', v_submission.account_id, 'name', v_submission.customer_name,
      'account_number', v_submission.account_number
    ),
    'quoteId', v_quote_id, 'quoteNumber', v_quote_number,
    'sourceSubmissionId', p_submission_id, 'items', v_quoted_items
  );
  INSERT INTO public.docstudio_billing_documents (owner_user_id, document_type, document_name, billing_number, customer_name, customer_account, content, rendered_html, totals, version)
  VALUES (auth.uid(), 'quote', 'Quotation ' || v_quote_number, v_quote_number, v_submission.customer_name, v_submission.account_number, v_doc_content, '', jsonb_build_object('grandTotal', v_line_total), gen_random_uuid()::text)
  RETURNING id INTO v_doc_id;
  UPDATE public.stock_order_submissions SET quote_id = v_quote_id, docstudio_document_id = v_doc_id,
    payload = payload || jsonb_build_object('quote_id', v_quote_id, 'quote_number', v_quote_number, 'docstudio_document_id', v_doc_id) WHERE id = p_submission_id;
  RETURN QUERY SELECT v_quote_id, v_quote_number, v_doc_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.save_stock_order_as_quote(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_stock_order_as_quote(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
