# Release Notes

Summarized release outcomes for each major date-stamped update.

## 2026-07-10 — Smart Customer Journey First Release

### Release Notes
- A compact role-aware homepage now puts ordering, tracking, lens guidance, help, account access, and retailer discovery first and remembers the professional/patient choice on that device.
- Signed-in customers are sent to a command centre that brings together onboarding, website orders, Rx drafts, balances, statements, tickets, assigned pricing, and clear source/freshness labels.
- The controlled lens assistant validates prescription and frame information, applies only staff-published catalogue rules, and never substitutes a generic price or invented turnaround.
- Recommendations can be saved as owner-private drafts and reviewed beside LabLink; LabLink remains the final submission system and the website never claims that saving a draft submitted an order.
- Ask Classic can explain permitted account data and lens-tool results, while patient mode remains educational and unsupported Innovations job lookup is stated plainly.

## 2026-06-24 — Product Cost RLS + Analytics Insert Hardening

### Release Notes
- Direct reads on `addons`, `lenses`, and `supplies` now require admin/operator edit access so viewer/customer roles cannot read cost-bearing columns.
- Public product browsing remains available through existing cost-free public views.
- Public analytics writes now validate UUID-shaped visitor IDs, safe path values, known web-vital metrics, ratings, and bounded values.
- npm dependency refresh resolved the reported audit vulnerability; `npm audit` now reports zero vulnerabilities.

## 2026-06-05 — Shipment Costing Fixes + Security/Print Hardening

### Release Notes
- Shipment Detail no longer overwrites charge edits with line-item edits, and the FOB column is now preserved as read-only in the admin costing view.
- Admin UI polish fixes landed for sidebar behavior plus shared input/select rendering to address the text cutoff issues merged this week.
- The DEV merge hardened quote printing, transactional-email authorization/CORS handling, and Vercel security-header synchronization while removing Bun lockfile drift from the npm-only workflow.

## 2026-04-13 — LED PRO Public Lens Page + Admin Rendering Safeguards

### Release Notes
- Added a new public LED PRO lifestyle-lens page at `/lenses/led-pro`.
- LED PRO now appears in public navigation, lens-guide discovery, knowledge-center content, and site search so every public entry point resolves to one canonical route.
- The LED PRO watch section now uses a live embedded demo instead of relying on a locally merged video file.
- Helpdesk SLA policy descriptions now render only after shared rich-text sanitization, and PDF preview starts from an explicit 100% manual zoom state.

## 2026-04-06 — Companion Assistant (Public AI Floating Assistant)

### Release Notes
- A floating companion assistant is now available on all public pages, providing AI-powered help for visitors.
- The assistant is model-backed via the new `companion-assistant` Edge Function.
- A dedicated full-screen assistant window is accessible at `/assistant`.
- Public search panel updated with improved assistant integration.

## 2026-03-31 — PR Doc Symmetry Guardrail

### Release Notes
- Added a module documentation index and PR guard to enforce code/doc companion updates.
- CI PR checks now run doc symmetry validation as a required gate.
- Exception handling now supports explicit rationale-backed overrides via bug exception files or PR metadata labels.

## 2026-02-28 — Admin E2E Runtime Hardening (Lead Finder graceful fallback)

### Release Notes
- Lead Finder now degrades gracefully when the `lead-intelligence` Edge Function cannot be reached.
- Users receive a clear in-page warning and non-crashing diagnostics state instead of repeated fatal runtime failure behavior.
- Search action now catches unexpected failures and reports a controlled toast error.

## 2026-02-28 — Contacts/CRM Location UX Upgrade (Country→State/City constrained dropdowns)

### Release Notes
- Contacts edit dialog now shows Country first, with State and City dropdown options constrained by selected country.
- CRM Manual Opportunity Intake now uses Country, State, and City dropdowns with country-constrained options.
- Existing saved location values continue to display and remain selectable even if legacy/custom text was used previously.

## 2026-02-28 — Product Catalog Regression Fix (Row Scroll + Working Filters)

### Release Notes
- Product catalog table rows now scroll again inside their table frames.
- Filter popovers now stay interactive after opening, so option selection and apply behavior work as expected.
- "Select All" in filter popovers is now directly clickable to clear narrowed selections quickly.

## 2026-02-28 — Product Catalog Table UX Fixes (Sticky Headers + Filter Overlay + Tab Counts)

### Release Notes
- Product catalog segment tables now keep one sticky header layer, preventing header cells from drifting out of frame while rows scroll.
- Column filter popovers now render in a top-level portal with fixed positioning and stronger z-index stacking, so they appear above rows and sticky headers.
- Lens, Add-ons, and Supplies filter tabs now display live counts (e.g., `Active (42)`) based on the current search and column-filter context.

## 2026-02-28 — E2E Stability Pass (Help Panel + Wiki Keying)

### Release Notes
- Fixed an update-loop issue in Help Panel expansion state initialization.
- Fixed duplicate-key warning in wiki section table-of-contents generation for repeated headings.
- Re-validated core admin route smoke checks and credentialed browser flow.

## 2026-02-28 — Admin CRM Homepage + Wiki Markdown Visibility

### Release Notes
- `/admin` now redirects admins/operators/viewers to `/admin/crm/pipeline`.
- Help/Wiki now includes a dedicated **Release Ledger** section with markdown-backed Release Notes, Changelog, and Delivery Plan articles.
- Wiki content renderer now supports markdown headings (`#`, `##`, `###`) and fenced code blocks.

## 2026-02-28 — Smoke Harness Reliability + Credentialed Login Validation

### Release Notes

## 2026-02-28 — Automated QA Harness + Runtime Logging Hardening

### Release Notes
