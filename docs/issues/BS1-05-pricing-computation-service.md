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
5. [x] Build **Auto Price** in `/admin/pricing/rx-lenses`'s matrix editor
   (`TreatmentMatricesAccordion.tsx`). Done 2026-07-15: computes a plan (classify live `lenses` →
   `pricedMatrix()` → map onto real grouping/category/material keys via `groupingMap.ts` → skip
   cells already manually linked → resolve the *preferred*-supplier's `lens_id` via `lensIdFor()`,
   not the anchor's, since anchor is cost-basis only, not necessarily who fulfils), shows a
   confirmation dialog with counts (fill / already-linked / unmapped), then applies via the
   existing `upsertMutation` + `syncToCatalog` path — identical write path to a manual 🔍 pick,
   so the Price List/PDF export stays in sync automatically. Existing 🔍 manual-link UI untouched
   for cells the classifier can't reach.
6. **Reset — descoped, not a separate action.** This component writes every manual pick
   *immediately* to the DB (`handlePick` → `upsertMutation.mutateAsync`, no draft/unsaved layer
   anywhere in the existing editor) — unlike the local tool's client-side `prices` object that
   only persists on explicit Save. A literal "clear not-yet-saved results" button doesn't map onto
   this architecture. Substituted the confirmation dialog (task 5) as the equivalent safety net —
   nothing is written until confirmed — and the pre-existing per-cell ✕ "Clear" button already
   undoes any individual cell, auto-priced or manual, same as it always has.
7. Wire **Save** / **Save As New** to BS1-04's `pricelists`/`pricelist_lines` write paths: Save
   → the canonical master; Save As New against a customer → that customer's fork, writing only
   the cells whose computed price differs from the master's (sparse, not a full copy).
   **NOT STARTED** — BS1-04 now exists so this is unblocked, just not built yet. Note this is a
   distinct action from Auto Price: Auto Price fills `matrix_allocations` (the structural
   "which lens fulfils this cell" layer, unchanged table); Save/Save As New would separately
   write the resolved price into `pricelist_lines` (the price-authority layer) via
   `set_master_price()`/`set_custom_price()`, keyed on `pricing_items.id`, not the matrix cell.
8. [x] Port `pricing-engine.test.js` to vitest (`src/tests/unit/pricingEngine.test.ts`, 17/17
   passing, matches originals). Added `src/tests/unit/pricingCombos.test.ts` (7 tests) covering
   `combosFromRows`'s take-cheapest-per-supplier behavior specifically.

## Taxonomy reconciliation (resolved 2026-07-15, live-data check)

Auto Price needs to turn a classifier combo (`treatment||tier||material`) into a real
`matrix_allocations` write, which is keyed on `rx_price_groupings.key`/`rx_price_categories.key`
— not the classifier's human-readable strings. Pulled the live grouping/category table via the
operator; it did NOT line up cleanly. Resolved with the operator (locked decision: the local
tool's taxonomy is authoritative, live DB conforms to it, not the other way around):

- `Photochromic - Brown` has no live grouping → lumped into `photochromic_gray`.
- Live DB had two near-duplicate transitions groupings (`transitions_gen_s` /
  `transitions_gen_s_2`) → `transitions_gen_s` is canonical, `_2` deactivated.
- `Progressive - Adept` (classifier) vs. live `Progressive - Adapt` → relabel to "Adept".
- `Anti-Fatigue` (classifier, one shared tier for both progressive and single-vision designs) vs.
  live `single_vision_antifatigue` (SV-only) → relabel to "Anti-Fatigue", reused for both.
- `Specific Use - Sport` had no live category at all → added, one row per active grouping
  (`rx_price_categories` has one row per (grouping, key) pair, not a single shared row).
- Live DB split bifocals by shape (`specific_use_bifocal_round`/`_ft`); classifier splits by
  digital-vs-conventional → collapsed onto the classifier's split (operator confirmed round vs.
  FT carries no real price distinction today).

Implemented as `src/lib/pricing/groupingMap.ts` (`groupingKeyFor`/`categoryKeyFor`, tested for
completeness against every value `classifier.ts` can actually produce — a future `TIER_MAP`
addition without a mapping entry fails the test loudly instead of Auto Price silently dropping
combos) + migration `20260715170000_rx_taxonomy_reconciliation.sql` (label renames + one
additive insert only — `matrix_allocations` matches by key *string*, not id, so nothing existing
can break).

## Open question, not blocking

The local tool has a whole-combo "discontinue this cell" disable (`catalog-overrides.json`'s
`combos: [...]` array) distinct from BS1-02's per-lens-row exclusion. On the live site, a combo
with zero active/non-excluded `lenses` rows already produces no anchor naturally — TBD whether
an explicit "hide this combo" flag is still needed, or whether "no available supplier" is
sufficient. Decide during implementation, not upfront.

## Acceptance

- [x] Test parity with `pricing-engine.test.js`, including `smoothLadder` (17/17).
- [x] `TIER_MAP` ported with zero entries changed from the source file.
- [x] Auto Price fills combo cells with a live, non-excluded, preferred supplier without manual
  🔍 linking, skipping cells already linked by hand — verified by code path + 30 unit tests
  (engine/combos/groupingMap) + existing `TreatmentMatricesAccordion.test.tsx` still passing.
  **Not yet exercised against a live pricelist_version in a real browser session** — same caveat
  as BS1-02/04: no DB execution access from this environment.
- Cost change → staged recompute diff visible; nothing silently republished — unchanged from
  original scope, not yet built (no `cost_models`/BS1-03 staging layer exists yet).
- Save As New against a customer produces sparse `pricelist_lines`, not a full-catalog copy —
  **not yet built**, see task 7.
