# Frontend Runtime Module Docs

Operational notes and change context for code in `src/**`.

## 2026-07-22 — Staff public networking cards

- Canonical public route: `/connect/:slug`, registered in both `PublicRoutes.tsx` and `routeRegistry.ts`. Only explicitly published cards can be returned to anonymous visitors.
- `staff_public_cards` is a separate public projection; do not read `profiles` directly from the public page because it also contains portal and CRM linkage fields.
- Staff open `/profile/networking-card` from the **Share my card** action on the profile home screen. The page provides an event-sized QR code, native share/copy actions, and self-service editing.
- Admin → Settings → Users exposes QR-preview and ID-card editor actions for internal staff roles. The shared editor preserves the same card shape and publish controls for self-service and admin configuration.

## 2026-07-19 — Contacts access deployment

- `ContactsPage` exposes the Contacts-first **Deploy access** dialog and first-use training nudge. The assistant searches CRM contacts and ERP customer accounts, deliberately surfaces account ambiguity, and routes no-match cases to contact-only creation.
- `AccessDeploymentAssistantDialog` can link a chosen existing login, send an invite, set a temporary password, assign an explicitly selected internal role, and optionally approve portal access after the customer link is confirmed.
- `admin-user-management` now returns login verification state and supports the explicit `link-customer-portal-account` action. The client request policy requires an admin, UUID-shaped user/contact IDs, and a positive customer ID.

## 2026-07-18 — Integration status recovery

- `IntegrationsPage` persists the outcome of its zero-impact Scotia credential/hash test through `record_payment_gateway_test`; a successful test clears a stale error badge and a failed test records an error timestamp.
- `InnovationsSyncStatusCard` has an on-demand status recheck. It does not mutate customer links: duplicate account-number warnings remain visible until the underlying source data is corrected, then disappear on refresh.

## 2026-07-16 — Portal statements and local live-data access

- `AccountSidebar` uses `canAccessFeature("statements")`, which keeps the sidebar and the canonical `/profile/statements` feature gate aligned. A staff role is not required for an approved customer unless an explicit feature override disables statements.
- The shared Edge Function CORS policy allows the local Vite origins on port 8081. This is needed because the portal browser client sends authenticated `live-data-gateway` requests directly to Supabase; a rejected preflight appears to the UI as a generic Edge Function transport failure.
- `AccountSidebar.test.tsx` covers enabled and disabled Statements navigation, while `liveDataGatewayCors.integration.test.ts` guards the port-8081 CORS allowlist.

## 2026-07-14 — Website Portals and Contacts

- `/admin/website` is a redirect to `/admin/website/portals`; Website Content remains available at its explicit route.
- `WebsitePortalsPage` prefers `profiles.email`, which is synchronized from the signup identity, before using the optional admin user-list email.
- The Contacts editor supports an embedded mode so Website Portals can open the same editor overlay for a linked CRM contact without route navigation. Customer Contact is the canonical editable record; Website Portals remains an activity/access surface.
- The embedded editor now has a Portal Settings tab containing operations, orders, addresses, payments, and support. Normal row clicks choose that tab; row context-menu actions select Details, Portal Settings, emulation, or login creation deliberately.

## 2026-07-13 — Specialty Lenses public page

- Canonical public route: `/lenses/specialty`; it is registered in `src/routes/public/PublicRoutes.tsx` and `src/config/routeRegistry.ts`, with coverage in `src/tests/integration/publicRouteAccessibility.integration.test.ts`.
- `src/data/specialtyLenses.ts` provides the typed, reusable card content and selected-lens action URLs. The existing price-request and LabLink routes do not yet consume `selectedLens`; it is retained as a URL handoff for the future integration rather than treated as a completed preselection API.
- `SpecialtyLensesPage` uses one collapsible Radix accordion item at a time. Its controls retain keyboard support, focus treatment, and `aria-expanded`/`aria-controls` semantics from the shared primitive.
- The shared header labels the third Lenses column as House Brands and renders the mobile menu as a full-screen `bg-background/80 backdrop-blur-md` sheet, matching the desktop mega-menu treatment without a visible dark scrim.

## 2026-07-13 — Innovations EFT bank payment routing

- `BankPaymentPortalsPage` displays the read-only Innovations EFT institution directory using its immutable source ID. Source-managed names are disabled in the edit dialog so the exact `customers.eft_institution_name` match cannot drift; admins can still curate the sign-in URL and notes.
- `StatementsSection` opens a bank page only for an EFT customer whose matching portal record has a verified `http(s)` URL. A mapped source bank with no URL deliberately takes the existing support fallback rather than opening a blank or unrelated destination.

## 2026-07-13 — Admin email previews

- Canonical admin route: `/admin/settings/email-previews`; it is registered in `src/routes/admin/AdminRoutes.tsx`, `src/config/routeRegistry.ts`, and the Settings sidebar app configuration.
- `EmailPreviewsPage` keeps a static, source-aligned catalog of six authentication and eight application templates. It is intentionally a review surface: editable sample values change only the local preview, while live send templates remain server-side and source-managed.
- `src/tests/integration/adminEmailPreviewsRouteAccessibility.integration.test.ts` enforces route registry, runtime route, and navigation alignment.

## 2026-07-13 — Safe storefront product reads

- `src/hooks/useStoreProducts.ts` loads lenses, supplies, and add-ons through `get_lenses_safe`, `get_supplies_safe`, and `get_addons_safe` RPCs rather than querying the cost-bearing base tables or public views.
- The public store renders sell prices for anonymous visitors, while the product card has no cost-field rendering path.
- `src/tests/e2e/anonStorefrontCostSafety.e2e.test.tsx` covers the anonymous `/store` page with a cost-shaped input payload and asserts that only the sell price reaches the DOM.

## 2026-07-11 — Portal financial and order status data

- `StatementsSection` consumes real posted Innovations statements. It presents statement ID, volume discount, due date, aging buckets, financial totals, and transaction rows with order/payment references.
- `MyOrdersSection` requests the identity-scoped `innovations.customer_orders` live-gateway operation. The portal renders four customer-facing columns—Rx number, patient, received date, and status—sourced from MSSQL-SVR through OptiLens Local; shipment tracking remains a separate panel.
- The order query mirrors the lab WIP view: active Rx/stock jobs plus non-cancelled terminating shipments created on the current MSSQL server date. The delivery request uses `include_open: true` with a 30-day `closed_since` boundary, so older open shipments remain visible.
- Shipments are expandable portal tiles. The local connector may return per-shipment `orders`, `tracking_number`, and an `http(s)` `tracking_url`; the frontend rejects non-web tracking links before rendering them.
- `AccountLayout` uses a wider responsive container and adaptive sidebar width so account pages use large screens without compressing the portal content.
- The browser never submits an LMS account number. The Edge Function resolves the signed-in user's mapped customer record before queuing the on-premises lookup.
- `MyAccountSection` obtains the account number only through `get_portal_erp_account_number()`, a signed-in-user-scoped RPC. The displayed value is source-managed and is not part of the editable profile form.

## 2026-06-24 — Security hardening support tests

- Product-cost exposure is guarded at the database policy layer: storefront product reads use the `get_*_safe` RPCs, while legacy cost-free views must never be replaced with direct base-table reads.
- Staff admin product editors still read/write the base product tables through `has_edit_role()` access.
- Runtime website analytics still uses direct public inserts for pageviews and web vitals, but rows must match the stricter migration checks for visitor IDs, paths, metric names, ratings, and bounded numeric values.
- Auth onboarding tests now fill the required country field and mock Select primitives in the unit test so jsdom does not depend on Radix dropdown scrolling behavior.

## 2026-04-13 — LED PRO route + admin rendering updates

- Canonical public route added: `/lenses/led-pro`.
- Route wiring stays centralized across `src/routes/public/PublicRoutes.tsx` and `src/config/routeRegistry.ts`, with accessibility coverage added in `src/tests/integration/publicRouteAccessibility.integration.test.ts`.
- Shared discovery surfaces were updated to point at the same runtime page: `Header`, `LensDesignGuidePage`, `knowledgeCenter`, and `siteSearchIndex`.
- `src/pages/lenses/LedProPage.tsx` now uses an embedded live demo in the hero watch panel, avoiding dependence on a locally merged MP4 during page rendering.
- `src/pages/admin/helpdesk/HelpdeskSlaPoliciesPage.tsx` now sanitizes stored rich-text HTML before rendering policy descriptions, preserving the shared rich-text rendering path while reducing unsafe markup risk.
- `src/components/admin/PdfPreviewShell.tsx` now initializes `manualZoom` to `1`, which keeps preview behavior aligned with an explicit baseline zoom state instead of a nullable first render.
