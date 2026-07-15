# BS1-05 · Port pricing engine (anchor/floor/rounding) to CV Web

**Depends on:** BS1-02, BS1-03

## Context
`pricelist-automation/pricing-engine.js` is pure, tested, and implements:
- Anchor = most expensive AVAILABLE approved supplier (exclusions drop out).
- Floor margin (15%) applied to the anchor ⇒ ANY supplier fulfils profitably.
- 15% is the FLOOR; normal pricing targets a higher default markup (locked decision — default TBD per category, parameterize it).
- Per-pricelist supplier priority shapes preferred/displayed source, never the floor.
- Zero-/low-margin manual override → suggests source-constraint suppliers, requires CONFIRM.
- $10 wholesale floor, upward rounding to increment, retail list via configurable markup.

## Task
1. Port engine to a shared TypeScript module in cvweb (`src/lib/pricing/engine.ts`) — keep it pure/UI-free.
2. Wire inputs from DB (`pricing_item_supplier_costs` view, per BS1-02 revision — NOT a
   standalone cost table; costs come live from `lenses` — + `cost_models`) instead of JSON.
3. `recompute_master_prices()` job/RPC: recompute standard prices when costs change; changed rows staged for review, not auto-published.
4. Port `pricing-engine.test.js` to vitest; all fixtures must pass identically.
5. Add `default_markup` config (global + per rx_price_category) above the 15% floor.

## Acceptance
- Test parity with pricelist-automation.
- Cost change → staged recompute diff visible; nothing silently republished.
