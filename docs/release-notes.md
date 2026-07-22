# Release Notes

Summarized release outcomes for each major date-stamped update.

## 2026-07-22 — Staff Public Networking Cards

### Release Notes
- Staff can publish a shareable digital business card at `/connect/:slug` with selected email, WhatsApp, phone, skills, and links.
- Event sharing is one tap from the staff profile home screen through **Share my card**, which displays the public-card QR code.
- Administrators can preview or configure a staff member's card directly from Admin → Settings → Users using the QR and ID-card row actions.

## 2026-07-19 — Contacts Access Deployment Assistant

### Release Notes
- Admins can open **Deploy access** from Contacts to provision customer portal or internal staff access without navigating among Contacts, Users, and Website Portals.
- The flow searches by person, email, or account number; it never silently chooses a customer or links an existing login.
- **Access training** provides first-use sandbox scenarios, exception guidance, and an operations follow-up template.

## 2026-07-18 — Integration Status Recovery and Dependency Refresh

### Release Notes
- Administrators can recheck the payment gateway and clear a stale error only after a successful zero-impact credential test.
- Innovations sync status can be refreshed on demand; duplicate account-number links disappear from the warning once the underlying records are resolved.

## 2026-07-16 — Portal Statements and Live Order Status

### Release Notes
- Approved customer accounts can open Statements; only an explicit statements-feature disablement keeps the link locked.
- The local portal server at `http://localhost:8081` can call the live-data gateway, so the live order and delivery panels no longer fail with the generic Edge Function transport message during local public-site testing.

## 2026-07-14 — Website Portal Contact Editing

### Release Notes
- Opening Admin → Website now lands on Website Portals.
- Choose a customer from Website Portals to edit their contact and Innovations account linkage in the familiar Contacts modal without leaving the page.
- Portal accounts now display the email stored for the website signup even when the admin user-list service is unavailable.
- A normal row click opens Portal Settings in that same modal. Right-click a row for direct Contact, Portal, Emulate, or Create login actions.

## 2026-07-13 — Specialty Lenses

### Release Notes
- Added a Specialty Lenses page for Endless Pilot Progressive and OmniLux NAL, with expandable on-page information instead of separate product pages.
- The page is available under Lifestyle Lenses. The desktop column now reads House Brands, and the mobile menu opens as a full-screen frosted panel.

## 2026-07-13 — Innovations EFT Bank Portal Directory

### Release Notes
- Bank Payment Portals automatically receives the exact bank names configured in Innovations for EFT customers.
- Customers are sent only to verified online-banking destinations; the system shows a support fallback when a source value is a placeholder, non-retail institution, or otherwise lacks a verified sign-in page.

## 2026-07-13 — Admin Email Preview Center

### Release Notes
- Settings now includes Email Previews, a split workspace for reviewing all active auth and application emails.
- Operators can switch between templates and change sample name, recipient, and subject values to review personalized preview copy without sending messages.

## 2026-07-13 — Storefront Cost-Access Regression Guard

### Release Notes
- Public storefront prices render for anonymous visitors through safe product RPCs.
- Cost-bearing base tables remain inaccessible to anonymous and non-editor authenticated users, with CI blocking unsafe migration changes.

## 2026-07-11 — Portal Statements and Order Status

### Release Notes
- Statements show only real posted Innovations records, including aging buckets, statement totals, and itemized financial activity.
- My Orders now shows active Innovations WIP and valid same-day shipments from MSSQL-SVR using only Rx number, patient, received date, and current status; existing delivery tracking remains available.
- The sign-in form has a clearer modern layout, inline password-reset access, and a show/hide password control.
- My Account now displays the linked ERP account number (or `ACC#` until one is linked) and places Sign out beside Save Changes.
- Open shipment records remain visible regardless of age; closed deliveries remain available for 30 days and can expand to show shipment work and an export tracking link when supplied.
- Customers can jump to each order section from live count pills, search active lab work by patient or Rx number, and use the wider responsive account layout.

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
