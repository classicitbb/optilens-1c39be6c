# BS1-05 · Port the pricelist-automation engine (classify + anchor/floor + Auto Price)

**Depends on:** BS1-02, BS1-03

## Context (rewritten 2026-07-15 after live-site + source inspection)

Scope grew from "port the anchor/floor math" to "port the whole classify→price→allocate
pipeline," after finding that `C:\DEV\pricelist-automation` already solves the exact problem
BS1-01/BS1-02 got stuck on (see `docs/PRICING_SCHEMA.md` "combo key — RESOLVED"). Three files
matter, all pure/small, already reused across the local tool's static-import and live-pull paths:

- **`lens-classifier.js`** — `APPROVED` (14 real suppliers, not the 4 in `pricing-engine.js`'s
  priority list), `normMaterial(name, materialCol)`, `normTreatment(name)`, `TIER_MAP` (hand-curated
  `${mftype}|${lenstype}` → tier), `QUOTE_ONLY`. THE combo classifier. Zero drift tolerance on
  `TIER_MAP` when porting — it's accumulated business judgment, not something to regenerate.
- **`optilens-connector.js`** — `combosFromRows()`: filters to `APPROVED` + active + positive
  cost, classifies each row via `lens-classifier`, groups into
  `${treatment}||${tier}||${material}` combos, computes `anchorCost`/`anchorSupplier` (most
  expensive) and `cheapestCost`/`cheapestSupplier` per combo, keeps per-supplier provenance
  (top 6 cheapest rows). **Its `pull()` wrapper (fetch `lenses` over the public REST API from an
  external process) is NOT ported** — once this logic lives inside cvweb, it queries `lenses`
  directly in-process; there's no "external caller reaching in over HTTP" anymore. Only
  `combosFromRows()`'s classify-and-aggregate logic is worth keeping.
- **`pricing-api.js`**'s `pricedMatrix()` — adds a `smoothLadder()` pass I'd missed in the
  original BS1-05 scope: within each `treatment+tier` group, sorted by material-index order,
  prices are forced non-decreasing (a better material must never come out cheaper than a lesser
  one). Real invariant, not optional polish.
- **`pricing-engine.js`** (already known from BS1-01) — `standardPrice`, `evaluateOverride`,
  `retailFrom`, `marginAt`, `smoothLadder`.

**The live admin UI's "Auto Price" / "Reset" workflow this replaces** (operator's description,
confirmed against `public/app.js` in pricelist-automation):
1. **Auto Price** — runs the pipeline above across the current live catalog, fills every empty
   matrix cell with a computed price + links it to a lens (`matrix_allocations.lens_id`).
2. **Audit** — kick out an expensive supplier's row (BS1-02's `excluded_from_anchor`, already
   built — note it's finer-grained than the local tool's `(supplier, combo)` disable pair, since
   it targets one `lenses` row directly), or manually link a missing combo via the existing 🔍
   search (already live in `/admin/pricing/rx-lenses` — keep it as the manual-override path for
   gaps the classifier doesn't reach).
3. **Save** vs. **Save As New** — Save commits to the currently-open pricelist; Save As New
   always creates a fresh copy, optionally against a different customer. This is BS1-04's
   master-vs-fork write path, not a new concept — Save → the canonical master `pricelists` row;
   Save As New against a customer → that customer's fork, writing sparse `pricelist_lines`
   deltas (not a full snapshot copy, unlike the local tool's per-customer JSON blobs — see the
   `assigned_pricelist_id` reconciliation section for why sparse was chosen).

This *is* `optilens-connector.js`'s `push()`, which was deliberately left unimplemented pending
"first live confirmation of the write schema" — that confirmation is what this session's audit
produced (`pricelist_versions` + `matrix_allocations` + the new `pricelists`/`pricelist_lines`).

## Task

1. Port `lens-classifier.js` verbatim to `src/lib/pricing/classifier.ts` (`APPROVED`,
   `normMaterial`, `normTreatment`, `TIER_MAP`, `QUOTE_ONLY`). No reinterpretation — copy the
   `TIER_MAP` entries and their `FLAG` comments as-is; resolving a flagged ambiguity is a
   separate, explicit follow-up with the operator, not a silent judgment call during the port.
2. Port `combosFromRows()`'s classify-and-aggregate logic to `src/lib/pricing/combos.ts`, wired
   to query `lenses` directly (reuse the `useLenses.ts` direct-select pattern for admin/editor
   context) instead of an external REST pull. Populate `pricing_items` (BS1-01) from the
   distinct combo keys this produces — one row per `${treatment}||${tier}||${material}`, not
   per raw FK tuple.
3. Port `pricing-engine.js`'s `standardPrice`/`evaluateOverride`/`retailFrom`/`smoothLadder`/
   `marginAt` to `src/lib/pricing/engine.ts` — keep pure/UI-free, per the original plan.
   `pricing_item_supplier_costs` (BS1-01/02) feeds it live `lenses` cost data instead of JSON.
4. Port `pricedMatrix()`'s `smoothLadder` group-and-apply pass (grouped by `treatment+tier`,
   sorted by material order) — this was missing from the original BS1-05 scope entirely.
5. Build **Auto Price** in `/admin/pricing/rx-lenses`'s matrix editor: for every combo cell not
   already manually linked, compute the price via steps 2-4 and auto-link
   `matrix_allocations.lens_id` to the *preferred*-supplier row (`preferredOf()`, priority-list
   based — NOT the anchor row, which is cost-basis only, not necessarily who fulfils). Keep the
   existing 🔍 manual-link UI for cells the classifier can't reach.
6. Build **Reset**: client-side clear of not-yet-saved Auto Price results (matches the local
   tool's trivial confirm+clear — no backend involved).
7. Wire **Save** / **Save As New** to BS1-04's `pricelists`/`pricelist_lines` write paths: Save
   → the canonical master; Save As New against a customer → that customer's fork, writing only
   the cells whose computed price differs from the master's (sparse, not a full copy).
8. Port `pricing-engine.test.js` to vitest; all fixtures must pass identically. Add fixtures for
   `smoothLadder` (missing from the original test scope) and for `combosFromRows`'s
   take-cheapest-per-supplier behavior (explains the "multiple `lenses` rows per supplier per
   combo" finding from the live-data check earlier this session).

## Open question, not blocking

The local tool has a whole-combo "discontinue this cell" disable (`catalog-overrides.json`'s
`combos: [...]` array) distinct from BS1-02's per-lens-row exclusion. On the live site, a combo
with zero active/non-excluded `lenses` rows already produces no anchor naturally — TBD whether
an explicit "hide this combo" flag is still needed, or whether "no available supplier" is
sufficient. Decide during implementation, not upfront.

## Acceptance

- Test parity with `pricing-engine.test.js`, including `smoothLadder`.
- `TIER_MAP` ported with zero entries changed from the source file.
- Auto Price fills every combo cell with a live, non-excluded supplier on a sampled pricelist,
  without manual 🔍 linking.
- Cost change → staged recompute diff visible; nothing silently republished (unchanged from
  original scope).
- Save As New against a customer produces sparse `pricelist_lines`, not a full-catalog copy.
