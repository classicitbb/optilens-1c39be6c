# Automated Catalog Generator — Consolidated Plan

**Date:** 2026-08-07 · **Source:** architecture review + grilling session, Candidate 2 (catalog-editor-v2 /
catalog-publisher-v2) · **Status:** design locked, build not started

Prototype reviewed and approved: `rx-catalog-prototype.html` (Variant D), held outside this repo at
`C:\Users\cvre\OneDrive\Documents\Claude\Projects\Classic visions new website\`. Treat it as the
visual/structural reference for the Rx template — it is throwaway code, not to be promoted directly.

## 1. Business objective

Produce accurate, professionally themed, customer-specific optical catalogs within minutes of a
discovery call — one PDF plus consistent publication to the website, customer portal, AI assistant,
internal staff tools, and the knowledge base — from one structured source of truth, with no
hand-copied prices, descriptions, or terms anywhere in the pipeline.

## 2. Confirmed catalog types

Three, each a complete, standalone reference document — not four:

- **Rx Lens Catalog** — designed first; the reference build.
- **Stock Lens Catalog**
- **Supplies Catalog**

"Complete" is not a fourth template — each type is already self-sufficient. The Rx catalog carries a
short **Supplies cross-sell teaser** section (a handful of attach-sale items with a pointer to the
full Supplies catalog), but that does not make Supplies part of the Rx template.

## 3. User workflow

1. Staff select a customer.
2. Pricelist resolves **automatically** from `customers.assigned_pricelist_id` — no manual pricelist
   step. An override is possible, but it is not a privileged shortcut: it goes through the same
   annotate-and-approve gate as every other change (§8), so it can't silently expose unauthorized
   products or prices.
3. Staff select catalog type (Rx / Stock / Supplies).
4. The generator assembles the document from structured data — cover, ToC, design guide, price
   matrices, glossary, terms, add-ons, (Rx: supplies teaser) — with no manual layout step.
5. Staff refine via **annotation**: click any rendered element in the live preview, leave a note
   (free text + priority), and a tool-calling agent proposes a structured change.
6. Every proposed change shows a diff. Staff approve or reject — nothing writes unsupervised.
7. Publish/Send freezes an immutable snapshot (§9) and stores it.

## 4. Customer selection & pricing logic

- `customers.assigned_pricelist_id → pricelist_versions → matrix_allocations / price_matrix` is the
  live resolution path (confirmed against the codebase — this is the only pricing schema with real
  `src/` consumers; see `docs/PRICING_WHICH_TABLE.md`). The generator reads through this path, not
  the abandoned `pricelists`/`pricelist_lines`/`effective_price()` scaffolding.
- Standard-pricelist customers get every approved product/option on that version. Custom-pricelist
  customers get only what's allocated to their assigned version — the generator must not invent
  prices, infer unapproved products, or expose anything the customer isn't authorized to buy.
- Manual override of the resolved pricelist is allowed, always through the approval gate — never a
  silent bypass.

## 5. Source-of-truth data model

No new pricing schema. The generator is a *consumer* of the existing live path:

| Concept | Table / mechanism |
|---|---|
| Rx lens prices | `pricelist_versions` → `matrix_allocations` / `price_matrix` |
| Add-ons / extras | `pricelist_catalog_rows` + `pricelist_overrides` |
| Catalog structure | `catalog_templates` (cover metadata) + `catalog_sections` (ordered rows) |
| Reusable content (design guide, glossary, T&C, dispensing/ordering, fitting guidance) | `help_articles`, keyed per lens design where applicable |
| Frozen output | `docstudio_files` (extended — see §9) |

**Dependency flag, not part of this build:** today there are three independent, non-unifying price
resolution paths in `src/` (admin's client-side `calcFinalPrice`, the portal's
`portal_assigned_pricelist_*` RPCs, lens-assistant's `recommend_lenses` RPC) — see the architecture
review that preceded this document. The generator should call through the eventual shared
`pricingEngine` module once it exists rather than add a **fourth** independent path. If that module
isn't ready when this is built, stub the interface and point it at `matrix_allocations` directly —
but keep the seam, don't inline the query.

## 6. Content model

The section-composition model already has the right shape — this build extends it, doesn't replace
it. Three section families, unchanged from the legacy editor's current behavior
(`docs/catalog-editor-current-behavior.md`):

- **Pricing sections** (`rx_prices` / `stock_prices` / `supplies_prices`) → resolve through §5.
- **Knowledge sections** → `help_articles` (design guide entries, terminology/glossary, fitting
  guidance keyed per lens design).
- **Fixed content sections** → `help_articles` keyed by `page_slug` (Terms & Conditions, Contact
  Information, Ordering Instructions, Dispensing Guide, Special Services, Custom Text).

**Fitting content decision (reversed once during grilling — this is final):** MFH and consultation
guidance live in `help_articles` per lens design, and *are* included in the customer-facing catalog
(not internal-only) — the catalog is explicitly meant to work as a standalone reference for someone
away from a computer, so gating this content out defeats the purpose. Populating these records per
design is a **backlog of content tasks**, not a system-build blocker.

**AI boundary for drafted content:** an agent may draft copy (e.g. a customer-specific intro) only
grounded in the business's own approved site/help-article content and directly relevant reference
material, constrained to the optical/lens/ophthalmic domain and its established science and
calculations — never open-ended generation, never invented prices, margins, eligibility, or clinical
claims. Every draft is a proposal subject to §8's approval gate like any other change.

## 7. Page template & layout strategy (Rx reference build)

Per the approved prototype (Variant D): Cover (resolved effective/expiry dates, not free text) → 
Table of Contents (page numbers computed from real pagination — see §9's two-pass note) → Lens
Design Guide (icon + tier-badge cards, MFH/consultation facts as small tags, no ladder graphic, no
gradient hero) → Price Matrices (columns = union of indices actually used per treatment family, not
a fixed template; a distinct `–*` + legend marks a deliberately excluded combination vs. plain `–`
for one that doesn't exist) → Terminology & Glossary → Terms & Conditions → AR Coatings & Lens
Treatments (compact two-column add-on strip, unchanged) → Supplies teaser (Rx only).

Stock and Supplies templates reuse the same page shell and section mechanics with different
section content — not a redesign per type.

## 8. Editing & approval workflow

- **Interface shape:** click-to-annotate, not a form wizard, not free chat, not a canvas editor.
  Every annotatable element resolves to a **stable structured reference** (`catalog_sections.id`, a
  `catalog_templates` field, a specific pricing cell) — never a CSS path, since the prototype's own
  reference implementation (a separate feedback-capture tool) proved that pattern too fragile for
  live repeated use.
- **Agent role:** a tool-calling agent, scoped to a fixed set of structured operations (add/remove
  section, set pricelist linkage, edit section content, reorder, draft copy within the AI boundary
  in §6). Not literal Claude Code, not an embedded terminal, not free-form code generation.
- **Approval:** uniform. Every proposed change — cosmetic or commercial — shows a diff and requires
  explicit human approval before it writes. No auto-apply tier, regardless of perceived risk level.
  The gate must be enforced server-side; a client-only confirmation is not a real gate.

## 9. Versioning & audit model

- Staff edit a **working** `catalog_templates`/`catalog_sections` definition.
- **Every** publish/send action **automatically** freezes an immutable snapshot — resolved sections,
  resolved prices, timestamped — stored as a `docstudio_files` row. Editing after publish never
  touches an already-issued snapshot. This is what makes a portal link or downloaded PDF safe against
  silent price drift.
- `docstudio_files` gets `status` (draft/approved/published/superseded/archived), `effective_date`,
  `expiry_date`, and `portal_token` columns added directly (chosen over a separate `catalog_issues`
  table once the legacy `pricelist` file_type — see below — was confirmed dead and available to
  repurpose, removing the original naming-collision objection).
- **Lifecycle (2026-08-07):** `draft → approved → published → superseded → archived`. `published`
  automatically supersedes the prior published snapshot for the same working template. `archived` is
  a manual hide/soft-delete. **`published` requires manager-only sign-off** — stricter than the
  regular per-change approval in §8, matching the original brief's rule that commercial/price-match
  approvals need owner/manager level, not any edit-role staff member.
- **Table of contents pagination is two-pass:** content assembles first, real page count is known,
  *then* the ToC renders with real numbers. Never hardcode ToC page numbers (the prototype does,
  deliberately, as throwaway shorthand).

## 10. Doc Studio integration

- Doc Studio's manual "Price List" tab is **retired outright** — its `/api/pricelists` backend is a
  hardcoded `return json([])` stub (`supabase/functions/docstudio-api/index.ts:243`), confirmed
  never functional in production. Delete the tab's state, `buildPricelist()`, `applySavedPricelist()`,
  and the stub route.
- Its nav slot becomes the launcher for the new catalog generator.
- The `docstudio_files.file_type` value the old tab used is **repurposed** for frozen catalog
  snapshots (rename to `'catalog'` or reuse `'pricelist'` directly — either is fine now that the old
  meaning is gone) rather than adding a parallel type.
- **Confirmed safe to repurpose (2026-08-07):** no pricelist was ever generated/saved through the
  legacy tab — business owner confirmed directly. No migration/backfill concern; the `file_type`
  value can be repurposed without a pre-check.
- The catalog editor is a **real React route** in the admin app, styled to match Doc Studio's visual
  language (palette, file-list treatment) — not hosted inside `studio.html`'s iframe/bespoke
  micro-framework runtime. "Feels native" is a styling commitment, not a shared-runtime requirement.
- `studio.html` itself is not being modularized wholesale in this effort — only the one seam needed
  (a document-type module the shell can host visually) gets built. Signature/social/shiplabel/etc.
  stay exactly as they are; they're genuinely simple and the deletion test says leave them merged.

## 11. Cross-channel sync model

Structured records (§5, §6) are the single source; every channel reads from them rather than holding
its own copy:

- **PDF / Doc Studio** — this build.
- **Website / portal** — existing `portal_assigned_pricelist_*` RPC path; should eventually call the
  same `pricingEngine` module as the generator (see §5's dependency flag).
- **Customer-facing assistant** — `recommend_lenses` RPC path; same dependency.
- **Internal staff tools / telephone-WhatsApp reference** — the frozen `docstudio_files` catalog
  snapshot doubles as this, since it's explicitly designed to be usable without a computer.
- **Knowledge base** — `help_articles` *is* the knowledge base; no separate copy to sync.

Full unification is gated on the `pricingEngine` consolidation (§5), which is out of scope for this
build but should not be contradicted by it.

## 12. MVP

- Retire Doc Studio's dead pricelist tab and stub route.
- Extend `docstudio_files` with the lifecycle columns (§9).
- Build the **Rx catalog template** end-to-end per §7, reading through the live pricing path (§5).
- Ship the annotate → agent-proposes-diff → approve → write loop (§8), scoped to the Rx template.
- Freeze-on-publish (§9), stored via the repurposed `docstudio_files` type.
- Auto-resolve `assigned_pricelist_id` on customer selection, with the gated override.
- **Prerequisite, not deferred:** audit and fix the AR coatings/tints/add-on line-item data in the
  live pricing admin — the business owner flagged this is "not properly set up" today, and building
  the generator against dirty add-on data will surface as generator bugs that are actually data bugs.

## 13. Deferred

- Stock and Supplies catalog templates (same mechanism as Rx — build once Rx proves the pattern).
- `pricingEngine` consolidation across admin/portal/lens-assistant (a separate, larger effort this
  build depends on conceptually but doesn't block on).
- Doc Studio's broader modularization (beyond the one seam in §10).
- Portal-published live catalog links with 14-day-inactivity expiry/token access.
- Per-lens-design `help_articles` content population (MFH, fitting guidance, glossary entries) — a
  content backlog, not a system-build task.
- Multilingual generation, live FX vs. fixed-rate currency conversion, payment provider selection —
  open items from the original brief, untouched by this grilling round.

## 14. Rejected

- Free-placement, Canva-style canvas editing (`catalog-editor-v2`'s `CanvasObject` x/y/rotation
  model) as the authoring interface.
- A literal embedded terminal / Claude Code runtime inside the product.
- Rebuilding the catalog editor inside `studio.html`'s bespoke template-string framework.
- Any auto-apply tier for agent-proposed changes, regardless of how low-risk it appears.
- Adding a parallel `docstudio_files.file_type` alongside the retired `'pricelist'` value — repurpose
  instead of duplicating.
- Building the catalog generator against `pricelists`/`pricelist_lines`/`effective_price()` — confirmed
  dead scaffolding with zero `src/` callers.

## 15. Remaining unresolved decisions

- The exact structured operation set the agent can call (add/remove section, set linkage, edit
  content, reorder, draft copy) needs an interface design pass of its own.
- ~~The `docstudio_files` row-count check for existing `'pricelist'`-typed rows (§10).~~ **Resolved
  2026-08-07** — confirmed no pricelist was ever generated/saved through the legacy tab; safe to
  repurpose the type value with no migration concern.

## 16. Key risks

- Dirty add-on/pricing admin data (§12) will masquerade as generator bugs if not fixed first.
- Two-pass ToC pagination (§9) is real rendering complexity, not a checkbox — whatever HTML/PDF
  render path is chosen must support content-then-count-then-ToC, not naive top-to-bottom render.
- Building the generator directly against `matrix_allocations`/`pricelist_versions` without keeping
  the `pricingEngine` seam (§5) would recreate the exact fragmentation this review started by
  diagnosing — a fourth independent pricing-resolution path.
- The approval gate (§8) only holds if enforced server-side; a client-only confirmation dialog is not
  a safeguard.
- `docstudio_files` is a live table other document types depend on today — schema changes must be
  additive, never breaking for `email`/`letter`/`signature`/etc. rows.

## 17. Acceptance criteria

- A staff member goes from "select this customer" to an approved, frozen, downloadable Rx catalog in
  minutes, with zero manual retyping of any price, description, or term.
- Every price and description in a generated catalog traces to exactly one structured record — no
  catalog-only hand-typed content except explicitly approved one-off notes.
- Two customers on different assigned pricelists get correctly different catalogs from the same flow,
  with no manual per-customer template cloning.
- A previously issued (frozen) catalog reproduces identically regardless of later master price
  changes.
- No agent-proposed change is ever written without a visible diff and a logged approval (who, when,
  what).
- ToC page numbers match actual output pagination on every generation — never hardcoded.

## 18. Recommended architecture for Candidate 2

Extend the existing section-composition data model (`catalog_templates`/`catalog_sections`/
`help_articles`) with: (a) a stable-structured-reference annotation layer replacing direct page
editing, (b) a scoped tool-calling agent behind a uniform approve-before-write gate, (c) automatic
freeze-on-publish into an extended `docstudio_files`, and (d) a Doc Studio-styled, standalone React
route rather than the abandoned canvas editor or the legacy bespoke iframe framework. This is not the
canvas-based `catalog-editor-v2` and not a hand-built wizard — it's the legacy section model made
deep: one stable seam (structured references) instead of many shallow, fragile ones (CSS paths, raw
inline queries, a dead master-fork schema).

## 19. Verdict on Candidate 2

**Redesign.** Not "keep as proposed" — the free-placement canvas work is killed outright. Not merely
"simplify" — this adds real new capability (annotation-driven agent editing, automatic snapshot
freezing, lifecycle metadata) beyond trimming scope. Not "replace" — the section-composition data
model (`catalog_templates`/`catalog_sections`/`help_articles`) is sound and is being extended, not
discarded.

## 20. Phased plan

1. **Housekeeping** — retire `catalog-editor-v2`'s canvas code; retire Doc Studio's dead pricelist
   tab and `/api/pricelists` stub. (Row-count check no longer needed — confirmed no legacy pricelist
   was ever saved.)
2. **Data prerequisite** — audit and fix AR coatings/tints/add-on line items in the live pricing
   admin.
3. **Schema** — extend `docstudio_files` with lifecycle columns; repurpose the retired file_type
   value for catalog snapshots.
4. **Rx template** — build the page shell, sections, and dynamic price-matrix rendering per §7,
   reading through the live pricing path.
5. **Editing loop** — structured-reference annotation, scoped agent, diff-and-approve gate, scoped to
   the Rx template.
6. **Freeze & publish** — automatic snapshot on every publish/send; two-pass ToC pagination.
7. **Doc Studio integration** — new React route, styled to match, launched from the repurposed nav
   slot.
8. **Expand** — Stock and Supplies templates on the same mechanism.
9. **Unify** (separate, larger effort) — `pricingEngine` consolidation across admin/portal/
   lens-assistant, once scheduled.
