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
   not the anchor's, since anchor is cost-basis only, not necessarily who fulfils), then applies
   via the existing `upsertMutation` + `syncToCatalog` path — identical write path to a manual 🔍
   pick, so the Price List/PDF export stays in sync automatically. Existing 🔍 manual-link UI
   untouched for cells the classifier can't reach.
   **Revised same day, operator requirement:** the review step is a full audit table, not a bare
   count summary — every row shows the *anchor* supplier (the one the floor price is set against)
   and its cost, separately from which lens actually gets linked, with an inline "Exclude" action
   per row wired to BS1-02's `toggle_anchor_exclusion` RPC (persistent, not session-only) that
   recomputes the whole plan on click. Also added a defensive `skippedUnsafe` check: any row
   where `standardPrice()`'s `safe` flag isn't `true` is never staged, even though it should be
   mathematically impossible given how the price is derived from the anchor — belt-and-suspenders
   on the core guarantee (touch nothing, any available non-excluded supplier still clears the
   floor margin) rather than trusting the math silently.
6. **Reset — descoped, not a separate action.** This component writes every manual pick
   *immediately* to the DB (`handlePick` → `upsertMutation.mutateAsync`, no draft/unsaved layer
   anywhere in the existing editor) — unlike the local tool's client-side `prices` object that
   only persists on explicit Save. A literal "clear not-yet-saved results" button doesn't map onto
   this architecture. Substituted the confirmation dialog (task 5) as the equivalent safety net —
   nothing is written until confirmed — and the pre-existing per-cell ✕ "Clear" button already
   undoes any individual cell, auto-priced or manual, same as it always has.
7. [x] Wire **Save** / **Save As New** to BS1-04's `pricelists`/`pricelist_lines` write paths.
   Done 2026-07-16. `src/lib/pricing/save.ts`: `resolveComboForLens()` (pure — given a linked
   lens, which pricing_item its price belongs to; deliberately skips `classifyLensRows()`'s
   eligibility gates, since a linked matrix cell is already the operator's decision, not
   something to re-validate) → `computeSavePlan()`/`applySavePlan()` (writes every linked cell's
   price to master via `set_master_price()`) and `computeForkPlan()`/`applyForkPlan()` (diffs
   against the master's current `pricelist_lines` — fetched once, not per-item — and only forks
   cells that actually differ, sparse per the BS1-04 design, via `set_custom_price()`). New
   `CustomerPickerModal` in `TreatmentMatricesAccordion.tsx` (same fetch-once/filter-client-side
   pattern as `LensPickerModal` and `CatalogPublisherPage`'s `AssignDialog` — confirmed via
   research this is the established codebase convention for `customers`, not an invented one).
   BBD→USD conversion via the same `fxRate` already used for display (`allocated_price_bbd × fxRate`).
   Caught and fixed a real regression during this build: `CustomerPickerModal`'s bare `useQuery`
   broke `TreatmentMatricesAccordion.test.tsx` (no `QueryClientProvider` in that test's render
   tree — every other hook in the component is mocked out, this was the first live react-query
   call) — fixed by wrapping the test's render calls, not by avoiding `useQuery`.
   Verified live: both buttons render, customer picker opens and searches real customer data
   correctly. Did not execute an actual Save or fork — those are real, permanent writes to the
   master pricelist / a customer's fork that weren't requested to actually run yet.
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

## Trans Gen S™ fill bug — root cause found and fixed (2026-07-15)

Traced a live-data dump against `TIER_MAP` by hand first (~145 of ~150 sampled rows classified
correctly; found and fixed two real `TIER_MAP` gaps — "Varilux Comfort 3" and "Digital Executive
60mm Blended" — neither explained "nothing filled"). Actual cause, confirmed by the operator: a
third live naming variant, **"Gray 8 SRC"** (e.g. `"1.50 SF BF Round Seg 24 Gray 8 SRC"`),
contains no "trans" substring at all and fell through every `normTreatment()` pattern to the
`Clear` default — not just unmapped, silently misclassified into the wrong grouping, diluting the
Clear anchor calculation with Trans-Gen-S-specific costs. Fixed in `classifier.ts`; added
`src/tests/unit/pricingClassifier.test.ts` (didn't exist before) so this class of regression
fails a test instead of requiring another live-data round-trip to catch.

**Second, independent cause, also confirmed live and fixed:** `rx_price_groupings.is_active =
false` for `transitions_gen_s` itself (migration `20260715190000_activate_transitions_gen_s.sql`)
— the entire grouping was invisible to `buildRxPricingStructure()` regardless of whether
classification was correct. Both causes had to be fixed for Trans Gen S™ to actually fill:
the naming gap (lenses would classify into the grouping) and the inactive flag (the grouping
itself would render at all).

## Supplier scope + bulk exclusion + audit view (2026-07-16, operator requirement)

Operator asked how to kick a supplier/brand out of anchor pricing, how to audit what's
currently excluded, and how to give one customer (PriceSmart) a pricelist sourced only from one
supplier (Essilor) without that conflicting with excluding the same supplier from the main book.
That last part surfaced a real gap: `excluded_from_anchor` (BS1-02) is global and permanent — one
flag, applied everywhere, forever. Using it to keep Essilor out of the main book would also make
Essilor invisible to any attempt to Auto Price an Essilor-only book for another customer, since
`fetchApprovedLensRows()` filters it out entirely.

Resolved with two deliberately separate mechanisms, not one:
- **Auto Price supplier scope** (`TreatmentMatricesAccordion.tsx`, new) — per-run, NOT persisted.
  "Exclude selected" or "only selected" suppliers, threaded into `pricedMatrix()`'s existing
  `excluded` option (the primitive was already there from the `pricing-engine.js` port; it just
  had no UI). Solves both cases: exclude Essilor for the main book's run, only-Essilor for
  PriceSmart's book — same catalog, different scope per pricelist, nothing persisted.
- **Bulk exclude/restore by supplier or brand** (`LensClassificationPage.tsx`, new) — still global
  and persistent, reserved for genuine bad-data/discontinued cases. New migration
  `20260716100000_bulk_anchor_exclusion.sql` (`bulk_toggle_anchor_exclusion`, same audit trail as
  the single-lens RPC, one `pricing_audit` row per lens not one bulk row). Verified live: 94
  Essilor lenses computed correctly for the preview count (did not execute the write — that's a
  real, permanent production change I wasn't asked to actually perform, just to verify works).
- **Audit view** — "Currently excluded from anchor" table on the classification page, reads
  `excluded_reason`/`excluded_by`/`excluded_at` directly. Verified live showing a real exclusion
  from this session's earlier Auto Price review testing, reason string intact.

## Every stat card is now a drill-down (2026-07-16, operator requirement: "we dont want to be lost or out of control")

The classification page's 8 stat cards were static counts except two. Now every card is
clickable and shows the actual rows behind it, with whatever action fits that status: `inactive`
→ reactivate (new — direct `is_active` update, same pattern `useLenses.ts`'s
`toggleActiveMutation` already uses elsewhere), `excluded_from_anchor` → restore (existing,
folded into the same unified drill-down), everything else non-excluded → exclude. `unmapped_tier`
keeps its grouped-by-design view (more useful than a flat row list for that specific gap); every
other status gets a generic searchable, multi-select row table capped at 400 rows with a "search
to narrow down" prompt past that. Verified live: Inactive (330 rows) and Excluded (1 row, the
same real exclusion from earlier testing) both render and their action buttons update selection
counts correctly.

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
