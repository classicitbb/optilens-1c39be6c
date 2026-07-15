# BS1-08 · Audit logging, RLS pass, and data import from pricelist-automation

**Depends on:** BS1-02..BS1-06 (final issue of the round)

## Task
1. **Audit:** extend the existing product_cost audit pattern (20260713 migration) to cover every mutation on:
   supplier_item_costs (incl. exclusion toggles), pricelist lines/forks, proposals, cost_models, master recomputes.
   One `pricing_audit` table: actor, action, entity, before/after jsonb, at.
2. **RLS pass:** review all new tables together — staff roles per existing `has_role`/`has_edit_role` helpers; portal customers read only their own effective prices; nothing customer-writable.
3. **Data import (cutover) — revised 2026-07-15, see `docs/PRICING_SCHEMA.md` correction:**
   `lenses` is the source of truth for supplier costs, not `pricelist-automation`. So:
   - **Gap-check, not import:** compare `lens-data.json` combos+suppliers against live `lenses`
     rows; report anything present in the JSON but missing from the catalog for an operator to
     manually enter (never auto-write JSON costs into `lenses` — risk of overwriting live data
     with a stale snapshot).
   - `saved-pricelists.json` → customer pricelists: **this part is still a real import** —
     currently-saved customer lists become forks where they differ from master (`pricelist_lines`,
     via `pricing_items` lookup keyed on category/index/finishtype, not supplier costs).
   - `costModel` params (freight/duty/levies/clearance/brokerage) → `cost_models` — still a real
     import, this data doesn't exist on the website at all today.
4. **`assigned_pricelist_id` reconciliation (per `docs/PRICING_SCHEMA.md`):** for every `customers`
   row with a non-null `assigned_pricelist_id` pointing at something other than BS1-04's chosen
   canonical version, diff that customer's cloned `pricelist_versions`/`pricelist_overrides`
   against the canonical master and seed `pricelist_lines` ONLY for items that actually differ
   (sparse, per the fork model — do not carry over identical prices as no-op fork lines). Idempotent,
   same script re-run should not duplicate lines. Once this step's parity report (next) passes,
   repoint `WebsitePortalsPage.tsx` and `AssignedPricelistsSection.tsx`/`usePortalIdentity.ts` to
   `pricelists`/`effective_price()`; leave the `assigned_pricelist_id` column in place, unused
   (dropping it is a separate later cleanup, not part of BS1).
5. **Verification:** post-import report comparing 20 sampled prices computed by old engine (JSON)
   vs new (DB) — must match to the cent. Separately, for the `assigned_pricelist_id` reconciliation:
   spot-check every customer who currently has a non-default assignment and confirm
   `effective_price(customer_id, item_ref)` matches what their old cloned version returned, for
   every item that clone had overridden.
6. Feature flag `pricing_engine_v2` gating any UI that reads the new tables.

## Acceptance
- Import runs clean twice (idempotent).
- Sample parity report attached to the PR.
- RLS verified with anon/customer/staff role tests.
- Every customer previously on a non-default `assigned_pricelist_id` has correct, matching fork lines under the new model before the portal/admin screens are repointed.
