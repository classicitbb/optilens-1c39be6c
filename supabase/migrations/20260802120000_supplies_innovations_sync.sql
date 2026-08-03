-- Extend the existing office->cloud Innovations sync (customers/contacts/balances/
-- statements/order_activity/lens_aliases) to a new "supplies" entity, so physical
-- stocked items in the ERP (dbo.MiscItems) can sync into the website's Supplies
-- catalog instead of being re-typed by hand. See docs/ERP_ITEM_SYNC_PLAN.md.

ALTER TABLE public.supplies
  ADD COLUMN IF NOT EXISTS innovations_misc_item_id bigint,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS inventory_qty numeric;

-- Plain (non-partial) unique index: required to work as an ON CONFLICT arbiter.
-- A WHERE ... IS NOT NULL partial index fails as an upsert arbiter (lesson already
-- recorded in 20260630160000_innovations_sync_fix_unique_indexes.sql); NULLs stay
-- distinct in a plain unique index, so existing manually-entered rows are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS supplies_innovations_misc_item_id_key
  ON public.supplies (innovations_misc_item_id);

-- Widen the entity allowlist for innovations_sync_runs to include "supplies", and
-- fix a pre-existing gap: order_activity/lens_aliases already sync today but were
-- never added here, so their run-log inserts have been silently failing.
ALTER TABLE public.innovations_sync_runs
  DROP CONSTRAINT IF EXISTS innovations_sync_runs_entity_check;
ALTER TABLE public.innovations_sync_runs
  ADD CONSTRAINT innovations_sync_runs_entity_check
  CHECK (entity IN ('banks', 'customers', 'contacts', 'invoices', 'statements',
                     'statement_lines', 'balances', 'order_activity', 'lens_aliases',
                     'supplies'));
