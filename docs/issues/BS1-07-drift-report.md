# BS1-07 · Master-drift report for forked prices

**Depends on:** BS1-04, BS1-05

## Context (locked decision)
When the MASTER price changes on an item a customer has custom-priced, the custom price HOLDS,
and a drift report shows deviation from master for periodic review.

## Task
1. View/RPC: `pricelist_drift` — per customer, per forked line:
   master_price_now, custom_price, drift_abs, drift_pct, margin_now (vs current anchor cost), below_floor flag.
2. Highlight severity: `below_floor` (anchor cost rose past custom price margin floor) > large drift > minor drift.
3. Admin surface stub: drift table reachable from the customer's pricelist screen (full UI is build-seq-2; this issue delivers the data + a minimal read-only page).

## Acceptance
- Changing a master price makes affected customers' lines appear in drift with correct numbers.
- A cost increase that pushes a custom line under 15% margin flags below_floor.
