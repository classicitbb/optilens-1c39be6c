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
select id, name, currency, created_at
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
update public.customers
set assigned_pricelist_id = (
  select id from public.pricelist_versions
  where name = 'Classic Visions July 2026 Current Prices'
)
where id <> 776;

-- ── Step 2: the one exception — the retailer account ───────────────────────
update public.customers
set assigned_pricelist_id = (
  select id from public.pricelist_versions
  where name = 'Retail Price List Barbados'
)
where id = 776;

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
