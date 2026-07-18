# BS1-03 · Landed-cost model (freight/duty/levies/brokerage)

**Depends on:** BS1-02

## Context
`pricing-engine.js` (§2.7) computes landed cost per supplier:
`CIF = FOB × (1 + freightPct[supplier])`, then `landed = CIF × (1 + duty% + levies% + clearance%) + brokeragePerPair`.
VAT deliberately EXCLUDED (recoverable input credit). Edging excluded (separate page).
Saved pricelists carry `costModel` per list (freightPct per supplier + default, dutyPct, leviesPct, clearancePct, brokeragePerPair).

## Task
1. Migration: `cost_models` table storing the parameters above; one **default/global** model plus optional per-pricelist override reference.
2. `freightPct` normalized: `cost_model_freight (cost_model_id, supplier_id nullable→default, pct)`.
3. Port `landedCostFor()` as a SQL function or shared TS lib used by the pricing service (BS1-05) — single source of truth, no drift between admin preview and portal.
4. Import current values from `saved-pricelists.json`.

## Acceptance
- Landed cost per item×supplier computable server-side; matches pricing-engine.test.js fixtures to the cent.
