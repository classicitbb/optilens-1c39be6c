# Vision Care Plus price list: findings and safe update path

Read-only inspection. Nothing was changed.

## 1. Where it is stored
In the database, using the live pricing model (`pricelist_versions`). It is not in code.
- Header: `pricelist_versions` id **24**, "Vision Care Plus", BBD, list format, version markup and discount both 0%. Created and last updated 2026-10-06.
- Lens prices: `matrix_allocations` has **172** rows for version 24, one per category × material × treatment, each with a `lens_id` and a BBD price.
- Category/index price grid overrides: `pricelist_overrides` has **56** rows, for example "Specific Use - Drive SV" at 1.50 = 39.29.
- Catalog rows: `pricelist_catalog_rows` has **186** rx rows: 172 lens rows and 14 add-on/coating rows.
- Section-level adjustments: `pricelist_child_sections` has **1** row (id 38, "RX Lens Prices", 0% markup and 0% discount). Under it, `pricelist_line_overrides` has **1** manual override: id 1018, matrix_allocation 5703 set to BBD 206.97 on 2026-10-07.

## 2. Account it is tied to
- `customers` id **828**, "Vision Care Plus", account number **VCPL**, `assigned_pricelist_id = 24`.
- No other customer uses version 24, and no other customer record matches the name.

## 3. Name, status, published
- Name: "Vision Care Plus".
- Status: `pricelist_versions` has no status or published column. The "Draft" label is shown in the screen only (this is a known issue). Version 24 is live as soon as it is assigned, and it already is assigned to customer 828. Any edit therefore reaches that customer's portal and order pricing right away.
- Published catalog documents (`catalog_templates`): none are linked to this customer. All four templates are drafts, and `catalog_assignments` is empty.

## 4. Structure
- Lenses: `matrix_allocations` (category, material_index, treatment_type, lens_id, allocated_price_bbd, is_active), plus the `price_matrix` grid (category × index_1_50 … index_1_74). The grid is shared. Per-list overrides for it go in `pricelist_overrides` (category, index_column, overridden_price).
- Coatings/add-ons: `pricelist_catalog_rows` with row_type `addon`, section `coatings` or `add-ons`, and `bbd_price`. There are 14 today, including STANDARD AR 75, SUPER AR+ 100, BLUE DEFENSE AR+ 90, SRC 13, Flash Mirror 114, Mirror 120, Back AR 50, Edging Fee 10, Polish 8, Specialty Edging 25, Customer Lens Edged 50, and three Myo/HD add-ons.
- Customer-specific adjustments: `pricelist_child_sections` holds section markup and discount, and `pricelist_line_overrides` holds per-line prices with `override_source` set to manual or bulk_adjustment. A bulk re-materialization keeps manual overrides unless "replace all" is chosen.
- Do not use `addon_pricing_sheets`, `customer_pricing_access` or `pricelists`/`pricelist_lines`. Nothing in the app reads from them.

## 5. Safest way to update without publishing
Because version 24 goes live as soon as it is edited, do not edit it directly.
1. Copy version 24 into a new, unassigned version, e.g. "Vision Care Plus – Oct 2026 (pending)". The copy must include allocations, overrides, catalog rows, child sections and line overrides. The existing Duplicate action copies only some of this, so the copy needs a controlled database script.
2. Make every price change in the copy through Pricing → Pricelists → RX Lens Prices / Add-ons & Extras, so audit and governance checks still apply.
3. Check row counts and a sample of prices against version 24. Confirm manual override 1018 (206.97) is either carried over on purpose or replaced on purpose.
4. Leave customer 828 on version 24. To go live later, only `assigned_pricelist_id` changes from 24 to the new id, and switching back is one step.

Second option: edit version 24 directly, but only if you accept that changes go live immediately. Before that, save a snapshot of the current rows so they can be restored.

## Ambiguity to watch
- Three CRM contacts share the business name "Vision Care Plus". There is one company record (68aa643e…, active customer, notes say "Account: VCPL") and two people under it: Denia Gonzalez (#130) and Melissa Ballantyne (#151). Both people link to customer 828. They are one account, not separate accounts.
- The address data is inconsistent. The business is in Kingstown, St Vincent, but the two person contacts show country "Barbados". This does not affect pricing, but it is worth fixing.
- Do not mix this up with "OSVG - Spectacle Shoppe" (version 19), which is another St Vincent customer.
- Sixteen RX lens catalog rows (172 allocations versus 186 catalog rows, minus 14 add-ons, gives 0 lens difference) line up, so the lens rows are consistent.

## Proposed next step (needs your go-ahead)
Make a pending copy of version 24 as described in step 1. Send me the price changes and I will apply them to the copy only, without assigning or publishing it.
