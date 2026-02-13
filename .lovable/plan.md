
# Catalog UI Standardization: Search, Filters, and Modal Consistency

## 1. Reference Data Tables: Add Search Filter

Each reference data table (Suppliers, Brands, Materials, etc.) currently has Active/Inactive/All filter tabs but no search input.

**Changes to `ReferenceDataTable.tsx`:**
- Add a `search` state variable and a search input next to the filter tabs
- Apply text search against `name`, `abbrev`, and `code` fields in the `filtered` useMemo
- Update `toggleSelectAll` so the "select all" checkbox only selects items visible after BOTH the active/inactive filter AND the search filter are applied (this already works correctly since `visibleItems` is derived from `filtered` -- the search just needs to be added to the filter pipeline)

## 2. Catalog Tables: Add "Web" Filter Tab

Currently LensDataTable has Active/Inactive/All. SupplyDataTable and AddonDataTable have no filter tabs at all.

**Changes to `LensDataTable.tsx`:**
- Add a "Web" filter option that shows only items where `show_on_website === true`

**Changes to `SupplyDataTable.tsx`:**
- Add the same Active/Inactive/All/Web filter tab bar (matching LensDataTable pattern)
- "Web" filters to `show_on_website === true`

**Changes to `AddonDataTable.tsx`:**
- Add the same Active/Inactive/All/Web filter tab bar
- "Web" filters to `show_on_website === true`
- Default to "Active" filter

## 3. Catalog Edit Modals: Match Supply Form Structure

The SupplyFormDialog is the gold standard with these features:
- Wide modal (`sm:max-w-5xl`)
- Two-column layout (left: item info, right: flags + pricing + calculated values)
- Item-to-item navigation (prev/next arrows)
- Dual save buttons ("Save" keeps modal open, "Save & Close" closes it)
- Governance checks with concession reason dialog

**Changes to `AddonFormDialog.tsx`:**
- Widen modal from `sm:max-w-lg` to `sm:max-w-5xl`
- Restructure to two-column layout:
  - Left: Item Info (name, SKU, category, supplier, description) and Pricing Sheets
  - Right: Flags, Pricing & Cost (Cost USD, Price BBD, calculated values via usePricingEngine), Auto-Apply Rule
- Add item-to-item navigation (prev/next arrows in header)
- Add "Save & Close" button alongside "Save"
- Add read-only calculated values section (FX Rate, Sell USD, Margin)

**Changes to `AddonsPage.tsx`:**
- Add `handleUpdateAndClose` handler (save + close modal)
- Pass `addons` list and `onNavigate` to `AddonFormDialog` for prev/next navigation

**Changes to `LensFormDialog.tsx`:**
- Widen modal from `max-w-4xl` to `sm:max-w-5xl`
- Add item-to-item navigation (prev/next arrows in header)
- Add "Save & Close" button alongside "Save"

**Changes to `LensesPage.tsx`:**
- Add `handleUpdateAndClose` handler
- Pass `lenses` list and `onNavigate` to `LensFormDialog` for prev/next navigation

## Technical Summary

| File | Changes |
|------|---------|
| `ReferenceDataTable.tsx` | Add search input + apply to filter pipeline |
| `LensDataTable.tsx` | Add "Web" filter tab |
| `SupplyDataTable.tsx` | Add Active/Inactive/All/Web filter tabs |
| `AddonDataTable.tsx` | Add Active/Inactive/All/Web filter tabs, default to Active |
| `AddonFormDialog.tsx` | Widen to 5xl, two-column layout, nav arrows, Save & Close, calculated pricing section |
| `AddonsPage.tsx` | Add handleUpdateAndClose, pass navigation props |
| `LensFormDialog.tsx` | Widen to 5xl, add nav arrows, Save & Close |
| `LensesPage.tsx` | Add handleUpdateAndClose, pass navigation props |

No database changes required.
