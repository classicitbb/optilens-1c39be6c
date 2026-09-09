# Stock lens family pricing + one pricing ecosystem

## What is wrong today

Verified against the live database and code:

- Nothing you type on the **Stock Order SKUs** (Family) tab ever reaches the ordering side. There are
  **0 saved family price rows** in the database, and even if one saved, the screen reads its prices under a
  different key than the one it writes to — so the box reverts and the "0 of 8 priced" badge never moves.
- Family prices are stored in a shelved format (`row_type = 'stock_variant'`) that **no ordering screen reads**.
  The stock order form, store and admin order-taking all read prices keyed by the **website product** instead.
- The 8 families show raw codes (`Family 1:1:4:171:1:2:0`) because the synced material/style/manufacturer
  descriptions are never resolved.

## How families actually link to lenses

The link already exists in the synced data, just unused:

```text
Innova family (innovations_store_lenses)
   -> its power rows (innovations_store_lens_power_rows) each carry an OPC code
      -> store_product_variants.opc_code matches those codes
         -> variant.product_id = the website lens it belongs to
```

225 variants already match an Innova power-row OPC today, so most families can be linked automatically;
the rest need a one-time manual pick.

## Plan

### 1. Make the family -> lens link real and visible
- Add a small mapping table linking each Innova family to one website lens (with how it was matched:
  automatic by OPC, or chosen by staff).
- Seed it automatically from the OPC matches above.
- On the Family tab, show the linked lens per row, plus a picker to set or correct the link. Unlinked
  families are clearly flagged as "not linked - cannot be priced".

### 2. Fix pricing on the Family tab
- Typing a price and confirming it writes the price **against the linked lens** on the selected price list —
  the same place the WSPL Stock List tab writes, so one number, one source of truth.
- The row immediately reflects the saved value, the "x of y priced" badge updates, and any failure shows a
  clear error instead of silently reverting.
- Resolve readable names (material, style, manufacturer) for each family instead of the raw code.

### 3. One pricing ecosystem across every ordering surface
Introduce a single price-resolution function used everywhere, with this order:

```text
customer's assigned price list  ->  Retail price list  ->  standard catalogue price
```

Wire it into:
- customer portal **Rx order form**
- customer portal **stock order form**
- **online store** (signed-in trade customers see their own prices)
- **admin order-taking on behalf of a customer** (already uses this order; it becomes the shared one)

So when a price list is assigned to a customer, those prices apply the moment they log in, and the same
numbers appear when staff place an order for them.

### 4. End-to-end test
Walk the whole flow on a test price list: price a family -> confirm the lens price is stored -> assign the
list to a test account -> check the price shown in the store, the portal Rx form, the stock order form and
admin order-taking all match -> confirm an unpriced item falls back to Retail. Clean up test rows afterwards.

## Technical notes

- New table `innovations_family_lens_map (innovations_lens_id, lens_id, match_source, confidence)`, seeded via
  `innovations_store_lens_power_rows.right_opc = store_product_variants.opc_code`, RLS: staff read, editors write.
- `StockSkuPricingTab.tsx` switches from `row_type='stock_variant'` to writing `catalog_type='stock',
  row_type='lens', item_id = lens_id` through `usePricelistCatalogRowUpsert`, and reads from the same
  React Query key the upsert invalidates (current mismatch: `stock-variant-catalog-rows` vs
  `pricelist-catalog-rows`).
- Generalise `resolve_stock_order_price` into `resolve_customer_price(p_customer_id, p_product_type,
  p_product_id, p_variant_id)` without the editor-only guard, security definer, returning price + source;
  portal/store read paths (`useTradePricing`, Rx order pricing, stock order catalog) call it instead of
  building maps client-side. Cost stays hidden for non-editor callers.
- Existing `matrix_allocations` Rx lens pricing stays the authority for Rx matrix cells; the new function
  defers to it for lenses priced there.
- Retired `stock_variant` rows: none exist, so no data migration needed.
