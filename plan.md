# Admin IA + Routing Plan (2026-03-25)

## Objectives

1. Define a canonical `/admin` route map so every existing page component has an intentional URL.
2. Preserve backwards compatibility with existing legacy URLs through redirects.
3. Clarify architecture, navigation design, and module flow so future development remains consistent.
4. Set a robust governance baseline for secure, maintainable, production-ready admin expansion.

---

## Current admin structure (observed)

### Routing shell
- **Primary shell router:** `src/routes/admin/AdminRoutes.tsx` (React Router, lazy page loading, redirects).
- **App/nav registry:** `src/features/admin/core/config/apps.ts` (defines app segments, sidebar items, default routes).

### Page layers
- **Routed pages:** `src/pages/admin/**` (most admin screens).
- **Feature modules/state/hooks:** `src/features/admin/**`.
- **Shared admin components/layout/auth wrappers:** `src/components/admin/**`.

### Parallel Moonshot implementation
- There is a second Moonshot tree under `app/admin/moonshot/**` (App Router-style structure), while primary `/admin` runtime routing is currently driven by `src/routes/admin/AdminRoutes.tsx`.
- For maintainability, keep one canonical runtime route source for the active shell and treat other trees as migration artifacts until formally switched.

---

## Canonical route recommendations by admin segment

> Principle: one canonical route per page, stable aliases only as redirects.

### 1) Dashboard
- `Dashboard Home` → `/admin/dashboard`

### 2) Pricing
- `Product Catalog` → `/admin/pricing/catalog`
- `RX Lens Prices` → `/admin/pricing/rx-lenses`
- `Stock Lens Prices` → `/admin/pricing/stock-lenses`
- `Supplies Prices` → `/admin/pricing/supplies`
- `Lens Catalog Builder` → `/admin/pricing/publisher`
- `Catalog Builder Editor` → `/admin/pricing/publisher/:id`
- `Import Costings` → `/admin/pricing/costings`
- `Costing Detail (new)` → `/admin/pricing/costings/new`
- `Costing Detail` → `/admin/pricing/costings/:id`
- `Costing Reports` → `/admin/pricing/costings/reports`
- `Reference Data` → `/admin/pricing/reference`
- `Imports` → `/admin/pricing/imports`
- `Pricing Settings` → `/admin/pricing/settings`

### 3) Sales
- `Proposals` → `/admin/sales/proposals`
- `Quotations` → `/admin/sales/quotations`
- `Quotation Editor` → `/admin/sales/quotations/:id`
- `Quotation Print Preview` → `/admin/sales/quotations/:id/print-preview`
- `Web Orders` → `/admin/sales/web-orders`
- `RX Orders` → `/admin/sales/rx-orders`

### 4) Contacts
- `All Contacts` → `/admin/contacts`
- `Tags Config` → `/admin/contacts/config/tags`
- `Industries Config` → `/admin/contacts/config/industries`

### 5) Leads
- `My Leads` → `/admin/leads`
- `Lead Finder` → `/admin/leads/finder`
- `Campaigns & Sequences` → `/admin/leads/campaigns`
- `Audit Reports` → `/admin/leads/reports`
- `AI Assistant` → `/admin/leads/ai`
- `Lead Settings` → `/admin/leads/settings`

### 6) CRM
- `CRM Dashboard` → `/admin/crm/dashboard`
- `Pipeline` → `/admin/crm/pipeline`
- `Activities` → `/admin/crm/activities`

### 7) Helpdesk
- `Overview` → `/admin/helpdesk/overview`
- `Tickets` → `/admin/helpdesk/tickets`
- `Teams` → `/admin/helpdesk/teams`
- `SLA Policies` → `/admin/helpdesk/sla`
- `Stages` → `/admin/helpdesk/stages`
- `Config` → `/admin/helpdesk/config`

### 8) Website
- `Pages / Content` → `/admin/website/content`
- `Feature Pages` → `/admin/website/features`
- `Patient Portals` → `/admin/website/portals`
- `Store / Products` → `/admin/website/store`

### 9) Knowledge
- `Wiki` → `/admin/knowledge/wiki`

### 10) Settings
- `Company` → `/admin/settings/company`
- `Users` → `/admin/settings/users`
- `Roles & Permissions` → `/admin/settings/roles`
- `Audit Log` → `/admin/settings/audit`
- `Integrations` → `/admin/settings/integrations`
- `Runtime Errors` → `/admin/settings/runtime-errors`

### 11) Moonshot (recommended to fully register in admin router)
Current sidebar entries are defined, but route registration in `AdminRoutes.tsx` should explicitly include:

- `Dashboard` → `/admin/moonshot/dashboard`
- `Workspace` → `/admin/moonshot/workspace`
- `Meetings` → `/admin/moonshot/meetings`
- `Meeting Detail` → `/admin/moonshot/meetings/:meetingId`
- `New Meeting` → `/admin/moonshot/meetings/new`
- `Scorecards` → `/admin/moonshot/scorecards`
- `Rocks` → `/admin/moonshot/rocks`
- `Todos` → `/admin/moonshot/todos`
- `Issues` → `/admin/moonshot/issues`
- `Business Plan` → `/admin/moonshot/business-plan`
- `Tools Home` → `/admin/moonshot/tools`
- `Org Chart` → `/admin/moonshot/tools/org-chart`
- `One-on-Ones` → `/admin/moonshot/tools/one-on-ones`
- `Right Person Right Seat` → `/admin/moonshot/tools/right-person-right-seat`
- `Users` → `/admin/moonshot/users`
- `Resources` → `/admin/moonshot/resources`
- `Settings` → `/admin/moonshot/settings`

---

## Unassigned/legacy pages to resolve

The following page components exist but are not currently assigned as canonical routes in the main admin router:

- `src/pages/admin/DashboardPage.tsx`
- `src/pages/admin/LensPricesPage.tsx`
- `src/pages/admin/costings/ShipmentListPage.tsx`
- `src/pages/admin/erp/ErpPlaceholderPage.tsx`
- `src/pages/admin/helpdesk/HelpdeskModulePage.tsx`
- `src/pages/admin/helpdesk/HelpdeskSlaPage.tsx`
- `src/pages/admin/moonshot/*` (entire moonshot page set in src tree)

Recommendation:
1. Assign each live page to a canonical route.
2. Convert duplicates to redirects or remove after migration verification.
3. Keep legacy aliases only where needed for backward links/bookmarks.

---

## Site architecture, design, and flow (target model)

## 1) Architecture model
- **Presentation shell:** Admin layout + app launcher + sidebar/nav.
- **Route layer:** Canonical route declarations in one file/module (single source of truth).
- **Page layer:** Thin page components handling composition.
- **Feature layer:** Domain logic in `src/features/admin/<domain>`.
- **Shared component layer:** Reusable admin UI components in `src/components/admin`.
- **Data layer:** API clients/hooks and state stores per domain.

## 2) Navigation design rules
- Top-level IA by business domain (Pricing, Sales, Contacts, Leads, CRM, Helpdesk, Website, Knowledge, Settings, Moonshot).
- Every domain has:
  - `baseRoute`
  - `defaultRoute`
  - typed sidebar menu entries.
- No orphan pages: every view must be reachable from at least one deterministic URL.

## 3) Flow rules
- **Entry:** `/admin` redirects to `/admin/dashboard` or selected default context.
- **Domain switch:** App launcher changes domain but preserves auth + shell context.
- **Page flow:** Sidebar route change updates content panel only (layout remains stable).
- **Fallback:** Unknown admin paths redirect to canonical dashboard.
- **Authz:** sensitive pages guarded with admin-only wrappers.

## 4) Robustness rules
- Keep canonical route map and sidebar config in sync (CI lint/check recommended).
- For each new page require:
  - explicit canonical route,
  - navigation placement,
  - auth guard decision,
  - analytics/event label,
  - test coverage for route access.
- Avoid parallel router systems for the same runtime shell.

---

## Should website products be on their own page?

**Recommendation: Yes — keep Website Products as its own dedicated page (`/admin/website/store`) with a specialized product-management UI.**

Why this is best:
1. Product workflows (pricing sync, media, inventory, merchandising, variants) are operationally different from CMS page editing.
2. Separation improves permissioning (content editors vs commerce operators).
3. It keeps information architecture clearer and reduces accidental cross-impact.
4. It scales better for future commerce integrations and audit requirements.

Implementation guidance:
- Keep lightweight cross-links between `/admin/website/content` and `/admin/website/store`.
- Share reusable assets (media picker, SEO metadata blocks), but keep separate page controllers.

---

## Execution plan for route hardening

1. Add missing Moonshot route registrations to the canonical admin router.
2. Decide canonical owners for duplicated/legacy pages; redirect old paths.
3. Add a route-registry test that asserts:
   - every sidebar route resolves to a page/redirect,
   - no dead links,
   - no duplicate canonicals.
4. Add docs update checklist to PR template (routing + nav + authz + tests).

