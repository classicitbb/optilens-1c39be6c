

# Link Suppliers to Supply Catalog

## Overview

Add a nullable `supplier_id` foreign key column to the `supplies` table, letting each supply item be optionally assigned to a supplier from the existing `suppliers` reference table.

## Database Changes

### Migration

Add a nullable `supplier_id` column to `supplies` with a foreign key to `suppliers(id)`:

```sql
ALTER TABLE public.supplies
  ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
```

Using `ON DELETE SET NULL` so if a supplier is removed, the supply item remains but loses its supplier link. Nullable because not every supply needs a supplier assigned immediately.

## Code Changes

### `src/hooks/useSupplies.ts`

- Add `supplier_id: string | null` to `Supply` and `SupplyFormData` interfaces
- Update the query to join supplier name: `.select("*, supplier:suppliers(id, name)")`
- Add `supplier_name` (derived from the join) to the `Supply` interface for display

### `src/components/admin/SupplyFormDialog.tsx`

- Fetch active suppliers using `useReferenceData("suppliers")`
- Add a **Supplier** dropdown (Select component) showing all active suppliers, with an empty/none option
- Include `supplier_id` in form state and submission

### `src/components/admin/SupplyDataTable.tsx`

- Add a **Supplier** column after Category showing the supplier name
- Include supplier name in the search filter

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSupplies.ts` | Add `supplier_id` to interfaces; join `suppliers` table in query |
| `src/components/admin/SupplyFormDialog.tsx` | Add Supplier dropdown using reference data |
| `src/components/admin/SupplyDataTable.tsx` | Add Supplier column; update colSpan for empty state |

