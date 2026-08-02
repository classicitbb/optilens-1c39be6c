-- Rx Order Form build, step 1: bulk-assign pricelist_versions to customers.
--
-- Business rule (operator-confirmed 2026-07-31): every customer defaults to
-- "Classic Visions July 2026 Current Prices"; the one exception is the
-- retailer account (customer #776 "Retail", account number RETAIL), which
-- gets "Retail Price List Barbados" instead. A general per-customer pricing
-- toggle is an explicit future second task — this is just the hardcoded
-- default + one exception for now.
--
-- This is a DATA update, not a schema migration — no DDL here. Filed as a
-- migration only so it's timestamped and reviewable alongside the rest of
-- the Rx Order Form build. Per project convention, the operator runs this
-- themselves after reviewing it — nothing in this session executes it.
--
-- Run the two SELECTs first and eyeball the counts before running the
-- UPDATEs. If either pricelist name below doesn't resolve to exactly one
-- row, STOP — the UPDATE would silently set assigned_pricelist_id to NULL
-- for everyone it touches.

-- ── Step 0: sanity check the two pricelist names resolve uniquely ─────────
select id, name, base_currency, created_at
from public.pricelist_versions
where name in ('Classic Visions July 2026 Current Prices', 'Retail Price List Barbados');
-- Expect exactly 2 rows. If you get 0, 1, or >2, stop and check for a rename
-- or a duplicate before proceeding.

-- ── Step 0b: see what you're about to change ───────────────────────────────
select
  c.id,
  c.name,
  c.account_number,
  c.assigned_pricelist_id as current_pricelist_id,
  pv.name as current_pricelist_name
from public.customers c
left join public.pricelist_versions pv on pv.id = c.assigned_pricelist_id
order by c.id;

-- ── Step 1: default every customer EXCEPT the retailer account ─────────────
-- A scalar subquery with no matching row returns NULL, which would silently
-- erase every customer's assignment. Enforce the review instruction in SQL so
-- a renamed or duplicated version aborts before any customer row is touched.
DO $$
DECLARE
  v_default_ids integer[];
  v_retail_ids integer[];
BEGIN
  SELECT array_agg(id ORDER BY id) INTO v_default_ids
  FROM public.pricelist_versions
  WHERE name = 'Classic Visions July 2026 Current Prices';

  SELECT array_agg(id ORDER BY id) INTO v_retail_ids
  FROM public.pricelist_versions
  WHERE name = 'Retail Price List Barbados';

  IF COALESCE(cardinality(v_default_ids), 0) <> 1
     OR COALESCE(cardinality(v_retail_ids), 0) <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one default and one retail pricelist version; found default %, retail %',
      COALESCE(cardinality(v_default_ids), 0), COALESCE(cardinality(v_retail_ids), 0);
  END IF;

  UPDATE public.customers
  SET assigned_pricelist_id = CASE
    WHEN id = 776 THEN v_retail_ids[1]
    ELSE v_default_ids[1]
  END;
END;
$$;

-- ── Step 3: verify ──────────────────────────────────────────────────────────
select
  c.id,
  c.name,
  c.account_number,
  pv.name as assigned_pricelist_name
from public.customers c
join public.pricelist_versions pv on pv.id = c.assigned_pricelist_id
order by (c.id = 776) desc, c.id;
-- Expect: customer 776 "Retail" -> "Retail Price List Barbados", everyone
-- else -> "Classic Visions July 2026 Current Prices". Any customer with a
-- NULL assigned_pricelist_id after this didn't get touched — check why
-- (e.g. a customer id that doesn't exist, or the pricelist name typo'd).
