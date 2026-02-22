

# RX Lens Prices: Duplication, Markup/Discount, Live Preview & Export Enhancements

## 1. Pricelist Duplication -- Copy All Data (Matrix Allocations + Catalog Rows)

**Problem:** Currently, duplicating a pricelist version only copies `pricelist_overrides` (legacy). The new system uses `matrix_allocations` and `pricelist_catalog_rows`, which are NOT copied during duplication. Creating a "new" pricelist from the matrix also copies overrides but not allocations.

**Fix in `usePricelistVersions.ts`:**
- When `copyFrom` is a version ID (duplicate), also copy all `matrix_allocations` and `pricelist_catalog_rows` from the source version to the new version.
- When `copyFrom` is `"matrix"` (new blank pricelist), do NOT copy allocations or catalog rows -- start blank.
- Apply markup/discount calculation during the copy (see section 2).

## 2. Wire Up Markup % and Discount % Calculations

**Logic:** When creating or duplicating a pricelist with markup and/or discount set:
- `final_price = base_price * (1 + markup/100) * (1 - discount/100)`
- This applies to all `allocated_price_bbd` in `matrix_allocations` and `bbd_price` in `pricelist_catalog_rows` at copy time.

**Changes in `usePricelistVersions.ts` `createMutation`:**
- After copying `matrix_allocations`, transform each `allocated_price_bbd` using the markup/discount formula.
- After copying `pricelist_catalog_rows`, transform each `bbd_price` using the same formula.

**On edit (updating markup/discount on existing pricelist):**
- Add a recalculation utility: when markup/discount changes on an existing version, offer a "Recalculate Prices" action that applies the new markup/discount relative to the original source prices. This would be shown as a button in the version editor dialog.

## 3. Live Preview: Collapse Empty Material Columns

**In `PricelistLivePreview.tsx` MatrixPreview:**
- Before rendering each treatment table, compute which `MATERIAL_COLUMNS` have at least one allocation with a non-null price for that treatment type.
- Only render columns that have data. Filter `MATERIAL_COLUMNS` per treatment section.
- Also apply this to the header row and averages/delta rows.

## 4. Live Preview Header: Logo + Slogan

**In `PricelistLivePreview.tsx`:**
- In the branded header section (line ~276), add the company logo above the slogan text on the left side.
- Use `company?.logo_url` to render an `<img>` tag with reasonable sizing (e.g., max-height 48px).
- The slogan text remains below the logo.

## 5. Add-on Editor: Drag-and-Drop Reordering (Up/Down Arrows)

**Approach:** Use up/down arrow buttons on hover rather than full drag-and-drop (simpler, no new dependencies).

**In `ListCatalogTab.tsx`:**
- Add up/down arrow buttons that appear on row hover for addon/treatment/supply rows.
- Clicking up/down swaps the row's `sort_order` with its neighbor.
- The reordered sort_order persists when saved and reflects in the live preview.
- Apply the same pattern to the addon sections in the catalog tab.

## 6. Export: Capture Only Live Preview Area

**Problem:** Current PDF export uses `window.print()` which prints the whole page. Excel/CSV/HTML exports build data programmatically (already correct for content) but need to match preview formatting.

**Changes in `RxExportBar.tsx`:**
- **PDF export:** Instead of `window.print()`, isolate the `#live-preview` element. Use a print-specific approach: temporarily clone the live preview content into a print-only container, trigger `window.print()`, then remove it. Or use `@media print` CSS to hide everything except `#live-preview`.
- **Matrix HTML export:** Add a missing Matrix HTML export button (currently only List has HTML).
- **Excel/CSV exports:** Already programmatic -- these are fine but should match the live preview content (including collapsed empty columns for matrix).

**CSS approach for PDF (simplest):**
- Add a global print stylesheet: `@media print { body > * { display: none !important; } #live-preview { display: block !important; } }` or use a class-based approach.
- In `RxLensPricesPage.tsx`, ensure the live preview div has a specific print class.

**Add Matrix HTML export** in `RxExportBar.tsx` (currently missing -- only List has HTML).

## Technical Details

### Files to modify:
1. **`src/hooks/usePricelistVersions.ts`** -- Copy `matrix_allocations` + `pricelist_catalog_rows` on duplicate; apply markup/discount formula
2. **`src/components/admin/PricelistLivePreview.tsx`** -- Collapse empty material columns; add logo to header
3. **`src/components/admin/ListCatalogTab.tsx`** -- Add up/down reorder buttons for addon rows
4. **`src/components/admin/RxExportBar.tsx`** -- Add Matrix HTML export; change PDF to only capture live preview
5. **`src/pages/admin/RxLensPricesPage.tsx`** -- Add print CSS to isolate live preview
6. **`src/index.css`** -- Add `@media print` rules to hide non-preview content

### Price calculation formula:
```text
adjusted_price = original_price * (1 + markup_percent / 100) * (1 - discount_percent / 100)
```

### Empty column detection (per treatment type):
```text
activeCols = MATERIAL_COLUMNS.filter(col =>
  allocations.some(a => a.treatment_type === tt && a.material_index === col.key && a.allocated_price_bbd != null)
)
```

