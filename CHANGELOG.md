# Changelog

All notable major updates to this project are tracked in date-stamped, human-readable format.

## 2026-03-31 — PR Doc Symmetry Guardrail

### Plan
- Add a machine-readable module documentation index that maps code paths to required companion documentation updates.
- Enforce doc symmetry in pull requests by validating changed files against the mapping.
- Add a rationale-required override path for exceptional cases while keeping normal CI behavior blocking by default.

### Release Notes
- Added a new documentation symmetry guard for PR checks to block code-only changes that skip required docs updates.
- Added explicit override support through `docs/bugs/*doc-symmetry-exception*.md` or PR metadata labels with required rationale.
- Wired the doc symmetry check into the PR check pipeline and package scripts so CI can enforce it consistently.

### Technical Changelog
- Added `docs/ai/module-doc-index.json` to define module-to-doc requirements.
- Added `scripts/check_doc_symmetry.mjs` to inspect git diff changes and enforce companion docs.
- Updated `scripts/pr_checks.mjs` and `package.json` scripts to run the doc symmetry guard in PR checks.

## 2026-02-28 — Admin E2E Runtime Hardening (Lead Finder graceful fallback)

### Plan
- Run end-to-end admin checks across key pages and watch for runtime failures.
- Prevent Lead Finder from hard-failing when Edge Function connectivity is unavailable.
- Surface operator-friendly fallback messaging instead of destructive runtime behavior.

### Release Notes
- Lead Finder now degrades gracefully when the `lead-intelligence` Edge Function cannot be reached.
- Users receive a clear in-page warning and non-crashing diagnostics state instead of repeated fatal runtime failure behavior.
- Search action now catches unexpected failures and reports a controlled toast error.

### Technical Changelog
- Updated `src/features/admin/leads/hooks/useLeadFinder.ts` to return a safe fallback payload when function-invoke transport failures occur.
- Updated `src/pages/admin/leads/LeadFinderPage.tsx` to use `mutateAsync` with explicit try/catch and warning-surface handling.
- Retained existing diagnostics panel contract by providing fallback diagnostics values when providers are unreachable.

## 2026-02-28 — Contacts/CRM Location UX Upgrade (Country→State/City constrained dropdowns)

### Plan
- Replace free-text country/state/city fields with guided dropdowns in Contacts edit flow.
- Apply the same constrained location selection model to CRM Manual Opportunity Intake.
- Keep persistence backward compatible with existing contact/opportunity records.

### Release Notes
- Contacts edit dialog now shows Country first, with State and City dropdown options constrained by selected country.
- CRM Manual Opportunity Intake now uses Country, State, and City dropdowns with country-constrained options.
- Existing saved location values continue to display and remain selectable even if legacy/custom text was used previously.

### Technical Changelog
- Added `src/lib/locationOptions.ts` with country/state/city option helpers and backward-compatible option hydration (`ensureOption`).
- Updated `src/pages/admin/erp/ContactsPage.tsx` to swap address free-text fields for constrained `Select` controls and reorder country above state/city.
- Updated `src/pages/admin/crm/CrmPipelinePage.tsx` intake form to use constrained location dropdowns.
- Updated `src/features/admin/crm/hooks/useOpportunities.ts` to persist optional `state` into contact upsert payload during manual intake.

## 2026-02-28 — Product Catalog Regression Fix (Row Scroll + Working Filters)

### Plan
- Restore vertical row scrolling in product catalog segment tables while keeping headers visible.
- Fix the filter popover interaction regression so selections actually apply.
- Re-validate catalog behavior with credentialed UI checks and smoke tests.

### Release Notes
- Product catalog table rows now scroll again inside their table frames.
- Filter popovers now stay interactive after opening, so option selection and apply behavior work as expected.
- "Select All" in filter popovers is now directly clickable to clear narrowed selections quickly.

### Technical Changelog
- Updated `src/components/ui/table.tsx` table wrapper to fill available height (`h-full`) so internal row scrolling works in flex layouts.
- Updated `src/components/admin/MultiSelectFilter.tsx` to track both trigger and portal menu refs for outside-click handling, preventing immediate close on menu interaction.
- Wired the popover "Select All" row to call `selectAll` directly.

## 2026-02-28 — Product Catalog Table UX Fixes (Sticky Headers + Filter Overlay + Tab Counts)

### Plan
- Keep product catalog table headers pinned while row data scrolls underneath.
- Ensure column-filter dialogs render above table content instead of appearing hidden.
- Add filter-tab impact counts so users can see constrained record totals before switching tabs.

### Release Notes
- Product catalog segment tables now keep one sticky header layer, preventing header cells from drifting out of frame while rows scroll.
- Column filter popovers now render in a top-level portal with fixed positioning and stronger z-index stacking, so they appear above rows and sticky headers.
- Lens, Add-ons, and Supplies filter tabs now display live counts (e.g., `Active (42)`) based on the current search and column-filter context.

### Technical Changelog
- Updated `src/components/admin/AddonDataTable.tsx` and `src/components/admin/SupplyDataTable.tsx` to remove redundant per-column sticky classes and add computed tab-count labels.
- Updated `src/components/admin/LensDataTable.tsx` to compute status counts from base-filtered records and show count-bearing tab labels.
- Updated `src/components/admin/MultiSelectFilter.tsx` to use `createPortal` with dynamic fixed positioning for reliable popover layering.

## 2026-02-28 — E2E Stability Pass (Help Panel + Wiki Keying)

### Plan
- Execute credentialed end-to-end navigation across core admin surfaces.
- Fix runtime loops and React key warnings surfaced by browser-console checks.
- Re-run smoke harness to confirm regressions are closed.

### Release Notes
- Fixed an update-loop issue in Help Panel expansion state initialization.
- Fixed duplicate-key warning in wiki section table-of-contents generation for repeated headings.
- Re-validated core admin route smoke checks and credentialed browser flow.

### Technical Changelog
- `src/components/admin/HelpPanel.tsx`: guarded `setExpandedIds` to avoid unnecessary state updates that triggered maximum update-depth warnings.
- `src/components/admin/wikiFormatting.tsx`: added deterministic unique section IDs for duplicate heading labels.
- Added credentialed browser verification artifacts for wiki/admin navigation console-health.

## 2026-02-28 — Admin CRM Homepage + Wiki Markdown Visibility

### Plan
- Route admin homepage to CRM pipeline for users with CRM access.
- Make changelog, release notes, and delivery plan visible in Help/Wiki in markdown form.
- Improve wiki markdown rendering for clearer human-readable headings and code blocks.

### Release Notes
- `/admin` now redirects admins/operators/viewers to `/admin/crm/pipeline`.
- Help/Wiki now includes a dedicated **Release Ledger** section with markdown-backed Release Notes, Changelog, and Delivery Plan articles.
- Wiki content renderer now supports markdown headings (`#`, `##`, `###`) and fenced code blocks.

### Technical Changelog
- Added `src/components/admin/AdminHomeRedirect.tsx` and wired admin index route to it.
- Added raw markdown imports in `src/data/wikiContent.ts` from `CHANGELOG.md`, `docs/release-notes.md`, and `docs/phase2-phase3-delivery.md`.
- Added `docs/release-notes.md` and enhanced `src/components/admin/wikiFormatting.tsx` parsing/rendering logic.

## 2026-02-28 — Smoke Harness Reliability + Credentialed Login Validation

### Plan
- Prevent false-positive smoke passes when Vite reports transform/startup errors.
- Validate credentialed login flow and protected-route redirect behavior.
- Keep release ledger process synchronized between repo changelog and in-app wiki.

### Release Notes
- Smoke harness now fails when dev server emits pre-transform/syntax/startup errors.
- Verified login interaction on `/auth` with provided credentials and submit flow automation.
- Verified protected wiki route `/admin/knowledge/wiki` redirects to auth when not already authenticated in browser session.

### Technical Changelog
- Added dev-server diagnostic pattern capture and failure gating in `scripts/admin_smoke_and_error_checks.mjs`.
- Kept runtime logging format/wiring checks and auth/admin route smoke checks intact.
- Aligned date-stamped update governance across `CHANGELOG.md` and wiki ledger article.

## 2026-02-28 — Automated QA Harness + Runtime Logging Hardening

### Plan
- Strengthen smoke coverage for login/auth and high-traffic admin routes.
- Add stricter assertions for runtime error logging wiring across app/page surfaces.
- Enforce stable one-line runtime-error output contract for downstream automation.

### Release Notes
- Added `/auth` to automated smoke route checks.
- Added Auth page checks to ensure login UX strings remain present.
- Added/kept runtime logging checks for app wiring and one-line error format contract.

### Technical Changelog
- Updated `scripts/admin_smoke_and_error_checks.mjs` with additional route and snippet assertions.
- Preserved runtime log format contract checks for `[runtime-error] <timestamp> | <source> | <title> | <detail> | <route>`.
- Added this date-stamped changelog structure for future major updates.
