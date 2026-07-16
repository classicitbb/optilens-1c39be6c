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

1. [x] Port `lens-classifier.js` verbatim to `src/lib/pricing/classifier.ts` (`APPROVED`,
   `normMaterial`, `normTreatment`, `TIER_MAP`, `QUOTE_ONLY`). Done 2026-07-15 — `TIER_MAP`
   entries and `FLAG` comments copied unchanged; zero reinterpretation.
2. [x] Port `combosFromRows()`'s classify-and-aggregate logic to `src/lib/pricing/combos.ts`,
   wired to query `lenses` directly (`fetchApprovedLensRows()`, reusing the `useLenses.ts`
   direct-select pattern) instead of an external REST pull. `combosFromRows()` itself kept pure
   and unit-tested separately from the fetch, mirroring the original file's own split.
   `upsertPricingItems()` populates `pricing_items` (new migration
   `20260715150000_pricing_items.sql`) from the distinct combo keys this produces.
3. [x] Port `pricing-engine.js`'s `standardPrice`/`evaluateOverride`/`retailFrom`/`smoothLadder`/
   `marginAt`/`landedCostFor`/`anchorOf`/`preferredOf` to `src/lib/pricing/engine.ts` — pure/UI-free.
4. [x] Port `pricedMatrix()`'s `smoothLadder` group-and-apply pass into `engine.ts` as
   `pricedMatrix()` (grouped by `treatment+tier`, sorted by material order). Note: the original's
   `applyDisabled()` (whole-combo / per-supplier JSON overrides) was NOT ported — per-item
   exclusion is now `lenses.excluded_from_anchor` (BS1-02), filtered upstream in
   `fetchApprovedLensRows()` before combos are even built, so there's no separate disabled-overrides
   layer to carry over. Whole-combo disable remains the open question below.
5. Build **Auto Price** in `/admin/pricing/rx-lenses`'s matrix editor: for every combo cell not
   already manually linked, compute the price via steps 2-4 and auto-link
   `matrix_allocations.lens_id` to the *preferred*-supplier row (`preferredOf()`, priority-list
   based — NOT the anchor row, which is cost-basis only, not necessarily who fulfils). Keep the
   existing 🔍 manual-link UI for cells the classifier can't reach. **NOT STARTED.**
6. Build **Reset**: client-side clear of not-yet-saved Auto Price results (matches the local
   tool's trivial confirm+clear — no backend involved). **NOT STARTED.**
7. Wire **Save** / **Save As New** to BS1-04's `pricelists`/`pricelist_lines` write paths: Save
   → the canonical master; Save As New against a customer → that customer's fork, writing only
   the cells whose computed price differs from the master's (sparse, not a full copy).
   **BLOCKED on BS1-04** — `pricelists`/`pricelist_lines`/`effective_price()` don't exist yet.
8. [x] Port `pricing-engine.test.js` to vitest (`src/tests/unit/pricingEngine.test.ts`, 17/17
   passing, matches originals). Added `src/tests/unit/pricingCombos.test.ts` (7 tests) covering
   `combosFromRows`'s take-cheapest-per-supplier behavior specifically.

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
