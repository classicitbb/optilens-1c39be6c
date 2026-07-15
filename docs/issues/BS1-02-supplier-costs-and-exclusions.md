# BS1-02 · Per-item supplier-exclusion flag on `lenses`

**Depends on:** BS1-01

## Context (revised 2026-07-15 — see `docs/PRICING_SCHEMA.md` "Correction" section)

Sell prices anchor on the MOST EXPENSIVE available supplier (virtual-lab model). The original
draft of this issue assumed supplier costs needed importing from
`pricelist-automation/lens-data.json` into a new table. **That was wrong.** The operator
confirmed pricelist-automation's cost data is itself exported FROM the website's `lenses` table,
not the other way around. `lenses` already stores one row per supplier's quote for one exact
lens spec (`supplier_id`, `base_price` = cost, `pricing_category`, `pricing_index`,
`finishtype_id` = treatment, `lenstype_id`, `material_id`, `mftype_id`) — multiple rows already
share a combo, differing only by supplier, confirmed live by the existing `/admin/pricing/compare`
tool and by `matrix_allocations.lens_id` (which already picks a *preferred* row among siblings).

So there is no new cost data to import. There is only a missing capability: **flagging one
supplier's quote on one item as excluded from the anchor calculation**, without disabling that
supplier everywhere else (locked decision: per-item exclusion, not whole-supplier disable). Since
one `lenses` row already IS one supplier's cost for one item, this is new columns on `lenses`,
not a new join table.

## Task

1. Migration: `ALTER TABLE public.lenses ADD COLUMN`:
   - `excluded_from_anchor boolean NOT NULL DEFAULT false`
   - `excluded_reason text`
   - `excluded_by uuid`
   - `excluded_at timestamptz`
2. RLS: extend the existing `lenses` policies — toggling exclusion requires `has_edit_role()`,
   same as other `lenses` mutations. Reads follow the existing `get_lenses_safe()` masking
   pattern (exclusion flag is visible to editors; not part of the `base_price` masking concern,
   but should not leak to anon/customer reads either — gate it the same as other admin-only
   catalog fields).
3. RPC: `toggle_anchor_exclusion(p_lens_id uuid, p_excluded boolean, p_reason text)` —
   editor-role only, sets the four columns atomically, logs to `pricing_audit` (BS1-08).
4. View `pricing_item_supplier_costs` (per `docs/PRICING_SCHEMA.md`): joins `lenses` to
   `pricing_items` (BS1-01) via the `(pricing_category, pricing_index, finishtype_id)` combo
   match, `WHERE is_active AND NOT excluded_from_anchor`, exposing
   `(pricing_item_id, lens_id, supplier_id, base_price)`. This is the read path BS1-05's
   anchor/floor engine consumes — no separate cost table to keep in sync.
5. Gap-check (not an import): compare `pricelist-automation/lens-data.json` combos against
   `lenses` and report any supplier quote present in the JSON but absent from the live catalog,
   for manual entry by an operator. Do not write JSON data into any table automatically — the
   website catalog is the source of truth going forward, not the local tool. This check moves to
   BS1-08's verification step, not this issue.

## Acceptance

- No new cost-storage table created; `lenses` + `pricing_item_supplier_costs` view are the only
  schema additions.
- Excluding one supplier's `lenses` row changes ONLY that row's participation in its combo's
  anchor calc; next-highest-cost sibling row governs.
- `pricing_item_supplier_costs` view returns correct multi-supplier rows for a sampled combo,
  matching what `/admin/pricing/compare` already shows for the same lenses.
