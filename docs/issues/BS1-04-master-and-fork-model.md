# BS1-04 · Master pricelist + per-customer fork + variance tracking

**Depends on:** BS1-01 (schema decisions), BS1-02

## Context (locked decisions 2026-07-14, reconciled 2026-07-15)
- ONE master pricelist publishable to any customer.
- The moment ONE price changes for a customer, the account forks to a custom pricelist; variances vs master highlighted.
- Custom prices HOLD when master changes; drift is reported (BS1-07).
- One-click "return to master price" per line and per account.
- Foolproof: impossible to edit master while intending a customer change.

**Reconciliation with the live `customers.assigned_pricelist_id → pricelist_versions` mechanism**
(full writeup: `docs/PRICING_SCHEMA.md` "Reconciliation" section). Confirmed operator fact: catalog
layout is identical for every customer, only prices vary. So:
- Today's pattern of cloning a whole `pricelist_versions` document per customer is being replaced
  by this sparse fork model — it is NOT a second mechanism running alongside it.
- `assigned_pricelist_id` is NOT touched by this issue (no regression risk to the live portal/admin
  screens); it is repointed and phased out in BS1-08 once parity is proven.

## Task
0. **Prerequisite:** designate exactly one existing `pricelist_versions` row as THE canonical
   structure/layout going forward (the one every customer's catalog document renders from). This
   is a data decision (which row), not a schema change — record the chosen `id` in this issue's PR
   description so BS1-08's reconciliation script knows which version to diff customer clones against.
   **STILL OPEN — operator decision, not made yet.** Doesn't block anything below.
1. [x] Migration `20260715160000_pricelists_master_fork_model.sql`:
   - `pricelists (id, kind master|custom, customer_id integer nullable REFERENCES customers(id) — null=master, name, created_by, created_at, updated_at)` — exactly one active master enforced by a partial unique index (`WHERE kind='master'`); one custom fork per customer enforced the same way. Single master row seeded by the migration itself (starts empty).
   - `pricelist_lines (id, pricelist_id, item_ref → pricing_items.id, custom_price, reason, source price_match|manual|auto_price, created_by, approved_by)`, `UNIQUE(pricelist_id, item_ref)`. For the master pricelist a line IS that item's master price; for a custom pricelist a line is a sparse delta.
2. [x] `effective_price(customer_id, item_ref)` RPC — custom line if present else master line, `NULL` if neither exists. Self-or-staff gated (portal customer mapped via `profiles.user_id → profiles.crm_customer_id`, the same mapping `usePortalIdentity.ts` already relies on).
3. [x] `pricelist_variance` view (computed, not stored) — customer, item, master_price, custom_price, delta, pct. Relies on base-table RLS (staff-only) rather than its own grant logic.
4. [x] `revert_line_to_master(customer_id, item_ref)` and `revert_account_to_master(customer_id)` RPCs — editor-gated (direct, not yet approval-gated; BS1-06 adds owner/manager approval on top for non-owner staff), audited to `pricing_audit`.
5. [x] RLS: `pricelists`/`pricelist_lines` are staff-only for direct table access (`has_edit_role`). Portal customers never query these tables directly — only through `effective_price()`, which returns just the number, not internal fields. This is actually tighter than the original "customers can read their own effective prices" framing: they read through a function, not a customer-scoped table policy.
6. [x] **Added beyond the original task list:** `set_master_price(item_ref, price)` / `set_custom_price(customer_id, item_ref, price, reason, source)` RPCs — the actual write path (auto-forks a customer's `pricelists` row on first custom write, per the "moment ONE price changes, the account forks" locked decision). Without these there was no way to exercise or test the model at all; BS1-06 layers approval-gating on top of `set_custom_price` for non-owner staff.

## Acceptance
- [x] Forking one line for customer A changes nothing for customer B or master — mechanically true: `set_custom_price` only ever touches the row matching `(pricelist_id, item_ref)` for that customer's own `pricelists` row.
- [x] Variance view flags every forked line — `pricelist_variance` joins every custom line against its master counterpart.
- [x] Revert single line and whole account both work and are audited — both RPCs write to `pricing_audit` before/after.
- [x] `assigned_pricelist_id` and the existing portal/admin pricelist screens untouched — this migration adds new tables/functions only, modifies nothing existing.
- **Not yet done:** no integration test exercising this against a live/local Postgres instance (no DB access from this environment — see `docs/PRICING_SCHEMA.md` Supabase ownership note). Verified by migration read-through + `tsc --noEmit`, not by execution.
