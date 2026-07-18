# Frontend Bug Reports

Track frontend regressions and customer-facing issues.

## 2026-07-18
- Area: Admin → Settings → Integrations
- Impact: gateway errors could remain visible after a configuration was repaired because the test operation did not persist its outcome; Innovations duplicate warnings had no manual refresh path.
- Resolution: gateway tests now record their success/failure state and time through an admin-only RPC, and the Innovations card provides a non-destructive on-demand recheck. Duplicate warnings clear only when the backing duplicate view is empty.

## 2026-07-16
- Area: customer portal Statements navigation and My Orders live panels
- Impact: an approved customer could still see Statements locked because the sidebar required a staff role, and local public-site testing on port 8081 showed generic Edge Function failures in both live order-status panels.
- Root cause: the sidebar bypassed the shared `statements` feature decision, while the shared Edge Function CORS policy did not recognize the local port-8081 origin. The browser therefore hid the CORS rejection as a transport failure.
- Resolution: Statements now follows `canAccessFeature("statements")`, and the shared CORS policy permits `localhost` and `127.0.0.1` on port 8081. Regression tests cover both access state and the CORS allowlist.

## 2026-07-14
- Area: Website Portals customer editing
- Impact: selecting a customer navigated admins away from Website Portals into a separate Contacts page, while the portal dialog duplicated profile/account edits and could display an empty email when the optional admin user-list request was unavailable.
- Resolution: Website Portals now opens the shared Contacts editor in place and reads the signup-synchronized profile email. The Website parent route now opens the Portals workspace first.
- Follow-up: keep customer identity, Innovations linkage, and optional portal access in the shared Customer Contact edit surface; do not add a competing editable portal profile.

## 2026-07-14
- Area: Website Portals row actions and shared customer editing
- Impact: portal settings were not visible after the contact editor became the in-place surface, and admins had no concise way to choose contact editing, portal editing, emulation, or account creation from a customer row.
- Resolution: moved portal operations, orders, addresses, payments, and support into the shared Contact modal's Portal Settings tab. Normal clicks select that tab; a right-click menu exposes the four account-specific actions.

## 2026-07-13
- Area: public lens navigation and mobile menu
- Impact: specialty lens information had no single discoverable public page, the branded-lens column used an outdated heading, and the mobile menu left a dark partial-screen scrim rather than matching the site's frosted mega-menu presentation.
- Resolution: added the accessible `/lenses/specialty` accordion page with typed content for Endless Pilot Progressive and OmniLux NAL, linked it under Lifestyle Lenses, renamed the heading to House Brands, and made the mobile sheet full-screen with the shared translucent blurred surface.
- Follow-up: if the pricing request or LabLink flow gains a lens-preselection API, consume the existing `selectedLens` URL value at the destination before removing the documented integration boundary.

## 2026-07-13
- Area: EFT statement payment routing
- Impact: the bank-payment directory was manual-only, so a newly configured Innovations EFT institution could leave a customer without a matching payment destination; forcing every source record to a URL also risked redirecting legacy placeholder values to an unrelated bank.
- Resolution: OptiLens Local now synchronizes `dbo.EFTInstitutions` by immutable ID while preserving the exact source display name. Verified retail sign-in URLs are seeded, source-managed names cannot be edited, and rows with no verified customer sign-in endpoint retain the existing support fallback.
- Follow-up: confirm a new source institution's customer login page before adding its URL; do not use a generic bank homepage as a payment redirect.

## 2026-07-13
- Area: admin settings email operations
- Impact: administrators previously had no single, safe interface to identify or inspect the authentication and transactional email templates configured by the application.
- Resolution: added `/admin/settings/email-previews` with a route-tested split list/preview workspace, source-path visibility, and sample-only personalization controls. No email is sent or altered from the review screen.
- Follow-up: keep this catalog synchronized when an auth template or the transactional template registry gains a new entry.

## 2026-07-13
- Area: public storefront product catalog
- Impact: a storefront data-source regression could query cost-bearing product tables directly, or a product-card change could render cost-shaped values to anonymous visitors.
- Root cause: public catalog access had drifted between views and direct base-table policies without an end-to-end DOM regression guard.
- Resolution: route storefront reads through safe RPCs and cover the anonymous page with a product payload containing sentinel cost values that must not render.
- Follow-up: retain the safe RPC boundary and update `anonStorefrontCostSafety.e2e.test.tsx` when product-card rendering changes.

## 2026-07-11 — Closed issues

### Account profile hid the ERP account number and required navigation to sign out
- Surface: customer My Account
- Symptom: customers could not confirm their linked ERP account from the profile form, and Sign out was only available through the account menu.
- Resolution: My Account now displays the source-managed account number (or `ACC#` until linked) and provides a Sign out button next to Save Changes.

### Portal order-status list did not match the lab WIP report
- Surface: customer My Orders
- Symptom: the portal returned broad historical order rows and exposed extra internal columns instead of the active WIP and valid same-day shipments in the lab report.
- Resolution: the local MSSQL connector now uses the report's active-job and valid-terminating-shipment filters for the identity-mapped customer, and sends only Rx number, patient, received date, and status to the portal.

### Sign-in form was visually dated and had no password visibility control
- Surface: `/auth?mode=signin`
- Symptom: the compact form made the sign-in flow feel disconnected from the current portal UI and required blind password entry.
- Resolution: rebuilt the sign-in presentation with a focused card, larger form controls, inline reset-password access, and a keyboard-accessible show/hide password button.

### Synthetic current-period statement presented as a posted statement
- Surface: customer Statements & Billing
- Symptom: the newest entry was calculated from balance data and had no source statement ID or line items.
- Resolution: portal selection now contains only posted Innovations statements; live balance remains separate.

### Shipment tracking used where live order status was required
- Surface: customer My Orders
- Symptom: the live panel showed shipment sessions rather than the current LMS order status.
- Resolution: added a separate MSSQL-backed Innovations Order Status table without removing shipment tracking.

### Older open shipment omitted from customer delivery status
- Surface: customer My Orders
- Symptom: the delivery panel applied a 90-day cutoff, hiding still-open shipment 10419 and preventing customers from expanding a shipment to inspect its work.
- Resolution: the live request now asks for all open shipments plus closed deliveries from the last 30 days; shipment rows expand to show supplied order/item details and a tracking link.

## 2026-06-24 — Closed issues

### Product cost columns readable through direct table SELECT
- Surface: Supabase RLS for `addons`, `lenses`, and `supplies`
- Symptom: authenticated viewer/customer roles could read base product tables that include cost-bearing fields.
- Resolution: replaced broad role SELECT policies with editor-role SELECT policies and preserved cost-free public views for customer-safe browsing.

### Public analytics tables accepted unrestricted insert payloads
- Surface: website analytics runtime tables
- Symptom: public INSERT policies accepted arbitrary rows with `WITH CHECK (true)`.
- Resolution: tightened INSERT policies with visitor ID, token, path, metric, rating, device, and value checks while leaving normal public analytics ingestion enabled.

### API v1 lint blocked by merge-conflict marker
- Surface: `supabase/functions/api-v1/index.ts`
- Symptom: lint failed on a leftover conflict marker in list ordering fallback logic.
- Resolution: resolved the conflict to a single fallback path that retries `id` ordering only when the caller did not provide an explicit order.

## 2026-04-13 — Closed issues

### SLA policy description HTML rendering risk
- Surface: `/admin/helpdesk/sla-policies`
- Symptom: saved rich-text descriptions were rendered directly into the table cell via `dangerouslySetInnerHTML`.
- Resolution: route description HTML through `sanitizeRichTextHtml` before render so published policy copy still displays but unsafe markup is filtered.

### PDF preview initial zoom ambiguity
- Surface: admin PDF preview shell
- Symptom: `manualZoom` started as `null`, leaving the first-load zoom state implicit.
- Resolution: initialize `manualZoom` to `1` so preview behavior starts from an explicit 100% baseline and downstream zoom logic reads a concrete value.

### Public LED PRO route coverage gap
- Surface: public lens pages
- Symptom: new lifestyle-lens content needed canonical routing, navigation discoverability, and route-accessibility coverage to avoid orphaned content.
- Resolution: added `/lenses/led-pro` route registration, shared discovery references, and integration assertions for the public route registry plus runtime route declaration.

### LED PRO page merge-conflict regression
- Surface: `/lenses/led-pro`
- Symptom: an interrupted merge left conflict markers in `src/pages/lenses/LedProPage.tsx`, which broke both lint and production build.
- Resolution: resolved the page to a single embedded-demo implementation and restored the page to valid TSX so validation can complete.
