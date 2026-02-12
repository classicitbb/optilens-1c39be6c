

# Convert Options to Single-Select Dropdown

## What Changes

The Options field in the Lens form will become a standard single-select dropdown (identical to Lens Type, Supplier, etc.), allowing only **one** option per lens.

## Technical Details

### 1. Update `LensFormData` type (`src/hooks/useLenses.ts`)
- Change `options` from an array to a single optional object:
  - `option: { lens_option_id: string; extra_cost: number } | null`
- Update create/update mutations to handle single option instead of array

### 2. Update `LensFormDialog.tsx`
- Replace the Popover-based multi-select with a standard `RefSelect` dropdown
- Add a separate "Extra Cost" numeric input that appears when an option is selected
- Update form state: `options` array becomes a single `option_id` string (or empty) plus `option_extra_cost` number
- Update `handleSubmit` to format the single option back into the junction table row

### 3. Update `LensDataTable.tsx`
- Adjust any display logic that references `lens_lens_options` as an array (it will now have 0 or 1 entries)

### 4. No database changes needed
- The `lens_lens_options` junction table stays as-is; we simply only ever insert 0 or 1 rows per lens

