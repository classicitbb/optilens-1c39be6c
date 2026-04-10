# Frontend Site Architecture + Routing Plan (2026-03-25)

## Purpose

Establish a single, production-grade routing strategy for the entire frontend (`/`) so every page has a canonical URL, legacy aliases are explicit redirects, and future work remains maintainable and secure.

---

## 1) Observed runtime architecture

## Frontend shells
- **Customer shell** (`/`, `/profile/*`, `/store`, auth pages): rendered through `CustomerShell` in `src/App.tsx`.
- **Admin shell** (`/admin/*`): routed by `src/routes/admin/AdminRoutes.tsx` and protected by `AdminProtectedRoute`.
- **Moonshot shell** (`/admin/moonshot/*`): separately routed by `src/routes/moonshot/MoonshotRoutes.tsx` and protected by `AdminProtectedRoute`.
- **Ops shell** (`/ops/*`): currently redirects into admin dashboard (`/admin/dashboard`).

## Routing sources
- Primary entry router: `src/App.tsx`
- Public marketing/content routes: `src/routes/public/PublicRoutes.tsx`
- Portal/account routes: `src/routes/portal/PortalRoutes.tsx`
- Admin business routes: `src/routes/admin/AdminRoutes.tsx`
- Moonshot routes: `src/routes/moonshot/MoonshotRoutes.tsx`
- Registry metadata and typed redirect catalog: `src/config/routeRegistry.ts`

---

## 2) Canonical frontend route map by segment

> Rule: one canonical route per page; all alternatives are redirect-only.

## A) Public site (marketing + education)

### Core
- Home → `/`
- Knowledge → `/knowledge`
- Legal document → `/legal/:slug`
- Return policy → `/return-policy`

### Lenses
- Lens Types → `/lenses/lens-types`
- Progressive → `/lenses/progressive`
- Office / Occupational → `/lenses/office-occupational`
- Anti-Fatigue → `/lenses/anti-fatigue`
- Single Vision → `/lenses/single-vision`
- Bifocals → `/lenses/bifocals`
- Myopia Control → `/lenses/myopia-control`
- Blue Filter → `/lenses/blue-filter`
- Polarized → `/lenses/polarized`
- Tints / Fashion Colors → `/lenses/tints-fashion-colors`
- Materials → `/lenses/materials`
- Thickness Chart → `/lenses/thickness-chart`

### Coatings
- Mirror → `/coatings/mirror`
- Super AR → `/coatings/ultraclear-ar`
- Blue Defense AR+ (BlueBlock AR) → `/coatings/blueblock-ar`
- Scratch Resistant → `/coatings/scratch-resistant`
- UV Shield → `/coatings/uv-shield`
- Hydrophobic / Oleophobic → `/coatings/hydrophobic-oleophobic`

### Professionals + Patients
- Professionals landing → `/professionals`
- Patients landing → `/patients`
- Find a Retailer → `/find-a-retailer`
- Barbados Retailers → `/find-a-retailer/barbados`
- Patients Night Driving Aids → `/patients/night-driving-aids`
- Dispensing Tips → `/dispensing-tips`
- Chemistrie Lens System → `/professionals/chemistrie-lens-system`
- Tracing / Cutting Guide → `/professionals/tracing-cutting-guide`
- Lab Process Overview → `/professionals/lab-process-overview`
- Lens Ordering Tips → `/professionals/lens-ordering-tips`
- Professionals slug fallback (campaign/content) → `/professionals/:slug`

### Zenvue + Photochromic
- Zenvue Home → `/zenvue`
- Zenvue Brilliance → `/zenvue/brilliance`
- Zenvue Single Vision → `/zenvue/single-vision`
- Zenvue Darkun → `/zenvue/darkun`
- Zenvue Compare → `/zenvue/compare`
- Zenvue Wholesale → `/zenvue/wholesale`
- Photochromic Guide → `/photochromic`

### Public redirects (keep as redirects)
- `/for-professionals` → `/professionals`
- `/professionals/dispensing-tips` → `/dispensing-tips`
- `/lenses` → `/lenses/lens-types`
- `/coatings/mirrors` → `/coatings/mirror`
- `/mirror-finish-guide` → `/coatings/mirror`
- `/coatings/how-ar-coating-works` → `/knowledge#how-ar-coating-works`
- `/coatings/caring-for-coated-lenses` → `/knowledge#caring-for-coated-lenses`
- `/privacy-policy` → `/legal/privacy-policy`
- `/terms` → `/legal/terms`
- `/terms-of-use` → `/legal/terms`
- `/cookie-policy` → `/legal/cookie-policy`
- `/disclaimer` → `/legal/disclaimer`
- `/accessibility` → `/legal/accessibility`
- `/zenvue/sundun` → `/lenses/polarized`

## B) Auth + customer commerce entry
- Auth → `/auth`
- Reset Password → `/reset-password`
- Unsubscribe → `/unsubscribe`
- Store → `/store`

## C) Customer portal (`/profile/*`)
- Portal home → `/profile`
- Account → `/profile/account`
- Orders → `/profile/orders`
- Address Book → `/profile/address-book`
- Payment Methods → `/profile/payment-methods`
- Quotes (feature-gated) → `/profile/quotes`
- Helpdesk (feature-gated) → `/profile/helpdesk`
- Pricelists (feature-gated) → `/profile/pricelists`

### Portal redirects
- `/orders` → `/profile/orders`
- `/portal` → `/profile`

## D) Admin console (`/admin/*`)

### Dashboard
- Dashboard Home → `/admin/dashboard`

### Pricing
- Product Catalog → `/admin/pricing/catalog`
- RX Lens Prices → `/admin/pricing/rx-lenses`
- Stock Lens Prices → `/admin/pricing/stock-lenses`
- Supplies Prices → `/admin/pricing/supplies`
- Lens Catalog Builder → `/admin/pricing/publisher`
- Catalog Builder Editor → `/admin/pricing/publisher/:id`
- Import Costings → `/admin/pricing/costings`
- Costing Detail (new) → `/admin/pricing/costings/new`
- Costing Detail → `/admin/pricing/costings/:id`
- Costing Reports → `/admin/pricing/costings/reports`
- Reference Data → `/admin/pricing/reference`
- Imports → `/admin/pricing/imports`
- Pricing Settings → `/admin/pricing/settings`

### Sales
- Proposals → `/admin/sales/proposals`
- Quotations → `/admin/sales/quotations`
- Quotation Editor → `/admin/sales/quotations/:id`
- Quotation Print Preview → `/admin/sales/quotations/:id/print-preview`
- Web Orders → `/admin/sales/web-orders`
- RX Orders → `/admin/sales/rx-orders`

### Contacts
- All Contacts → `/admin/contacts`
- Tags Config → `/admin/contacts/config/tags`
- Industries Config → `/admin/contacts/config/industries`

### Leads
- My Leads → `/admin/leads`
- Lead Finder → `/admin/leads/finder`
- Campaigns & Sequences → `/admin/leads/campaigns`
- Audit Reports → `/admin/leads/reports`
- AI Assistant → `/admin/leads/ai`
- Lead Settings → `/admin/leads/settings`

### CRM
- Dashboard → `/admin/crm/dashboard`
- Pipeline → `/admin/crm/pipeline`
- Activities → `/admin/crm/activities`

### Helpdesk
- Overview → `/admin/helpdesk/overview`
- Tickets → `/admin/helpdesk/tickets`
- Teams → `/admin/helpdesk/teams`
- SLA Policies → `/admin/helpdesk/sla`
- Stages → `/admin/helpdesk/stages`
- Config → `/admin/helpdesk/config`

### Website
- Pages/Content → `/admin/website/content`
- Feature Pages → `/admin/website/features`
- Patient Portals → `/admin/website/portals`
- Store/Products → `/admin/website/store`

### Knowledge
- Wiki → `/admin/knowledge/wiki`

### Settings
- Company → `/admin/settings/company`
- Users → `/admin/settings/users`
- Roles & Permissions → `/admin/settings/roles`
- Audit Log → `/admin/settings/audit`
- Integrations → `/admin/settings/integrations`
- Runtime Errors → `/admin/settings/runtime-errors`

## E) Moonshot leadership app (`/admin/moonshot/*`)
- Dashboard → `/admin/moonshot/dashboard`
- Workspace → `/admin/moonshot/workspace`
- Meetings → `/admin/moonshot/meetings`
- New Meeting → `/admin/moonshot/meetings/new`
- Meeting Detail → `/admin/moonshot/meetings/:meetingId`
- Scorecards → `/admin/moonshot/scorecards`
- Rocks → `/admin/moonshot/rocks`
- Todos → `/admin/moonshot/todos`
- Issues → `/admin/moonshot/issues`
- Business Plan → `/admin/moonshot/business-plan`
- Tools Home → `/admin/moonshot/tools`
- Org Chart Tool → `/admin/moonshot/tools/org-chart`
- One-on-Ones Tool → `/admin/moonshot/tools/one-on-ones`
- Right Person Right Seat Tool → `/admin/moonshot/tools/right-person-right-seat`
- Users → `/admin/moonshot/users`
- Resources → `/admin/moonshot/resources`
- Settings → `/admin/moonshot/settings`
- Feedback Placeholder → `/admin/moonshot/feedback`

## F) Ops surface
- `/ops/*` currently redirects to `/admin/dashboard`
- Recommendation: keep redirect until Ops has dedicated screens, then register explicit canonical ops routes.

---

## 3) Unassigned pages (found in `src/pages` but not currently bound to canonical route declarations)

- `src/pages/Orders.tsx` (legacy candidate; currently redirected to `/profile/orders`)
- `src/pages/admin/DashboardPage.tsx`
- `src/pages/admin/LensPricesPage.tsx`
- `src/pages/admin/costings/ShipmentListPage.tsx`
- `src/pages/admin/erp/ErpPlaceholderPage.tsx`
- `src/pages/admin/helpdesk/HelpdeskModulePage.tsx`
- `src/pages/admin/helpdesk/HelpdeskSlaPage.tsx`

Recommendation:
1. Assign each live page to a canonical route or formally deprecate it.
2. For deprecated pages, keep explicit redirect mappings and remove dead components after verification.

---

## 4) Frontend architecture, design, and flow (target governance)

## Architecture model
- **Routing layer:** centralized per domain route files, with `src/config/routeRegistry.ts` as typed metadata source.
- **Shell/layout layer:** customer shell vs admin shell vs moonshot shell with strict auth boundaries.
- **Page composition layer:** thin pages that compose domain features.
- **Feature/domain layer:** business logic in `src/features/**` and `src/domain/**`.
- **Shared UI layer:** reusable components in `src/components/**` with consistent accessibility and error states.

## Navigation and flow
- Entry to frontend chooses shell by URL prefix.
- Auth + authorization wrappers enforce least-privilege access.
- Sidebar/app-launcher navigation in admin must map 1:1 to routable pages.
- Legacy links must remain stable through redirect-only aliases.
- Unknown routes should resolve to deterministic fallback (not ambiguous state).

## Robustness + security standards
- One canonical route owner per page.
- Route-to-page parity checks in CI (no dead routes, no orphan pages).
- Guard privileged routes with explicit admin checks.
- Keep legal/privacy redirects version-controlled and auditable.
- Prefer typed route metadata and avoid ad hoc hardcoded path strings.

---

## 5) Should website products be in their own page?

**Yes. Keep website products as a dedicated page (`/admin/website/store`).**

Why this is the strongest default:
1. Product ops and CMS content editing are different workflows and permission models.
2. Separation improves maintainability and auditability.
3. It minimizes accidental coupling when catalog/inventory logic grows.
4. It supports future commerce integrations without destabilizing content tools.

Implementation guardrail:
- Keep shared assets/components (media, SEO blocks), but maintain separate route controllers and feature boundaries.

---

## 6) Execution plan

1. Build a route parity test that compares:
   - route declarations (`src/routes/**`),
   - route registry (`src/config/routeRegistry.ts`),
   - existing pages (`src/pages/**`).
2. Resolve unassigned pages by either route assignment or deprecation.
3. Normalize legacy redirects in route registry and consume them from route modules.
4. Add PR checklist requirements: canonical route, nav placement, auth guard, analytics ID, tests.
5. Preserve current URL hierarchy and aliases during cleanup to avoid breaking external links.
