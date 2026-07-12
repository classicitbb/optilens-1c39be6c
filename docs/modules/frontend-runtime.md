# Frontend Runtime Module Docs

Operational notes and change context for code in `src/**`.

## 2026-07-10 — Smart customer journey runtime

- `/` renders `SmartHome` for public visitors, persists the audience preference under `classicvisions.home.audience`, and redirects authenticated customers to `/profile` unless staff explicitly request `/?view=public`.
- Canonical runtime routes are `/lens-assistant`, `/profile/rx-drafts/:draftId`, and `/admin/website/store/lens-assistant`; route metadata remains synchronized in `src/config/routeRegistry.ts`.
- `Profile` uses `get_customer_command_center()` as the one-call path and falls back to existing customer-safe queries when the migration is not yet deployed.
- Lens validation lives in `src/features/lens-assistant/validation.ts`; recommendations and prices are accepted only from `recommend_lenses(jsonb)` tool results.
- `LabLinkEmbedPage` reads the draft query parameter and displays a non-submission summary without requiring clipboard access for ordinary data entry.
- Public company contact details are centralized in `src/config/companyContact.ts` and reused by footer, statements, and homepage surfaces.
- At phone widths the shared header keeps the logo on one line and reduces sign-in/shop actions to accessible icon buttons so the smart journey is not clipped.
- The smart homepage ends with the shared site footer, preserving company, support, legal, social, address, and contact navigation below the compact action-first experience.

## 2026-07-11 — Portal financial and order status data

- `StatementsSection` consumes real posted Innovations statements. It presents statement ID, volume discount, due date, aging buckets, financial totals, and transaction rows with order/payment references.
- `MyOrdersSection` requests the identity-scoped `innovations.customer_orders` live-gateway operation. The portal renders order status rows sourced from MSSQL-SVR through OptiLens Local; shipment tracking remains a separate panel.
- The order-status request uses `status_scope: "active"`, which includes unshipped work and work in an open shipment but excludes work after its Innovations shipment closes. The delivery request uses `include_open: true` with a 30-day `closed_since` boundary, so older open shipments remain visible.
- Shipments are expandable portal tiles. The local connector may return per-shipment `orders`, `tracking_number`, and an `http(s)` `tracking_url`; the frontend rejects non-web tracking links before rendering them.
- `AccountLayout` uses a wider responsive container and adaptive sidebar width so account pages use large screens without compressing the portal content.
- The browser never submits an LMS account number. The Edge Function resolves the signed-in user's mapped customer record before queuing the on-premises lookup.

## 2026-06-24 — Security hardening support tests

- Product-cost exposure is guarded at the database policy layer: browser-facing catalog/product flows should continue to read `addons_public`, `lenses_public`, `supplies_public`, and other cost-free customer views.
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
