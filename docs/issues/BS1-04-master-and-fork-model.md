# BS1-04 · Master pricelist + per-customer fork + variance tracking

**Depends on:** BS1-01 (schema decisions), BS1-02

## Context (locked decisions 2026-07-14)
- ONE master pricelist publishable to any customer.
- The moment ONE price changes for a customer, the account forks to a custom pricelist; variances vs master highlighted.
- Custom prices HOLD when master changes; drift is reported (BS1-07).
- One-click "return to master price" per line and per account.
- Foolproof: impossible to edit master while intending a customer change.

## Task
1. Migration (names per BS1-01 doc, indicative):
   - `pricelists (id, kind master|custom, customer_id nullable — null=master, forked_from_version, created_at, …)` — enforce exactly one active master (partial unique index).
   - `pricelist_lines` or reuse `pricelist_overrides`: custom lines store ONLY deltas from master (sparse fork). Line: item_ref, custom_price, reason, source (price_match|manual), created_by, approved_by.
2. Resolution function: `effective_price(customer_id, item_ref)` → custom line if present else master price. This is THE read path for portal + Rx form later.
3. Variance computed, not stored: view `pricelist_variance` (customer, item, master_price, custom_price, delta, pct).
4. `revert_line_to_master(customer, item)` and `revert_account_to_master(customer)` RPCs (approval-gated per BS1-06).
5. RLS: customers can only read their own effective prices (portal); staff read all.

## Acceptance
- Forking one line for customer A changes nothing for customer B or master.
- Variance view flags every forked line.
- Revert single line and whole account both work and are audited.
