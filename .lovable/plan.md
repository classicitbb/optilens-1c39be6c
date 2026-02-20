
## Issues Found & Fix Plan

### Root Cause 1: CHECK Constraint Mismatch (Cannot Add Lenses)

The database has a CHECK constraint on `matrix_allocations.treatment_type` that only accepts **Title Case** values:
```
CHECK (treatment_type = ANY (ARRAY['Clear', 'Transitions', 'Photochromic', 'Polarized', 'Bluefilter']))
```

But the application code uses **lowercase** values (`clear`, `transitions`, `photochromic`, `polarized`, `bluefilter`). Every insert attempt fails this constraint — that's the exact error shown in your screenshot.

**Fix**: Drop the old constraint and replace it with one accepting lowercase values (matching all existing application code).

---

### Root Cause 2: Live Preview Missing Treatments & Add-ons

The `PricelistLivePreview` component only reads rows where `catalog_type = 'rx'` and renders them grouped by `section`. However, Treatment and Add-on rows saved from the Treatments & Add-ons panel are also stored in `pricelist_catalog_rows` — the preview just never renders them in a separate labeled section after the lens grids.

**Fix**: In the List Preview, after rendering lens sections, add a second pass that renders rows where `row_type = 'addon'` or `row_type = 'treatment'` / `row_type = 'supply'` grouped together in a clearly labeled "Treatments & Add-ons" block. In the Matrix Preview, add a compact Add-on delta table underneath each treatment grid.

---

### Root Cause 3: No Demo Data to Test End-to-End

The `matrix_allocations` table is empty because no lenses have ever been successfully saved (due to the constraint failure). There is good data available: the `price_matrix` table has 10 categories (Progressive - Best/Better/Good, Single Vision, etc.) and there are pricelist-enabled lenses with costs and prices.

**Fix**: After fixing the constraint, seed demo allocations by inserting matrix rows that map the existing `price_matrix` categories to real lenses from the catalog for version ID 3 (the only existing version).

---

### Technical Implementation

**Step 1 — Database migration** (executes immediately):
```sql
-- Drop old Title Case constraint
ALTER TABLE public.matrix_allocations 
DROP CONSTRAINT IF EXISTS matrix_allocations_treatment_type_check;

-- Add new lowercase constraint matching the application
ALTER TABLE public.matrix_allocations 
ADD CONSTRAINT matrix_allocations_treatment_type_check 
CHECK (treatment_type = ANY (ARRAY[
  'clear', 'transitions', 'photochromic', 'polarized', 'bluefilter'
]));
```

**Step 2 — Seed demo allocations**: Insert ~10 matrix_allocation rows for version 3 mapping the `price_matrix` categories to real lenses (e.g., Progressive - Better / 1.50 → the "1.50 LBUC PROG Classic PAL SRCoated" lens at $138.60). This makes the matrix immediately usable and testable.

**Step 3 — Fix PricelistLivePreview**: Add a Treatments & Add-ons section:

- **Matrix format**: After each treatment grid, add a compact row listing add-on name + price from `pricelist_catalog_rows` where `row_type IN ('addon', 'supply')`.
- **List format**: After all lens sections, add a clearly delineated "Treatments & Add-ons" section table showing all addon/supply rows.

**Step 4 — Seed demo catalog rows**: After seeding matrix allocations, also insert matching `pricelist_catalog_rows` for the demo lens allocations and a few add-ons (e.g., Super AR at $75, Classic AR at $70) so the preview renders fully.

---

### Files Changed

| File | What Changes |
|---|---|
| Migration SQL | Drop+recreate `treatment_type` CHECK constraint to lowercase |
| Migration SQL | Seed demo `matrix_allocations` rows for version 3 |
| Migration SQL | Seed demo `pricelist_catalog_rows` (lens + addon rows) |
| `src/components/admin/PricelistLivePreview.tsx` | Add Treatments & Add-ons section to both Matrix and List preview formats |

No changes needed to `TreatmentMatricesAccordion.tsx` or `useMatrixAllocations.ts` — the code is correct, only the DB constraint was wrong.
