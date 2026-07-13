# Changelog

> Indexed summary entry point. Detailed source entries live in `docs/changelog/` and are aggregated here for backward compatibility.

All notable major updates to this project are tracked in date-stamped, human-readable format.

## 2026-07-13 — Innovations EFT Bank Portal Directory

### Release Notes
- Bank Payment Portals now receives the exact EFT-institution directory from Innovations and identifies source-managed rows.
- Verified retail online-banking destinations are seeded; ambiguous, placeholder, and non-retail entries remain intentionally unmapped instead of redirecting a customer to the wrong institution.

### Technical Changelog
- Added immutable `innovations_eft_institution_id` matching, a cloud receiver entity, and a read-only OptiLens Local `dbo.EFTInstitutions` sync entity that preserves the exact source bank name.
- Made portal URLs nullable only for entries without a verified customer sign-in page; the customer payment dialog now safely falls back to support when no URL exists.

## 2026-07-13 — Admin Email Preview Center

### Release Notes
- Administrators can now review the authentication and application emails wired into Classic Visions from Settings → Email Previews.
- The split workspace identifies each email's trigger and recipient, and previews personalized sample copy without sending an email.

### Technical Changelog
- Added canonical admin route `/admin/settings/email-previews`, sidebar navigation, and route-accessibility coverage.
- The preview catalog covers six authentication templates and eight registered transactional templates while retaining the existing source-managed, authenticated email send pipeline.

## 2026-07-13 — Storefront Cost-Access Regression Guard

### Release Notes
- Anonymous storefront visitors can see published sell prices without receiving product-cost values.
- Direct reads of cost-bearing product tables remain blocked for anonymous and ordinary authenticated users.

### Technical Changelog
- Added safe-RPC storefront reads, a rendered anonymous storefront regression test, and a database-policy audit RPC for `addons`, `lenses`, and `supplies`.
- Added `npm run security:product-cost-rls-audit` to the required PR checks so future migrations cannot re-grant direct product-table SELECT access or add unsafe SELECT policies.

## 2026-07-11 — Portal Statements and Order Status

### Release Notes
- Customer statements now use posted Innovations statements with full aging, balance, and transaction detail instead of a synthetic current-period record.
- My Orders now includes live Innovations WIP and same-day valid shipment status from the MSSQL-SVR gateway while retaining delivery tracking and website order history.
- Sign in now uses a more spacious, modern form with password visibility and inline reset-password access.
- My Account now shows the linked ERP account number and includes a Sign out action beside Save Changes.
- Customer account-number linking now blocks duplicate Innovations account numbers and exposes a duplicate audit view.
- My Orders now keeps every open shipment visible regardless of age, retains closed deliveries for 30 days, and lets customers expand a shipment to review its included work and tracking link.

### Technical Changelog
- Extended the live gateway, statement sync, and portal views with the posted-statement and order-status fields required by the customer portal.
- Added portal order-status search, section-count anchors, compact website-order cards, and a wider responsive account layout; the gateway now returns only Rx number, patient, received date, and status for the current account's active WIP and valid same-day shipments.
- Added an authenticated, source-managed ERP account-number lookup for My Account; customers can view the resolved value but cannot edit the integration link from their profile.

## 2026-06-24 — Product Cost RLS + Analytics Insert Hardening

### Plan
- Close reported cost-data exposure on `addons`, `lenses`, and `supplies` without changing public catalog routes or staff editing flows.
- Keep website analytics ingestion available while rejecting malformed public write payloads.
- Refresh npm dependencies within the existing npm lockfile workflow and preserve the current site behavior.

### Release Notes
- Direct reads on cost-bearing product tables are now limited to admin/operator edit roles; public and customer-facing product reads continue through cost-free views.
- Website analytics session, pageview, and web-vitals inserts now validate IDs, paths, metric names, ratings, and bounded numeric fields instead of accepting unrestricted rows.
- Dependency audit now reports zero vulnerabilities after npm lockfile refresh.

### Technical Changelog
- Added `supabase/migrations/20260624090000_harden_product_cost_rls_and_analytics_inserts.sql` to replace broad `has_any_role()` product SELECT policies with `has_edit_role()` policies and tighten analytics INSERT checks.
- Updated `src/tests/integration/supabaseRlsHardening.integration.test.ts` to assert product-cost RLS and analytics policy hardening.
- Resolved an API v1 merge-conflict marker in `supabase/functions/api-v1/index.ts` while preserving the default-order fallback behavior.
- Updated auth flow tests and shared test setup so required country selection is covered without depending on Radix Select browser internals in jsdom.

## 2026-06-05 — Shipment Costing Fixes + Security/Print Hardening

### Plan
- Close the admin shipment-costing regressions merged on 2026-05-29 so charge edits, line edits, and FOB visibility behave predictably.
- Fold in the 2026-06-01 DEV merge runtime changes without overstating doc-only churn.
- Keep this weekly summary source-backed and include direct links to the merged history items that drove it.

### Release Notes
- Shipment Detail no longer overwrites charge edits with line-item edits, and the FOB column is now preserved as read-only in the admin costing view.
- Admin UI polish fixes landed for sidebar behavior plus shared input/select rendering to address the text cutoff issues merged this week.
- The DEV merge hardened quote printing, transactional-email authorization/CORS handling, and Vercel security-header synchronization while removing Bun lockfile drift from the npm-only workflow.

### Technical Changelog
- Updated `src/pages/admin/costings/ShipmentDetailPage.tsx` to stop charge/line edit overwrite regressions and keep the FOB column read-only.
- Updated `src/components/admin/AdminSidebar.tsx`, `src/components/ui/select.tsx`, and `src/components/ui/input.tsx` for the sidebar/text-cutoff fixes that were merged on 2026-05-29.
- Updated `src/components/admin/QuotePdfExport.tsx` to use explicit first-page/continuation pagination rules and continuation headers for quote print output.
- Updated `supabase/functions/send-transactional-email/index.ts`, `vercel.json`, `scripts/sync_vercel_security_headers.mjs`, `scripts/check_lockfiles.mjs`, and `package.json` to tighten privileged email access, sync enforced security headers, and reject stray Bun lockfiles in the npm workflow.
- Key history links: [Fixed text cutoff & sidebar](https://github.com/classicitbb/optilens-1c39be6c/commit/505681e27f9c0cb1a1f92aa7918dc48047248e3b), [Added read-only FOB col](https://github.com/classicitbb/optilens-1c39be6c/commit/ea6e9e969d03bddbd2dd9efe43bdb368fa41b20a), [Fixed charge/line edit overwrites](https://github.com/classicitbb/optilens-1c39be6c/commit/4893620509a7b512a4749630bc823142d73ea0f1), [Merge DEV updates](https://github.com/classicitbb/optilens-1c39be6c/commit/01c0ef8d5b44e5fc360ae10b452d00feb4322bff).

## 2026-04-13 — LED PRO Public Lens Page + Admin Rendering Safeguards

### Plan
- Publish a dedicated public-facing LED PRO lens page and wire it into the shared public route system.
- Keep discovery surfaces synchronized so navigation, route metadata, knowledge-center content, and site search all resolve the same canonical URL.
- Close two admin runtime issues by normalizing PDF preview zoom initialization and sanitizing stored SLA rich-text before rendering.

### Release Notes
- Added a new public LED PRO lifestyle-lens page at `/lenses/led-pro`.
- LED PRO is now discoverable through public header navigation, the lens design guide, knowledge-center entries, and site search.
- The LED PRO hero now uses a live embedded demo at the watch section so the page does not depend on a locally merged video asset during runtime.
- Admin SLA policy descriptions now render through the shared rich-text sanitizer, and PDF preview opens with an explicit 100% manual zoom baseline.

### Technical Changelog
- Added `src/pages/lenses/LedProPage.tsx` as the canonical public page for LED PRO lens marketing content and media.
- Updated `src/routes/public/PublicRoutes.tsx` and `src/config/routeRegistry.ts` to register `/lenses/led-pro` through the centralized public routing system.
- Updated `src/components/Header.tsx`, `src/pages/LensDesignGuidePage.tsx`, `src/data/knowledgeCenter.ts`, and `src/lib/siteSearchIndex.ts` so shared navigation and discovery surfaces point to the new LED PRO page.
- Updated `src/tests/integration/publicRouteAccessibility.integration.test.ts` to enforce route-registry and runtime-route coverage for `/lenses/led-pro`.
- Updated `src/pages/admin/helpdesk/HelpdeskSlaPoliciesPage.tsx` to sanitize policy-description HTML before `dangerouslySetInnerHTML` rendering.
- Updated `src/components/admin/PdfPreviewShell.tsx` to initialize manual zoom at `1` instead of `null` for a stable preview baseline.

## 2026-04-06 — Companion Assistant (Public AI Floating Assistant)

### Plan
- Add a floating AI companion assistant accessible from all public pages.
- Back the assistant with a dedicated Supabase Edge Function (`companion-assistant`) using Claude as the model.
- Expose a full-screen assistant window page and integrate context sharing across public routes.

### Release Notes
- A floating companion assistant is now available on all public pages, providing AI-powered help for visitors.
- The assistant is model-backed via the new `companion-assistant` Edge Function.
- A dedicated full-screen assistant window is accessible at `/assistant`.
- Public search panel updated with improved assistant integration.

### Technical Changelog
- Added `src/components/assistant/CompanionAssistant.tsx` — floating assistant UI component.
- Added `src/features/assistant/CompanionAssistantContext.tsx` and `CompanionAssistantContext.shared.ts` — context and shared state.
- Added `src/features/assistant/companionAssistantEngine.ts` — assistant orchestration and engine logic.
- Added `src/features/assistant/assistantGeneration.ts` — model generation helpers.
- Added `src/pages/assistant/CompanionAssistantWindowPage.tsx` — full-screen assistant page.
- Added `supabase/functions/companion-assistant/index.ts` — Claude-backed Edge Function.
- Updated `src/routes/public/PublicRoutes.tsx` to register `/assistant` route.
- Updated `src/config/routeRegistry.ts` to include assistant window route.
- Added unit tests: `CompanionAssistant.test.tsx`, `companionAssistantEngine.unit.test.ts`.

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
