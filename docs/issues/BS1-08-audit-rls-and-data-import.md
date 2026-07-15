# BS1-08 · Audit logging, RLS pass, and data import from pricelist-automation

**Depends on:** BS1-02..BS1-06 (final issue of the round)

## Task
1. **Audit:** extend the existing product_cost audit pattern (20260713 migration) to cover every mutation on:
   supplier_item_costs (incl. exclusion toggles), pricelist lines/forks, proposals, cost_models, master recomputes.
   One `pricing_audit` table: actor, action, entity, before/after jsonb, at.
2. **RLS pass:** review all new tables together — staff roles per existing `has_role`/`has_edit_role` helpers; portal customers read only their own effective prices; nothing customer-writable.
3. **Data import (cutover):** one idempotent script importing from `C:\DEV\pricelist-automation`:
   - lens catalog combos → item refs (map via BS1-01 decisions)
   - supplier costs (`lens-data.json`) → supplier_item_costs
   - `saved-pricelists.json` → customer pricelists: currently-saved customer lists become forks where they differ from master; costModel params → cost_models.
4. **Verification:** post-import report comparing 20 sampled prices computed by old engine (JSON) vs new (DB) — must match to the cent.
5. Feature flag `pricing_engine_v2` gating any UI that reads the new tables.

## Acceptance
- Import runs clean twice (idempotent).
- Sample parity report attached to the PR.
- RLS verified with anon/customer/staff role tests.
