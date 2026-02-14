

# Unified Product Catalog Page

## Overview
Combine the Lenses, Add-Ons, and Supplies pages into a single **Product Catalog** page that uses tabs (like the Reference Data page), with one shared search bar and consistent table styling across all three.

## What Changes

### 1. New Unified Page: `src/pages/admin/ProductCatalogPage.tsx`
- A single page with three tabs: **Lenses**, **Add-Ons**, **Supplies**
- Tab bar styled identically to the Reference Data page (underline-style tabs)
- One shared search input at the top (clears when switching tabs)
- Each tab renders its respective data table and form dialogs
- All existing CRUD logic (create, update, toggle, duplicate, delete) is preserved inside each tab section -- essentially the current page components become inline sections
- The "Add" button label changes per tab ("Add Lens", "Add Add-On", "Add Supply")

### 2. Sidebar Update: `src/components/admin/AdminSidebar.tsx`
- Replace the three separate menu items (Lenses, Supplies, Add-Ons) with a single **Product Catalog** entry
- Icon: use an existing icon like `Layers` or `Package`

### 3. Router Update: `src/App.tsx`
- Replace the three routes (`/admin/lenses`, `/admin/supplies`, `/admin/addons`) with a single `/admin/catalog` route pointing to `ProductCatalogPage`
- Update the default redirect from `/admin` to `/admin/catalog`
- Keep old paths redirecting to `/admin/catalog` for bookmarks

### 4. Remove Old Pages (optional cleanup)
- `LensesPage.tsx`, `AddonsPage.tsx`, `SuppliesPage.tsx` become unused and can be removed since their logic moves into the unified page

### 5. Table Style Consistency
- All three data tables already use similar styling (sticky headers, alternating rows, margin health colors). Minor alignment will be done:
  - Ensure identical `thCls` / `tdCls` class strings across all three tables
  - Same filter tab styling (already matching)
  - Same record count display format
  - Same border/background HSL values

## What Does NOT Change
- The data tables themselves (`LensDataTable`, `AddonDataTable`, `SupplyDataTable`) remain as separate components -- they have different columns and different data shapes
- The form dialogs (`LensFormDialog`, `AddonFormDialog`, `SupplyFormDialog`) remain unchanged
- All hooks (`useLenses`, `useAddons`, `useSupplies`) remain unchanged
- All CRUD, audit logging, and navigation guard behavior stays identical

## Technical Details

The unified page structure will look like:

```text
ProductCatalogPage
+-- Tab bar: [Lenses] [Add-Ons] [Supplies]
+-- Search input + Add button
+-- Conditional render based on active tab:
    +-- "lenses"  -> LensDataTable + LensFormDialog (logic from LensesPage)
    +-- "addons"  -> AddonDataTable + AddonFormDialog (logic from AddonsPage)
    +-- "supplies"-> SupplyDataTable + SupplyFormDialog (logic from SuppliesPage)
```

Each tab section will contain its own state (editItem, formOpen, etc.) via inline hooks, keeping the component manageable. Data is only fetched for the active tab using conditional hook calls or by letting React Query cache handle it.

## Files Changed
| File | Action |
|------|--------|
| `src/pages/admin/ProductCatalogPage.tsx` | Create (unified page) |
| `src/components/admin/AdminSidebar.tsx` | Edit (consolidate 3 items to 1) |
| `src/App.tsx` | Edit (update routes) |
| `src/pages/admin/LensesPage.tsx` | Delete |
| `src/pages/admin/AddonsPage.tsx` | Delete |
| `src/pages/admin/SuppliesPage.tsx` | Delete |
| `src/components/admin/LensDataTable.tsx` | Minor style alignment |
| `src/components/admin/AddonDataTable.tsx` | Minor style alignment |
| `src/components/admin/SupplyDataTable.tsx` | Minor style alignment |

