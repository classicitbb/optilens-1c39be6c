-- Store checkout -> Innova stock order bridge.
--
-- DRAFTED FOR REVIEW — not run. You run all migrations yourself.
--
-- Until now the only source of stock_order_submissions rows was the staff
-- Stock Order Builder (stage_stock_order_submission). A customer checking out
-- on the website produced orders/order_items and nothing else, so a store
-- order for an Innova-SKU item never reached the lab: optilens-local's
-- docs/innova-stockhashref-format.md still records this as the open end of the
-- pipeline — "No source of stock/SKU orders is wired up yet".
--
-- This closes it. Everything downstream already exists and is untouched:
--   this trigger -> stock_order_submissions(status 'approved',
--                   dispatch_provider 'innovations')
--   -> innovations-sync/_stock_submissions/next (claim)
--   -> optilens-local lib/stock-order-submitter.js (buildPayload)
--   -> lib/stock-order-generator.js generate() + release()
--   -> \\INNOVA-SVR\Innovations\Incoming  (folder is operator-settable in the
--      OptiLens Local credentials vault; innovationsIncomingFolderFromVault)
--
-- Enqueue point is PAYMENT CONFIRMATION, matching the Rx outbox's own gate in
-- 20260812060000: status 'confirmed', or 'pending' for on_account (a verified
-- credit line — those orders never reach 'confirmed' by design).
--
-- Which lines go to Innova: only order_items carrying a website variant whose
-- Innova code is a numeric SKU. That is exactly what Innova can price and
-- fulfil. Non-Innova supplies (alphanumeric or absent SKU) are fulfilled from
-- Classic Visions own stock and are deliberately left out of the file —
-- sending them would produce a line Innova cannot resolve.
--
-- Prices: .stockhashref carries no price fields. Innova prices the order on
-- receipt from sku + cust_num against that account's contract. The prices
-- resolved here (via the existing _price_stock_order_items) are OUR prices and
-- are recorded on the payload for reconciliation only.

-- ── 1. Link a submission back to the store order that produced it ──────────
ALTER TABLE public.stock_order_submissions
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

-- One submission per store order. The trigger fires on a status change and on
-- each inserted item row; this index is what makes it idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS stock_order_submissions_order_id_key
  ON public.stock_order_submissions (order_id)
  WHERE order_id IS NOT NULL;

-- ── 2. The bridge ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_stock_submission_for_order(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_order record;
  v_account record;
  v_items jsonb;
  v_priced jsonb;
  v_total numeric;
  v_reference text;
  v_submission_id uuid;
BEGIN
  SELECT id, user_id, status, checkout_method
    INTO v_order
  FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Payment-confirmation gate (see header).
  IF NOT (v_order.status = 'confirmed'
          OR (v_order.status = 'pending' AND v_order.checkout_method = 'on_account')) THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.stock_order_submissions WHERE order_id = p_order_id) THEN
    RETURN NULL;
  END IF;

  -- Which Classic Visions account is this login ordering for. Without a
  -- membership there is no cust_num to put in the file, so there is nothing to
  -- send — the order stays a website-only order.
  SELECT c.id, c.name, c.account_number, c.innovations_customer_id, c.assigned_pricelist_id
    INTO v_account
  FROM public.portal_account_memberships m
  JOIN public.customers c ON c.id = m.customer_id
  WHERE m.user_id = v_order.user_id AND m.status = 'active'
  ORDER BY m.is_default DESC, m.created_at ASC
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  v_reference := 'Web order ' || LEFT(p_order_id::text, 8);

  -- Only Innova-SKU lines. order_items.product_id is the legacy integer id, so
  -- the website product uuid the pricer needs is recovered from the variant.
  SELECT jsonb_agg(jsonb_build_object(
           'product_type', pv.product_type,
           'product_id',   pv.product_id,
           'variant_id',   pv.id,
           'side',         COALESCE(NULLIF(oi.variant_metadata ->> 'side', ''), 'either'),
           'quantity',     GREATEST(COALESCE(oi.quantity, 1), 1),
           'customer_ref', ''
         ) ORDER BY oi.created_at)
    INTO v_items
  FROM public.order_items oi
  JOIN public.store_product_variants pv ON pv.id = oi.variant_id
  WHERE oi.order_id = p_order_id
    AND COALESCE(
          NULLIF(pv.metadata -> 'opc_by_eye' ->> COALESCE(NULLIF(oi.variant_metadata ->> 'side', ''), 'either'), ''),
          NULLIF(pv.opc_code, ''),
          NULLIF(pv.sku, '')
        ) ~ '^[0-9]{6,20}$';

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN RETURN NULL; END IF;

  IF v_account.assigned_pricelist_id IS NULL THEN
    -- Surfaced as a failed row rather than raised: this runs inside payment
    -- settlement and must never roll back a captured payment.
    INSERT INTO public.stock_order_submissions
      (account_id, order_id, order_reference, status, dispatch_provider,
       payload, last_error, created_by)
    VALUES (
      v_account.id, p_order_id, v_reference, 'failed', 'innovations',
      jsonb_build_object('order_id', p_order_id, 'source', 'store_checkout',
                         'raw_items', v_items, 'built_at', now()),
      'This account has no assigned pricelist, so the web order could not be priced for Innova.',
      v_order.user_id
    )
    RETURNING id INTO v_submission_id;
    RETURN v_submission_id;
  END IF;

  BEGIN
    SELECT priced.priced_items, priced.order_total
      INTO v_priced, v_total
    FROM public._price_stock_order_items(v_account.assigned_pricelist_id, v_items) AS priced;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.stock_order_submissions
      (account_id, order_id, order_reference, status, dispatch_provider,
       payload, last_error, created_by)
    VALUES (
      v_account.id, p_order_id, v_reference, 'failed', 'innovations',
      jsonb_build_object('order_id', p_order_id, 'source', 'store_checkout',
                         'raw_items', v_items, 'built_at', now()),
      SQLERRM, v_order.user_id
    )
    RETURNING id INTO v_submission_id;
    RETURN v_submission_id;
  END;

  -- 'approved' is the state lib/stock-order-submitter.js claims. Payment is
  -- already confirmed at this point, and that is the approval.
  -- customer_po_num is left EMPTY on purpose. Evidence from Innova's own
  -- Incoming share (\\...\innovations\incoming, 2026-09-07): of the five
  -- .stockhashref files ever dropped there, the one Innova accepted and the
  -- one it renamed .bad are byte-identical except for this single field —
  -- accepted "05", rejected "07072025". The accepted rule is unknown (length?
  -- numeric only? must match a PO Innova already knows?), so this path does
  -- not invent one. The web order is identified by order_reference, which
  -- rides in the free-text patient_name field that Innova accepted as
  -- "Harvey Stock Order". Confirm the customer_po_num rule with Russell
  -- before putting anything in it.
  INSERT INTO public.stock_order_submissions
    (account_id, order_id, po_number, order_reference, status, dispatch_provider,
     payload, approved_at, created_by)
  VALUES (
    v_account.id, p_order_id, NULL, v_reference,
    'approved', 'innovations',
    jsonb_build_object(
      'account', jsonb_build_object(
        'id', v_account.id, 'name', v_account.name,
        'account_number', v_account.account_number,
        'innovations_customer_id', v_account.innovations_customer_id
      ),
      'po_number', '',
      'order_reference', v_reference,
      'instructions', '',
      'source', 'store_checkout',
      'order_id', p_order_id,
      'raw_items', v_items,
      'items', v_priced,
      'order_total', v_total,
      'built_at', now()
    ),
    now(), v_order.user_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.enqueue_stock_submission_for_order(uuid) FROM PUBLIC;

-- ── 3. Triggers ───────────────────────────────────────────────────────────
-- Two entry points, for the same reason the Rx outbox has two:
--   * orders: a Scotia settlement or approve_pending_payment flips an existing
--     order to 'confirmed' long after its items were written.
--   * order_items: a card or on-account order is already confirmed/pending the
--     moment place_customer_order writes its items, so the orders trigger has
--     already fired against an empty item set. AFTER ROW triggers run at end
--     of statement, so every item is visible on the first fire.
CREATE OR REPLACE FUNCTION public.enqueue_stock_submissions_for_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.enqueue_stock_submission_for_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_enqueue_stock_submissions ON public.orders;
CREATE TRIGGER orders_enqueue_stock_submissions
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_stock_submissions_for_order();

CREATE OR REPLACE FUNCTION public.enqueue_stock_submission_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    PERFORM public.enqueue_stock_submission_for_order(NEW.order_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS order_items_enqueue_stock_submissions ON public.order_items;
CREATE TRIGGER order_items_enqueue_stock_submissions
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_stock_submission_for_order_item();

NOTIFY pgrst, 'reload schema';
