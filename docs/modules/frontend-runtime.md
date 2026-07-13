# Frontend Runtime Module Docs

Operational notes and change context for code in `src/**`.

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
