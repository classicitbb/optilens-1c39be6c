

# Phase 1A: Internal Lens Pricing Tool

This plan builds the foundation of a Retool-style internal pricing tool as a completely separate section of the app, accessible only to authorized users with specific roles.

---

## Overview

The pricing tool will live under `/admin/*` routes, completely separate from the public-facing OptiVisionNow storefront. It uses its own layout with a dark collapsible sidebar, dense data tables, and role-based access control.

---

## 1. Database Changes (Migration)

### Roles Table
- `user_roles` table with columns: `id`, `user_id` (FK to auth.users), `role` (enum: admin, operator, viewer)
- Unique constraint on (user_id, role)
- RLS policies so users can read their own role
- `has_role()` security definer function to check roles without RLS recursion

### Reference Data Tables (6 tables, identical structure)
Each table (`suppliers`, `brands`, `materials`, `mftypes`, `lenstypes`, `lens_options`) will have:
- `id uuid` (PK, default gen_random_uuid())
- `name text` (unique, not null)
- `is_active boolean` (default true)
- `created_at timestamptz` (default now())
- `updated_at timestamptz` (default now())
- `updated_at` trigger for auto-update
- RLS: authenticated users with any pricing-tool role can SELECT; only admin/operator can INSERT/UPDATE

---

## 2. Design Tokens and Styling

Add a set of CSS custom properties scoped to the admin tool area for the Retool-inspired aesthetic:
- Slate-900 sidebar background, slate-50 content area
- Blue accents (hsl 215 65% 50%) for active states and buttons
- 4px border radius, subtle borders, tight spacing
- Compact table rows with minimal padding
- Monospace-adjacent font sizing for data density

These will be applied via a wrapping class (e.g., `.admin-tool`) so they don't affect the existing storefront styles.

---

## 3. App Shell Components

### AdminLayout
- Wraps all `/admin/*` routes
- Contains the collapsible sidebar (56px when collapsed, 240px expanded)
- Top bar with: environment label ("Internal Tool"), logged-in user email + role badge, global search input
- Full-width content area to the right of sidebar

### AdminSidebar
Uses the existing Shadcn Sidebar components with dark theme overrides:
- **Modules (menu items):**
  - Lenses (placeholder for future phases)
  - Reference Data (with sub-items: Suppliers, Brands, Materials, MF Types, Lens Types, Lens Options)
  - Pricing Profiles (placeholder)
  - Imports (placeholder)
  - Runs/History (placeholder)
  - Exports (placeholder)
  - Parameters/Settings (placeholder)
  - Users (admin only)
  - Audit Log (admin only)
- Active route highlighting using NavLink
- Icon-only mode when collapsed

---

## 4. Authentication and Authorization

### Role-Based Route Protection
- `AdminProtectedRoute` component: checks if user is authenticated AND has a role in `user_roles`
- `useUserRole` hook: fetches the current user's role from `user_roles` table
- Role checks:
  - **viewer**: read-only access to all non-admin pages
  - **operator**: can create/edit reference data
  - **admin**: full access including Users and Audit Log modules
- Users without any role in `user_roles` cannot access `/admin/*` at all -- they see a "Not Authorized" page

### Role Context
- `AdminRoleContext` provider wrapping admin routes, providing `role`, `canEdit`, `isAdmin` helpers

---

## 5. Reference Data Pages

### Generic Reference Data Table Component (`ReferenceDataTable`)
A reusable component used by all 6 entity pages with:
- **Dense data grid**: compact rows, small font, minimal padding
- **Sortable columns**: click column header to sort asc/desc (client-side)
- **Filter tabs**: All / Active / Inactive (filters `is_active`)
- **Create button**: opens a modal dialog with name input (operator/admin only)
- **Edit**: click row to open edit modal (operator/admin only)
- **Soft deactivate**: toggle `is_active` via a switch (operator/admin only)
- Uses existing Shadcn Table, Dialog, Input, Button, Badge, Switch, Tabs components

### Individual Route Pages
Each is a thin wrapper passing config to `ReferenceDataTable`:
- `/admin/reference/suppliers`
- `/admin/reference/brands`
- `/admin/reference/materials`
- `/admin/reference/mftypes`
- `/admin/reference/lenstypes`
- `/admin/reference/lens-options`

---

## 6. Routing

New routes added to `App.tsx`:

```text
/admin                    -> Redirect to /admin/reference/suppliers
/admin/reference/:entity  -> Reference data pages
/admin/users              -> Users management (admin only, placeholder)
/admin/audit              -> Audit log (admin only, placeholder)
/admin/*                  -> Other modules (placeholder pages)
```

All wrapped in `AdminProtectedRoute` and `AdminLayout`.

---

## 7. File Structure

```text
src/
  contexts/
    AdminRoleContext.tsx
  hooks/
    useUserRole.ts
    useReferenceData.ts
  components/admin/
    AdminLayout.tsx
    AdminSidebar.tsx
    AdminTopBar.tsx
    AdminProtectedRoute.tsx
    ReferenceDataTable.tsx
    ReferenceDataModal.tsx
    NotAuthorized.tsx
  pages/admin/
    AdminDashboard.tsx
    ReferenceDataPage.tsx
    UsersPage.tsx (placeholder)
    AuditLogPage.tsx (placeholder)
    PlaceholderPage.tsx
  index.css (additions for .admin-tool scoping)
```

---

## Technical Notes

- The `has_role()` function uses `SECURITY DEFINER` to bypass RLS and prevent recursive policy checks.
- An admin must manually insert rows into `user_roles` (via the backend SQL runner) to grant initial access. The Users page (placeholder in this phase) will eventually provide a UI for this.
- All reference data queries use `@tanstack/react-query` for caching and mutations, following the existing pattern in `useOrders.ts` and `useCart.ts`.
- The admin tool is entirely client-side rendered with server-side authorization enforced through RLS policies on every table.

