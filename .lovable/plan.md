
# Persist Lens Import Mappings and Improve Duplicate Handling

## Problem 1: Reference Mappings Are Lost Between Imports

Currently, when you resolve an unmatched reference (e.g., mapping CSV value "Essilor" to an existing supplier), that mapping only lives in browser memory. The moment you reset or reload, you have to redo it all. This is tedious for repeated imports from the same source.

**Solution:** Create a database table `import_ref_mappings` that stores each mapping (CSV value to reference record ID). On subsequent imports, these saved mappings are loaded automatically and applied before showing unresolved items.

### Database Changes

New table: `import_ref_mappings`
- `id` (uuid, primary key)
- `ref_table` (text) -- e.g. "suppliers", "brands"
- `csv_value` (text) -- the original CSV text that didn't match
- `mapped_id` (uuid) -- the reference record it was mapped to
- `created_at` (timestamptz)
- Unique constraint on `(ref_table, csv_value)` so each CSV value only has one mapping per table
- RLS: editors can select/insert/update/delete

### Hook Changes (`useImportLenses.ts`)

- On `parseAndValidate`: after loading ref maps, also fetch saved mappings from `import_ref_mappings` and inject them into the ref maps before validation runs
- On `resolveRef`: after resolving, also persist the mapping to `import_ref_mappings` (upsert on the unique constraint)
- This means the next time the same CSV value appears, it auto-resolves without user action

---

## Problem 2: Smarter Duplicate Detection with Overwrite/Ignore

Currently, duplicates are detected only by matching the generated lens name. The user wants broader matching (including price and other variables) and the ability to choose whether to overwrite or ignore duplicates.

**Solution:** Enhance duplicate detection to match on the composite key of `supplier_id + brand_id + material_id + mftype_id + lenstype_id + lens_option_id + finishtype_id` (the fields that define a unique lens SKU). When duplicates are found, show them clearly and add a global "Overwrite Duplicates" / "Ignore Duplicates" toggle in the import summary bar.

### Hook Changes (`useImportLenses.ts`)

- Fetch existing lenses with all their reference IDs (not just name)
- Build a composite key from `supplier_id|brand_id|material_id|mftype_id|lenstype_id|finishtype_id` for each existing lens
- During validation, match incoming rows against this composite key (after references are resolved)
- Add a new state: `duplicateAction` with values `"overwrite"` or `"ignore"` (default: `"overwrite"`)
- In `executeImport`: if `duplicateAction === "ignore"`, skip rows with status "duplicate"; if "overwrite", update the existing record (current behavior)
- Export `duplicateAction` and `setDuplicateAction` from the hook

### UI Changes (`ImportLensesTab.tsx`)

- In the summary bar, when duplicates exist, show a toggle/button group: **Overwrite** | **Ignore**
- When "Ignore" is selected, the import button count excludes duplicates
- Duplicate rows in the table show the action that will be taken (Overwrite or Skip)

---

## File Summary

| File | Changes |
|------|---------|
| New migration SQL | Create `import_ref_mappings` table with unique constraint and RLS policies |
| `src/hooks/useImportLenses.ts` | Load saved mappings on validate; persist mappings on resolve; composite-key duplicate detection; add `duplicateAction` state |
| `src/components/admin/ImportLensesTab.tsx` | Add Overwrite/Ignore toggle for duplicates in summary bar; update import button count based on selection |

No changes to existing database tables are needed -- the duplicate detection enhancement is purely application-level logic using existing columns.
