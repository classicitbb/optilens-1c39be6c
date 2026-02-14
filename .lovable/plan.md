

# Add Duplicate/Delete Actions to Lenses & Supplies with Lock/Unlock Guard

## Overview
Extend the Duplicate and Delete actions (currently only on Add-Ons) to the Lenses and Supplies tables. Add a lock/unlock toggle next to the record count on all three tables so these destructive actions are hidden by default and only revealed when explicitly unlocked.

## What Changes

### 1. Add `deleteMutation` and `duplicateMutation` to hooks

**`src/hooks/useLenses.ts`** -- add two new mutations:
- `deleteMutation`: deletes a lens row and its `lens_lens_options` join rows (cascade should handle this, but delete join rows first to be safe)
- `duplicateMutation`: copies a Lens (with "(Copy)" suffix, blank SKU-equivalent fields, preserves all other fields including lens options)

**`src/hooks/useSupplies.ts`** -- add two new mutations:
- `deleteMutation`: deletes a supply row by ID
- `duplicateMutation`: copies a Supply with "(Copy)" suffix, preserves all fields except ID

### 2. Lock/Unlock toggle on all three data tables

Add a small lock icon button next to the record count (right side of filter bar) on each table:
- **Locked (default)**: Shows a `Lock` icon. The Actions column (Duplicate/Delete buttons) is hidden.
- **Unlocked**: Shows an `Unlock` icon with a subtle warning tint. The Actions column appears.
- This replaces the current always-visible Actions column on the Add-Ons table.
- Only shown when `canEdit` is true.

**Files affected**: `LensDataTable.tsx`, `AddonDataTable.tsx`, `SupplyDataTable.tsx`

Each table gets:
- New props: `onDuplicate`, `onDelete`, `canDelete` (Lenses and Supplies gain these; Add-Ons already has them)
- Local `unlocked` state (`useState(false)`)
- Lock/Unlock button rendered next to the record count span
- An "Actions" column that only renders when `unlocked && canEdit`

### 3. Wire up in `ProductCatalogPage.tsx`

**LensesTab**:
- Import and use `deleteMutation` and `duplicateMutation` from `useLenses`
- Add `deleteTarget` state and delete confirmation AlertDialog (same pattern as AddonsTab)
- Pass `onDuplicate`, `onDelete`, `canDelete` to `LensDataTable`

**SuppliesTab**:
- Import and use `deleteMutation` and `duplicateMutation` from `useSupplies`
- Add `deleteTarget` state and delete confirmation AlertDialog
- Pass `onDuplicate`, `onDelete`, `canDelete` to `SupplyDataTable`

**AddonsTab**: No logic changes -- just continues passing the same props.

### 4. Audit logging for new actions
- Log `delete` and `create` (duplicate) actions for lenses and supplies, same pattern already used for add-ons.

## What Does NOT Change
- Form dialogs remain unchanged
- Navigation guards unchanged
- Table columns, styling, margin health colors unchanged
- The delete confirmation AlertDialog pattern is reused as-is from AddonsTab

## Technical Details

### Lock/Unlock UI (in each data table's filter bar)
```text
[Active] [Inactive] [All] [Web]          🔒  245 records
                                   click: 🔓  245 records  (actions column appears)
```
- The lock icon is a small ghost button: `Lock` or `Unlock` from lucide-react
- When unlocked, the icon gets an amber/warning tint to signal "advanced mode"
- Clicking again re-locks and hides the actions column

### Duplicate logic for Lenses
Copies all lens fields except `id`, `created_at`, `updated_at`. Sets name to `"Original Name (Copy)"`. Also duplicates `lens_lens_options` rows for the new lens ID.

### Delete restrictions
- Delete button only appears when `canDelete` is true (Admin role only)
- Always behind the lock/unlock guard as a second layer of protection

## Files Changed

| File | Action |
|------|--------|
| `src/hooks/useLenses.ts` | Add `deleteMutation`, `duplicateMutation` |
| `src/hooks/useSupplies.ts` | Add `deleteMutation`, `duplicateMutation` |
| `src/components/admin/LensDataTable.tsx` | Add lock/unlock, Actions column, new props |
| `src/components/admin/AddonDataTable.tsx` | Add lock/unlock guard (replace always-visible actions) |
| `src/components/admin/SupplyDataTable.tsx` | Add lock/unlock, Actions column, new props |
| `src/pages/admin/ProductCatalogPage.tsx` | Wire duplicate/delete for Lenses and Supplies tabs |

