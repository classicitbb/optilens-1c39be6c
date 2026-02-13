

# Landscape Supply Form with Navigation and Save Behaviors

## Overview

Redesign the SupplyFormDialog to use a wide landscape layout on desktop, add previous/next navigation arrows for moving between supply items, and implement two save behaviors: "Save" (keeps form open) and "Save & Close" (saves and closes).

## Changes

### 1. SupplyFormDialog.tsx -- Landscape Layout and New Buttons

**Layout changes:**
- Widen the dialog from `sm:max-w-2xl` to `sm:max-w-5xl` (roughly 1024px)
- Arrange the form content in a two-column layout using a CSS grid (`grid-cols-2`):
  - **Left column**: Item Info (name, SKU, category, supplier, brand, description, detail, bin, unit, qty) and Notes
  - **Right column**: Flags, Pricing and Cost, Calculated Values
- This eliminates most vertical scrolling and gives the form a landscape/spreadsheet feel

**Navigation arrows (prev/next):**
- Add new props: `supplies` (the full filtered supply list), `onNavigate` (callback receiving a Supply to switch to)
- In the dialog header, show left/right `ChevronLeft` / `ChevronRight` icon buttons beside the title
- Determine current index from `supply.id` within the `supplies` array; disable the arrow at either end
- Clicking an arrow calls `onNavigate(supplies[currentIndex +/- 1])` which the parent uses to set the active supply
- Navigation arrows only appear when editing (not when creating a new supply)

**Save behavior changes:**
- **"Save" button** (existing submit): calls `onSubmit(form)` but the form stays open -- the parent no longer closes the dialog on success
- **"Save & Close" button** (new): calls a new `onSubmitAndClose(form)` prop, where the parent saves AND closes the dialog on success
- **"Cancel" button**: remains, closes without saving
- Footer order: Cancel | Save | Save & Close

### 2. SuppliesPage.tsx -- Wire Navigation and Save Behaviors

- Pass the filtered supplies list and a navigation handler to the edit dialog
- Split `handleUpdate` into two:
  - `handleUpdateKeepOpen`: saves, shows toast, does NOT close the dialog -- but updates `editSupply` to the refreshed version after invalidation
  - `handleUpdateAndClose`: saves, shows toast, closes dialog (sets `editSupply` to null)
- The create dialog keeps current behavior (close on save)

## Technical Details

### SupplyFormDialog Props (updated)

```typescript
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supply: Supply | null;
  supplies?: Supply[];              // NEW: full list for navigation
  onSubmit: (form: SupplyFormData) => void;          // Save (stay open)
  onSubmitAndClose?: (form: SupplyFormData) => void; // Save & Close
  onNavigate?: (supply: Supply) => void;             // NEW: prev/next
  isPending: boolean;
}
```

### Layout Structure (inside DialogContent)

```text
+------------------------------------------------------+
| [<]  Edit Supply Item                           [>]  |
+------------------------------------------------------+
| LEFT COLUMN              | RIGHT COLUMN              |
|                          |                           |
| Item Info                | Flags                     |
|  Name, SKU, Category     |  Active, Website, ...     |
|  Supplier, Brand         |                           |
|  Description, Detail     | Pricing & Cost            |
|  Bin, Unit, Qty          |  Currency, Cost, Sell      |
|                          |  BB Item, Duty, VAT, ...  |
| Notes                    |                           |
|                          | Calculated Values         |
|                          |  BB Cost, Duty, VAT, ...  |
+------------------------------------------------------+
|              Cancel  |  Save  |  Save & Close        |
+------------------------------------------------------+
```

### Files Changed

| File | Action |
|------|--------|
| `src/components/admin/SupplyFormDialog.tsx` | Landscape two-column layout, nav arrows, Save vs Save & Close buttons |
| `src/pages/admin/SuppliesPage.tsx` | Pass supplies list, wire navigation + dual save handlers |

