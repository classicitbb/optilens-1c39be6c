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
1. Migration (names per BS1-01 doc, indicative):
   - `pricelists (id, kind master|custom, customer_id integer nullable REFERENCES customers(id) — null=master, forked_from_version, created_at, …)` — enforce exactly one active master (partial unique index).
   - `pricelist_lines` or reuse `pricelist_overrides`: custom lines store ONLY deltas from master (sparse fork). Line: item_ref, custom_price, reason, source (price_match|manual), created_by, approved_by.
2. Resolution function: `effective_price(customer_id, item_ref)` → custom line if present else master price. This is THE read path for portal + Rx form later.
3. Variance computed, not stored: view `pricelist_variance` (customer, item, master_price, custom_price, delta, pct).
4. `revert_line_to_master(customer, item)` and `revert_account_to_master(customer)` RPCs (approval-gated per BS1-06).
5. RLS: customers can only read their own effective prices (portal); staff read all.

## Acceptance
- Forking one line for customer A changes nothing for customer B or master.
- Variance view flags every forked line.
- Revert single line and whole account both work and are audited.
- `assigned_pricelist_id` and the existing portal/admin pricelist screens still work unmodified after this issue merges (repointing them is BS1-08's job, not this one's).
