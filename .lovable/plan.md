## Admin Experience Plan (Updated to Current Codebase)

### Plan intent
This plan is now aligned with the **current modular admin architecture** (`/admin/<app>/...`) and the work that already exists in the repository.

---

## 1) Current state snapshot (what is already done)

### 1.1 Admin shell and navigation foundation
- ✅ `ADMIN_APPS` registry is implemented and drives app metadata, default routes, and sidebar items.
- ✅ App Launcher and Sidebar are dynamic and role-filtered.
- ✅ Admin route groups are modularized by app domain:
  - Pricing (`/admin/pricing/*`)
  - Sales (`/admin/sales/*`)
  - Contacts (`/admin/contacts/*`)
  - Leads (`/admin/leads/*`)
  - CRM (`/admin/crm/*`)
  - Helpdesk (`/admin/helpdesk/*`)
  - Website (`/admin/website/*`)
  - Knowledge (`/admin/knowledge/*`)
  - Settings (`/admin/settings/*`)
- ✅ Legacy routes are redirected to the new structure.

### 1.2 Admin Top Bar redesign status
- ✅ Top bar exists with the intended structure:
  - Apps toggle
  - `OpticAdmin` brand label
  - Page label
  - Global search
  - Bell placeholder
  - Help toggle
  - Lovable external link (admin-only)
  - User display name + avatar dropdown
- ✅ User display name resolves from `profiles.display_name` with email fallback.
- ✅ Avatar dropdown includes:
  - Helpdesk / Wiki
  - My Profile
  - Install App
  - Logout

### 1.3 Branding updates
- ✅ `OpticAdmin` branding is present in top bar and wiki content.

---

## 2) Gaps to close (next actions)

### 2.1 Route label map in `AdminTopBar`
The route label map should prioritize **new canonical paths** (`/admin/pricing/...`, `/admin/sales/...`, etc.) first, then include legacy fallbacks only if needed.

**Action**
- Update `ROUTE_LABELS` in `src/components/admin/AdminTopBar.tsx` to match active canonical route paths.

### 2.2 Sidebar/header interaction cleanup
The previous note about removing the sidebar header is not currently implemented.

**Action options (pick one explicitly)**
1. Keep sidebar header + collapse button (document as intentional), or
2. Move collapse behavior to hover/flyout interaction and remove static header row.

### 2.3 Copy consistency for placeholder screens
Current placeholder message is: **"Coming in a future phase."**

**Action**
- Standardize placeholder copy strategy per module (friendly/neutral/enterprise tone), with optional module-specific variants.

---

## 3) Placeholder Pages Delivery Backlog (description-ready)

> Purpose: every placeholder route gets a stable slot so full feature descriptions can be added later.

Use this template for each page as details are discovered:
- **Purpose**
- **Primary users / roles**
- **Core workflows**
- **Data entities**
- **Permissions**
- **Integrations**
- **MVP acceptance criteria**
- **Future phase notes**

### 3.1 Sales app placeholders
1. `/admin/sales/web-orders`
   - Status: Placeholder
   - Description: _TBD_
2. `/admin/sales/rx-orders`
   - Status: Placeholder
   - Description: _TBD_

### 3.2 Leads app placeholders
3. `/admin/leads/finder`
   - Status: Placeholder
   - Description: _TBD_
4. `/admin/leads/campaigns`
   - Status: Placeholder
   - Description: _TBD_
5. `/admin/leads/reports`
   - Status: Placeholder
   - Description: _TBD_
6. `/admin/leads/ai`
   - Status: Placeholder
   - Description: _TBD_
7. `/admin/leads/settings`
   - Status: Placeholder
   - Description: _TBD_

### 3.3 CRM app placeholders
8. `/admin/crm/pipeline`
   - Status: Placeholder
   - Description: _TBD_
9. `/admin/crm/activities`
   - Status: Placeholder
   - Description: _TBD_

### 3.4 Helpdesk app placeholders
10. `/admin/helpdesk/tickets`
    - Status: Placeholder
    - Description: _TBD_
11. `/admin/helpdesk/teams`
    - Status: Placeholder
    - Description: _TBD_
12. `/admin/helpdesk/sla`
    - Status: Placeholder
    - Description: _TBD_

### 3.5 Website app placeholders
13. `/admin/website/microsites`
    - Status: Placeholder
    - Description: _TBD_
14. `/admin/website/portals`
    - Status: Placeholder
    - Description: _TBD_
15. `/admin/website/store`
    - Status: Placeholder
    - Description: _TBD_

### 3.6 Knowledge app placeholders
16. `/admin/knowledge/help`
    - Status: Placeholder
    - Description: _TBD_

### 3.7 Settings app placeholders
17. `/admin/settings/integrations`
    - Status: Placeholder
    - Description: _TBD_

---

## 4) Suggested micro-copy change (quick win)

### Proposal
For `/admin/crm/pipeline`, change placeholder text from:
- **"Coming in a future phase."**

to:
- **"See you soon."**

### Why
- Warmer and less formal tone for a customer-facing-feeling CRM surface.
- Good as an experiment for module-specific placeholder messaging.

### Implementation approach
- Preferred: add an optional copy override map in `PlaceholderPage` keyed by route.
- Fallback: global replacement if we want one message everywhere.

---

## 5) UI Rule: Admin Page Headers (still active)

Every admin page with a heading **must** use the shared:
`<AdminPageHeader icon={Icon} title="Page Title" />`
from `src/components/admin/AdminPageHeader.tsx`.

- Always pass a relevant Lucide icon and a properly capitalized title.
- Optional `children` slot renders right-aligned actions.
- Do not use ad hoc inline `<h1>` patterns on admin pages.

