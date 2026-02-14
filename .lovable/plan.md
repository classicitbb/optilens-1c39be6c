# Lens Catalog Table + Modal Alignment with Supplies/Addons

This plan covers three areas: (1) updating the lens data table columns, (2) aligning the lens modal flags to use Switch toggles like supplies, and (3) hooking lens pricing into the full pricing engine with governance.

---

## 1. Lens Data Table Column Changes (`LensDataTable.tsx`)

**Current columns:** Name, Supplier, Brand, Material, Lens Type, Index, Cost (USD), Sell (BBD), Sell (USD), Status, PL, Lab, WSPL, Web, [Active switch]

**New columns:** Name, Supplier, Brand, Material, Lens Type, **Finish Type**, Cost (USD), Sell (BBD), Sell (USD), PL, Lab, WSPL, **Web (Globe icon)**, [Active switch]

Changes:

- **Remove** the "Index" column -- replace with "Finish Type" showing `fkName(lens.finishtype)`
- **Remove** the "Status" badge column entirely
- **Replace** PL/Lab/WSPL columns: instead of disabled Checkbox components, show a plain checkmark character or blank (matching the supplies table pattern using `"checkmark" : ""`)
- **Replace** the Web column: instead of a disabled Checkbox, show a Globe icon when true (matching the addons table pattern)
- Update the `SortHeader` options to replace `index_value` with a sortable `finishtype` column
- Update `colSpan` values for empty/load-more rows

---

## 2. Lens Form Dialog Alignment (`LensFormDialog.tsx`)

The lens modal currently uses `Checkbox` components for flags (Show in Pricelist, Full Lab, Show in Wholesale PL, Show on Website). The supplies and addons modals use `Switch` toggles in a consistent "Flags" section on the right column.

Changes:

- **Replace all Checkbox flag controls with Switch toggles**, matching the supplies modal pattern:
  ```
  Flags section with Switch toggles:
  - Active
  - Show in Pricelist (PL)
  - Full Lab
  - Show in Wholesale PL (WSPL)
  - Show on Website
  ```
- Move the Active toggle from the footer into the Flags section (consistent with supplies/addons where flags are grouped together)
- Restructure the modal layout to match the supplies two-column pattern:
  - **Left column**: Item Info (identity fields, specs, notes)
  - **Right column**: Flags, Pricing and Cost, Calculated Values

---

## 3. Hook Lens Pricing into the Pricing Engine (`LensFormDialog.tsx`)

Currently the lens modal has a basic margin calculation (`sell_price - base_price`) and a minimal pricing engine call that does not account for `full_lab`. The supplies modal shows the full calculated values panel (landed cost, overhead, financing, shrinkage, strategic price, margin status badge, governance flags).

Changes:

- Update the pricing engine call to pass `full_lab` context: when `full_lab` is true, set `labour_cost: 0` and potentially adjust `duty_applicable` and `bb_item` flags (full lab means local processing --  import duty/labour added, if unchecked it means its imported, but not manufactured or stored by us.)
- Add the **Calculated Values** panel to the lens modal (matching supplies): FX Rate, Converted (BBD), CIF, Duty, Charges, VAT, Landed, Overhead, Financing, Holding, Shrinkage, Labour, Full Cost, Strategic Price, Margin, Sell (USD)
- Add **margin status badge** display
- Add **governance flags** display (At Loss, Below Floor, Below Target badges)
- Integrate **GovernanceAlert** and **ConcessionReasonDialog** components
- Wire governance blocking into the Save/Save & Close buttons (disable when blocked, require reason when needed)
- Update `LensesPage.tsx` handlers to accept and pass through the concession reason parameter

---

## Technical Details

### Files to modify:


| File                                      | Changes                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/admin/LensDataTable.tsx`  | Remove Index + Status columns; add Finish Type column; replace Checkbox flags with checkmarks; Web column gets Globe icon                                     |
| `src/components/admin/LensFormDialog.tsx` | Replace Checkbox flags with Switch toggles; restructure to two-column layout matching supplies; add full Calculated Values panel; integrate governance checks |
| `src/pages/admin/LensesPage.tsx`          | Update handlers to support concession reason parameter from governance flow                                                                                   |
| `src/hooks/useLenses.ts`                  | Update `LensFormData` to not need changes (already has all flags); no schema changes needed                                                                   |


### ReadOnly helper

The `LensFormDialog` will need the same `ReadOnly` display component used in the supplies and addons modals for showing calculated values. This will be added inline (same pattern as the other modals).

### Pricing Engine Integration for Lenses

The `full_lab` flag false or unchecked means local labour and processing is NOT added to lens cost. The engine call will be:

- `labour_cost`: 1 when `full_lab` is true ( local processing), otherwise do not apply a labour factor
- `bb_item`: false (lenses are imported)
- `duty_applicable`: true (import duty applies but can be toggled)
- `category`: "lenses"