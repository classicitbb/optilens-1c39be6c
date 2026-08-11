-- Stock order builder, step 1: price the real Innova stock-lens catalog on
-- the existing per-customer pricelist mechanism, and add the outbox that
-- optilens-local's worker will poll to actually release .stockhashref files.
--
-- DRAFTED FOR REVIEW — not run. You run all migrations yourself.
--
-- IMPORTANT — this file has NOT been executed against the live database.
-- I don't have a working connection to the real Supabase project this
-- session, so every join below is written from reading migration files and
-- TypeScript hooks, not from querying live data. Sanity-check column names
-- and the two flagged assumptions below before running this.
--
-- Context (see docs/PRICING_WHICH_TABLE.md — read that before touching any
-- pricing table in this repo, it exists because guessing wrong here already
-- cost a full session once): the only real, live, per-customer pricing
-- mechanism is customers.assigned_pricelist_id -> pricelist_versions ->
-- pricelist_catalog_rows. There is a second, unrelated "stock lens" system
-- (innovations_store_lenses / innovations_store_lens_power_rows, synced
-- from Innova's Lens Local export as of 20260804023317) that has the real
-- orderable SKU data (right_opc/left_opc per power row) but NO per-customer
-- pricing at all. Per Russell's decision (2026-08-10): extend the existing
-- pricing mechanism to cover the new catalog, rather than building a third,
-- parallel pricing system.
--
-- ⚠ FLAGGED ASSUMPTION 1 — price granularity: stock lens price is set PER
-- FAMILY (one price for the whole innovations_store_lenses row, applied to
-- every power/side under it), not per individual power row. This matches
-- how the existing "Stock Lens Prices" admin page groups by MF Type as a
-- manually-maintained list, but nobody confirmed it explicitly. If wrong,
-- the fix is narrow: row_key below would key off power_row id instead of
-- lens family id, everything else (table shapes, RPC signatures) holds.
--
-- ⚠ FLAGGED ASSUMPTION 2 — item_source mapping: FLENS = lens_state
-- 'finished', SLENS = lens_state 'semi_finished'. This one Russell confirmed
-- directly (2026-08-10 message), included here just so the mapping lives in
-- one place (build_stock_submission_items below) instead of being guessed
-- again somewhere else later.

-- ── 0. Read access — innovations_store_lenses / power_rows are currently
-- admin-only (20260804023317). The order builder needs any staff with the
-- existing edit role to browse the catalog, same bar as pricelist_catalog_rows
-- itself. Adding a policy, not replacing the admin one — admins keep access
-- too, RLS policies OR together.
DROP POLICY IF EXISTS "Staff with edit role can read Innovations store lenses" ON public.innovations_store_lenses;
CREATE POLICY "Staff with edit role can read Innovations store lenses"
  ON public.innovations_store_lenses FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));
DROP POLICY IF EXISTS "Staff with edit role can read Innovations store lens powers" ON public.innovations_store_lens_power_rows;
CREATE POLICY "Staff with edit role can read Innovations store lens powers"
  ON public.innovations_store_lens_power_rows FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

-- ── 1. Pricing: extend pricelist_catalog_rows with a new row_type ─────────
-- No schema change needed — row_type has no CHECK constraint (verified
-- against 20260220114207, the original CREATE TABLE: it's a bare `text`
-- column, comment-documented as 'lens'|'addon'|'supply' but not enforced).
-- New rows use row_type = 'stock_variant', same catalog_type = 'stock'
-- bucket the existing WSPL "Stock Lens Prices" page already writes to, so
-- both the legacy lenses-table stock rows and the new Innova-sourced rows
-- live side by side in the same pricelist section, priced through the same
-- mechanism, no new per-customer pricing table.
--
-- row_key   = 'stock_variant::' || innovations_lens_id (text, human-scannable,
--             unique per (pricelist_version_id, catalog_type) — matches the
--             existing UNIQUE constraint)
-- item_id   = innovations_store_lenses.id (uuid) — the family, not one
--             specific power row (see Assumption 1)
-- No new table for this — staff price these rows through a small addition
-- to the existing Stock Lens Prices editor (separate front-end task, not
-- this migration). This migration only makes the column usable; it does
-- not backfill any rows.

-- ── 2. Eligibility: which accounts can buy stock lenses ────────────────────
-- Mirrors the existing availability rule verbatim (docs/rx-order-innovations-
-- catalogue.md §2.2, already implemented in useOrderableCatalog.ts's
-- usePricelistScope): "on the assigned pricelist_versions document" = eligible,
-- absent = not shown, no separate flag to maintain. An account is stock-lens
-- eligible exactly when their assigned pricelist_versions document has at
-- least one priced stock_variant row.
CREATE OR REPLACE VIEW public.stock_lens_eligible_accounts
WITH (security_invoker = true) AS
SELECT DISTINCT c.id AS account_id, c.assigned_pricelist_id AS pricelist_version_id
FROM public.customers c
JOIN public.pricelist_catalog_rows r
  ON r.pricelist_version_id = c.assigned_pricelist_id
WHERE r.catalog_type = 'stock'
  AND r.row_type = 'stock_variant'
  AND r.bbd_price IS NOT NULL;

GRANT SELECT ON public.stock_lens_eligible_accounts TO authenticated;

-- ── 3. Outbox table ──────────────────────────────────────────────────────
-- Same shape/spirit as rx_order_submissions (20260801131000) but for
-- manually-built stock orders: no order/quote trigger enqueues these, staff
-- build the order directly in the Stock Order Builder and stage it.
CREATE TABLE IF NOT EXISTS public.stock_order_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      integer NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  po_number       text,
  order_reference text,
  status          text NOT NULL DEFAULT 'staged'
                  CHECK (status IN ('staged','approved','claimed','released','failed','cancelled')),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,   -- frozen snapshot: customer + priced items, see stage_stock_order_submission
  transport       text,                                  -- always 'file_drop' — no InnovaAPI endpoint for stock orders (docs/innova-stockhashref-format.md)
  filename        text,                                  -- the .stockhashref filename once released
  attempts        integer NOT NULL DEFAULT 0,
  last_error      text,
  created_by      uuid,
  approved_by     uuid,
  approved_at     timestamptz,
  claimed_at      timestamptz,
  released_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_order_submissions_status_idx
  ON public.stock_order_submissions (status, created_at);

ALTER TABLE public.stock_order_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Role users can select stock_order_submissions" ON public.stock_order_submissions;
CREATE POLICY "Role users can select stock_order_submissions"
  ON public.stock_order_submissions FOR SELECT
  USING (public.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete stock_order_submissions" ON public.stock_order_submissions;
CREATE POLICY "Admins can delete stock_order_submissions"
  ON public.stock_order_submissions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_stock_order_submissions_updated_at ON public.stock_order_submissions;
CREATE TRIGGER update_stock_order_submissions_updated_at
  BEFORE UPDATE ON public.stock_order_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 4. Shared pricing helper — used by both stage and release ──────────────
-- Prices are ALWAYS resolved here from the account's pricelist, never
-- trusted from client input. p_items only carries what's being ordered
-- (which power row, which side, how much, the customer ref), not a price.
--
-- p_items shape: jsonb array of
--   { "power_row_id": uuid, "side": "right"|"left"|"either", "quantity": int, "customer_ref": text }
-- power_row_id references innovations_store_lens_power_rows.id.
CREATE OR REPLACE FUNCTION public._price_stock_order_items(p_pricelist_version_id integer, p_items jsonb)
RETURNS TABLE (priced_items jsonb, order_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_item jsonb;
  v_power record;
  v_family record;
  v_unit_price numeric;
  v_side text;
  v_sku text;
  v_priced_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'A stock order needs at least one item.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT pr.* INTO v_power
    FROM public.innovations_store_lens_power_rows pr
    WHERE pr.id = (v_item ->> 'power_row_id')::uuid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Unknown power row: %', v_item ->> 'power_row_id';
    END IF;

    SELECT sl.* INTO v_family
    FROM public.innovations_store_lenses sl
    WHERE sl.innovations_lens_id = v_power.innovations_lens_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Power row % has no parent lens family.', v_power.id;
    END IF;

    SELECT r.bbd_price INTO v_unit_price
    FROM public.pricelist_catalog_rows r
    WHERE r.pricelist_version_id = p_pricelist_version_id
      AND r.catalog_type = 'stock'
      AND r.row_type = 'stock_variant'
      AND r.item_id = v_family.id
      AND r.bbd_price IS NOT NULL;

    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION '"%" is not priced on this account''s pricelist.', v_family.name;
    END IF;

    v_side := COALESCE(v_item ->> 'side', 'either');
    v_sku := CASE WHEN v_side = 'left' THEN v_power.left_opc ELSE v_power.right_opc END;
    IF v_sku IS NULL THEN
      RAISE EXCEPTION 'No Innova code for % / % side.', v_family.name, v_side;
    END IF;

    v_priced_items := v_priced_items || jsonb_build_object(
      'power_row_id', v_power.id,
      'side', v_side,
      'sku', v_sku,
      'source', CASE WHEN v_family.lens_state = 'finished' THEN 'FLENS' ELSE 'SLENS' END,
      'description', v_family.name || ' ' ||
        COALESCE(v_power.sphere::text, v_power.base::text, '') || '/' ||
        COALESCE(v_power.cylinder::text, v_power.add::text, '') || '/' || v_side,
      'quantity', COALESCE((v_item ->> 'quantity')::int, 1),
      'comment', COALESCE(v_item ->> 'customer_ref', ''),
      'part_rx', 'Y',
      'unit_price', v_unit_price
    );
    v_total := v_total + v_unit_price * COALESCE((v_item ->> 'quantity')::int, 1);
  END LOOP;

  RETURN QUERY SELECT v_priced_items, v_total;
END;
$function$;

REVOKE ALL ON FUNCTION public._price_stock_order_items(integer, jsonb) FROM PUBLIC;

-- ── 5. Stage: build + price an order, write the outbox row ────────────────
-- Keeps the raw p_items (as 'raw_items') alongside the resolved/priced
-- items, so release_stock_order_submission can re-run the exact same
-- resolution against current prices rather than trusting the stage-time
-- snapshot.
CREATE OR REPLACE FUNCTION public.stage_stock_order_submission(
  p_account_id integer,
  p_po_number text,
  p_order_reference text,
  p_instructions text,
  p_items jsonb
)
RETURNS TABLE (submission_id uuid, order_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_pricelist_version_id integer;
  v_account record;
  v_priced jsonb;
  v_total numeric;
  v_submission_id uuid;
BEGIN
  IF NOT public.has_any_role(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to build stock orders.';
  END IF;

  -- NOT verified against the live schema — customers.name/account_number/
  -- innovations_customer_id are confirmed present (used as-is in the
  -- existing build_rx_submission_payload, 20260801131000), assigned_pricelist_id
  -- confirmed via docs/PRICING_WHICH_TABLE.md. These fields are embedded here
  -- (not just account_id) because optilens-local's worker has no read access
  -- to this database at all — the payload snapshot has to be self-contained,
  -- same reasoning as the Rx outbox.
  SELECT id, name, account_number, innovations_customer_id, assigned_pricelist_id
  INTO v_account
  FROM public.customers WHERE id = p_account_id;

  IF v_account.assigned_pricelist_id IS NULL THEN
    RAISE EXCEPTION 'This account has no assigned pricelist.';
  END IF;
  v_pricelist_version_id := v_account.assigned_pricelist_id;

  SELECT priced_items, order_total INTO v_priced, v_total
  FROM public._price_stock_order_items(v_pricelist_version_id, p_items);

  INSERT INTO public.stock_order_submissions (account_id, po_number, order_reference, status, payload, created_by)
  VALUES (
    p_account_id, p_po_number, p_order_reference, 'staged',
    jsonb_build_object(
      'account', jsonb_build_object(
        'id', v_account.id, 'name', v_account.name,
        'account_number', v_account.account_number,
        'innovations_customer_id', v_account.innovations_customer_id
      ),
      'po_number', p_po_number,
      'order_reference', p_order_reference,
      'instructions', p_instructions,
      'raw_items', p_items,
      'items', v_priced,
      'order_total', v_total,
      'built_at', now()
    ),
    auth.uid()
  )
  RETURNING id INTO v_submission_id;

  RETURN QUERY SELECT v_submission_id, v_total;
END;
$function$;

REVOKE ALL ON FUNCTION public.stage_stock_order_submission(integer, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stage_stock_order_submission(integer, text, text, text, jsonb) TO authenticated;

-- ── 6. Release gate RPCs (mirrors approve_rx_submission / cancel_rx_submission) ──
-- Re-prices from raw_items against the account's CURRENT pricelist before
-- flipping to 'approved', so a price change between staging and release
-- can't silently ship the old number. If pricing now fails (item no longer
-- priced, pricelist reassigned, etc.) the release is rejected with the
-- reason instead of going out stale.
CREATE OR REPLACE FUNCTION public.release_stock_order_submission(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_account_id integer;
  v_raw_items jsonb;
  v_pricelist_version_id integer;
  v_priced jsonb;
  v_total numeric;
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can release stock orders.';
  END IF;

  SELECT account_id, payload -> 'raw_items'
  INTO v_account_id, v_raw_items
  FROM public.stock_order_submissions
  WHERE id = p_id AND status IN ('staged','failed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in a releasable state.';
  END IF;

  SELECT assigned_pricelist_id INTO v_pricelist_version_id
  FROM public.customers WHERE id = v_account_id;

  IF v_pricelist_version_id IS NULL THEN
    RAISE EXCEPTION 'This account no longer has an assigned pricelist.';
  END IF;

  SELECT priced_items, order_total INTO v_priced, v_total
  FROM public._price_stock_order_items(v_pricelist_version_id, v_raw_items);

  UPDATE public.stock_order_submissions
  SET status = 'approved', approved_by = auth.uid(), approved_at = now(), last_error = NULL,
      payload = payload || jsonb_build_object('items', v_priced, 'order_total', v_total, 'repriced_at', now())
  WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_stock_order_submission(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.has_edit_role(auth.uid()) THEN
    RAISE EXCEPTION 'Only editors can cancel stock orders.';
  END IF;
  UPDATE public.stock_order_submissions
  SET status = 'cancelled'
  WHERE id = p_id AND status IN ('staged','approved','failed');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found or not in a cancellable state.';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.release_stock_order_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stock_order_submission(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_stock_order_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_stock_order_submission(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
