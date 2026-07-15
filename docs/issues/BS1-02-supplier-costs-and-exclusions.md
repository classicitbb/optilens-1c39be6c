# BS1-02 · Supplier cost table + per-item exclusion flags

**Depends on:** BS1-01

## Context
Sell prices anchor on the MOST EXPENSIVE available supplier (virtual-lab model).
pricelist-automation holds this data today as JSON (`lens-data.json`, combo → `{supplier: cost}` maps,
suppliers: TOG Rx Lab, Vision Rx Lab, Optex Laboratories, SkyLab). Locked decision: rejecting a
supplier's price is a **per-item exclusion flag**, not a whole-supplier disable.

## Task
1. Migration: `supplier_item_costs`
   - `item_ref` (FK per BS1-01 target entity — catalog row / variant), `supplier_id` FK `suppliers`,
     `cost numeric`, `currency text default 'USD'`, `effective_from timestamptz`,
     `excluded_from_anchor boolean default false`, `excluded_reason text`, `excluded_by uuid`, timestamps.
   - Unique (item_ref, supplier_id, effective_from).
2. RLS: role users select; editors mutate; exclusion toggle logged to audit (BS1-08).
3. Importer script: load current costs from `pricelist-automation/lens-data.json` + `sources.generated.json`.
4. Admin API/RPC: `set_supplier_cost`, `toggle_anchor_exclusion`.

## Acceptance
- All current supplier costs imported and queryable per item.
- Excluding one supplier's price on one item changes ONLY that item's anchor; next-highest governs.
