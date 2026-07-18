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
4. ~~View `pricing_item_supplier_costs`~~ — **MOVED to BS1-05**, resolved 2026-07-15 (same day,
   later). Two guessed combo keys both failed against live data (`pricing_category`/`pricing_index`
   dead — 0/1108 populated; the 5-column FK grouping left ~3-4 rows per supplier per combo
   unexplained). The actual answer wasn't guessable from `lenses` columns at all: it's
   `C:\DEV\pricelist-automation\lens-classifier.js`'s `${treatment}||${tier}||${material}`, derived
   by parsing `lenses.name` text plus a hand-curated tier-mapping table — real business knowledge,
   not a structural key. The "~3-4 rows per supplier" mystery is also explained: a supplier can
   have several product-name sub-variants that all classify into the same combo; the local tool
   takes the cheapest as that supplier's representative quote. Full port plan:
   `docs/issues/BS1-05-pricing-computation-service.md`.
5. Gap-check (not an import): compare `pricelist-automation/lens-data.json` combos against
   `lenses` and report any supplier quote present in the JSON but absent from the live catalog,
   for manual entry by an operator. Do not write JSON data into any table automatically — the
   website catalog is the source of truth going forward, not the local tool. This check moves to
   BS1-08's verification step, not this issue.

## Acceptance

- [x] No new cost-storage table created; only new columns on `lenses` + `pricing_audit`.
- [x] Excluding one supplier's `lenses` row changes ONLY that row's participation in its combo's
  anchor calc; next-highest-cost sibling row governs (mechanically true — exclusion is a WHERE
  filter, independent of however the combo grouping ends up being defined).
- [ ] `pricing_item_supplier_costs` view — moved to BS1-05, see task 4.
