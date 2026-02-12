

# Test Products and Add-Ons Catalog

## Part 1: Seed Test Products

You already have one lens (`BF Flat Top 28 Activations Gray`) with `show_on_website = true`, so it should appear in the store. We will also insert a test supply product so both product types are visible.

**Test supply to insert:**
- Name: "Lens Cleaning Kit"
- Category: "lab"
- SKU: "SUPPLY-001"
- Base price: $8.00, Sell price: $14.99
- Unit: "box", Quantity per unit: 50
- `show_on_website = true`, `is_active = true`
- Description: "Professional-grade lens cleaning wipes, 50 per box"

We will also verify the existing lens appears correctly and fix any issues if needed.

---

## Part 2: Add-Ons Catalog

A new `addons` table and admin page to manage lens add-on products (coatings, treatments, surcharges).

### New Database Table: `addons`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | e.g. "Transitions Gen 8", "AR Coating", "Prism" |
| category | text | "coating", "mirror", "ar_coating", "prism", "high_power", "other" |
| description | text | What the add-on does |
| price | numeric | Extra cost added to the base lens |
| is_auto | boolean | Whether it auto-applies based on rules |
| auto_rule | jsonb | Rule definition, e.g. `{"sph_min": -15}` or `{"sph_max": 10}` or `{"has_prism": true}` |
| is_active | boolean | Admin visibility |
| sort_order | integer | Display ordering |
| created_at / updated_at | timestamps | Standard |

**RLS policies**: Same pattern as other admin tables (editors CRUD, role users SELECT).

### Auto-Apply Rules (the `auto_rule` JSONB field)

This flexible field allows defining when an add-on automatically applies:
- `{"sph_over": 10}` -- auto-add when SPH exceeds +10.00
- `{"sph_under": -15}` -- auto-add when SPH is below -15.00
- `{"has_prism": true}` -- auto-add when prism is present
- `null` -- optional add-on, user chooses manually

This keeps the schema simple now while allowing future rule expansion without migrations.

### Admin Page: `/admin/addons`

A new "Add-Ons" page in the admin sidebar (placed after "Supplies"), following the same dense table pattern:

- **Data table** with columns: Name, Category, Price, Auto/Optional, Active status
- **Form dialog** for creating/editing add-ons with fields for name, category, price, auto-apply toggle, and rule editor
- **Active toggle** per row
- Search/filter by category

### New Sidebar Entry

Add "Add-Ons" with a `Layers` icon after "Supplies" in the admin sidebar menu.

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useAddons.ts` | CRUD hook for addons table |
| `src/components/admin/AddonDataTable.tsx` | Data table component |
| `src/components/admin/AddonFormDialog.tsx` | Create/edit form dialog |
| `src/pages/admin/AddonsPage.tsx` | Admin page |

### Modified Files

| File | Change |
|------|--------|
| `src/components/admin/AdminSidebar.tsx` | Add "Add-Ons" menu item |
| `src/App.tsx` | Add route for `/admin/addons` |

---

## What This Does NOT Include (Future Phases)

- Storefront add-on configuration UI (building a lens order with add-ons selected)
- Price calculation engine (base lens + auto add-ons + selected add-ons = total)
- Linking specific add-ons to specific lens types (e.g., only certain coatings for certain materials)

These will be built once the catalog of available add-ons exists and has data in it.

