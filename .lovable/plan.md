

# Unified Store with Database-Driven Products

## Recommendation: One Store, One Product Table, Filtered Views

Rather than separate storefronts, the cleanest approach is a **single unified store page** with a **top-level product type filter** (All / Lenses / Supplies), plus a **single `products` table** in the database that both the admin tool and storefront read from.

Here's why this is better than separate pages:
- Customers often buy lenses AND supplies together -- one cart, one checkout
- Simpler navigation: `/store` is your shop, filters handle the rest
- The admin side already has patterns for managing reference data; supplies fit right in
- The existing `show_on_website` flag on lenses already controls storefront visibility -- we extend this pattern

## Architecture Overview

```text
+------------------+        +------------------+
|   Admin Tool     |        |   Storefront     |
|                  |        |                  |
|  Lens Catalog    |------->|  /store          |
|  (existing)      |        |  [Lenses tab]    |
|                  |        |                  |
|  Supply Catalog  |------->|  [Supplies tab]  |
|  (new)           |        |                  |
+------------------+        +------------------+
        |                           |
        v                           v
   lenses table              Both tables queried
   supplies table             where show_on_website=true
   (new)
```

## What Changes

### 1. New `supplies` Database Table

A new table to store supply products, following existing conventions:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | Product name |
| category | text | "lab", "optical", or "accessories" |
| description | text | Product description |
| sku | text | Optional SKU code |
| base_price | numeric | Cost price |
| sell_price | numeric | Customer price |
| unit | text | "each", "box", "case", etc. |
| quantity_per_unit | integer | e.g., 100 wipes per box |
| is_active | boolean | Admin visibility |
| show_on_website | boolean | Storefront visibility |
| image_url | text | Optional product image |
| notes | text | Optional |
| created_at / updated_at | timestamps | Standard |

RLS policies will mirror the existing lens table pattern (editors can CRUD, role users can SELECT).

### 2. Admin: New Supply Catalog Page

A new `/admin/supplies` page following the same pattern as the Lens Catalog:
- Data table with search/filter by category
- Form dialog for creating/editing supplies
- Active toggle
- Much simpler form than lenses (no prescription ranges, no reference entity combos)

A new sidebar entry "Supplies" will be added under the existing "Lens Catalog" link.

### 3. Storefront: Refactored `/store` Page

Replace the current hardcoded product array with **database-driven products**:

- **Top-level tabs**: "All Products" | "Lenses" | "Supplies" (or category chips)
- **Lenses section**: Queries the `lenses` table where `show_on_website = true`, displaying name, material, type, and sell price
- **Supplies section**: Queries the `supplies` table where `show_on_website = true`, grouped by category (Lab / Optical / Accessories)
- **Shared filters**: Search works across both; category filter adapts based on active tab
- **Same cart behavior**: Both product types add to the existing cart (the cart already stores product name + price generically)

### 4. Cart Compatibility

The existing `cart_items` table already stores `product_name`, `product_price`, and a generic `product_id` (integer). We'll add a `product_type` column ("lens" or "supply") so checkout and order history can distinguish them. The cart, checkout, and order flows remain otherwise unchanged.

### 5. Navigation Updates

The existing Products dropdown supply links will become real links to `/store?tab=supplies&category=lab` etc., instead of placeholder buttons.

## Implementation Steps

1. Create the `supplies` table with a database migration (with RLS policies)
2. Add `product_type` column to `cart_items` and `order_items` tables
3. Build the admin Supply Catalog page (table + form dialog)
4. Add "Supplies" to the admin sidebar
5. Refactor the Store page to query both tables and add tab/filter UI
6. Update the Header product links to navigate to filtered store views
7. Create a `useSupplies` hook following the `useLenses` pattern
8. Create a `useStoreProducts` hook that merges lens + supply data for the storefront

## What We Are NOT Changing

- The existing Lens Catalog admin module stays as-is
- The lens data model stays as-is
- Auth, checkout, and order flows remain the same
- The cart system stays the same (just gets a type discriminator)

## Future Considerations (Not in This Phase)

- Stock lenses with base/add/color variants can be modeled later as a lens sub-type or variant system
- Quantity-based pricing tiers for supplies (e.g., bulk discounts) can be added as a separate pricing table
- Product images and richer descriptions can be layered on incrementally

