

# Phase 1B: Lens Catalog and Pricing Engine

Phase 1A delivered the admin shell, RBAC, reference data CRUD, and user management. Phase 1B builds the core of the pricing tool: the **Lens Catalog** -- a master table of lens products composed from the reference data, each with pricing and metadata.

---

## Overview

The Lenses page (currently a placeholder at `/admin/lenses`) becomes a fully functional module where operators define lens SKUs by combining reference data (supplier, brand, material, MF type, lens type) with pricing fields, prescription parameters, and optional lens options. This is the central data model the rest of the tool revolves around.

---

## 1. Database: `lenses` Table

A new `lenses` table that ties together all reference entities into a single lens product record.

### Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | Default `gen_random_uuid()` |
| `supplier_id` | uuid, FK -> suppliers | Required |
| `brand_id` | uuid, FK -> brands | Required |
| `material_id` | uuid, FK -> materials | Required |
| `mftype_id` | uuid, FK -> mftypes | Required (manufacturing type) |
| `lenstype_id` | uuid, FK -> lenstypes | Required (SV, progressive, bifocal, etc.) |
| `name` | text | Display name / SKU description |
| `index_value` | numeric(3,2) | Refractive index (e.g. 1.50, 1.67, 1.74) |
| `base_price` | numeric(10,2) | Base wholesale cost |
| `sell_price` | numeric(10,2) | Sell / list price |
| `sph_min` | numeric(5,2) | Min sphere power (e.g. -12.00) |
| `sph_max` | numeric(5,2) | Max sphere power (e.g. +8.00) |
| `cyl_min` | numeric(5,2) | Min cylinder power |
| `cyl_max` | numeric(5,2) | Max cylinder power |
| `add_min` | numeric(5,2), nullable | Min ADD power (progressives/bifocals only) |
| `add_max` | numeric(5,2), nullable | Max ADD power |
| `is_active` | boolean | Default true |
| `notes` | text, nullable | Free-text notes |
| `created_at` | timestamptz | Default now() |
| `updated_at` | timestamptz | Default now(), auto-updated via trigger |

### Junction Table: `lens_lens_options`

Many-to-many relationship between lenses and lens_options (coatings, treatments, add-ons).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | Default `gen_random_uuid()` |
| `lens_id` | uuid, FK -> lenses | ON DELETE CASCADE |
| `lens_option_id` | uuid, FK -> lens_options | |
| `extra_cost` | numeric(10,2) | Additional cost for this option, default 0 |
| Unique constraint on (lens_id, lens_option_id) | | |

### RLS Policies

- **SELECT**: `has_any_role(auth.uid())` -- any admin tool user can view
- **INSERT / UPDATE**: `has_edit_role(auth.uid())` -- admin and operator only
- No DELETE policy (soft-deactivation via `is_active`)
- Same policies for `lens_lens_options`

### Triggers

- `update_updated_at_column` trigger on `lenses` (reuse existing function)

---

## 2. Lenses Page UI (`/admin/lenses`)

Replaces the current placeholder with a full data management page.

### Top Section
- Page title "Lens Catalog"
- Filter bar: All / Active / Inactive tabs (same pattern as reference data)
- Search input to filter by name, supplier, or brand
- "Add Lens" button (operator/admin only)
- Record count indicator

### Data Grid
A dense table with the following columns:
- **Name** (sortable)
- **Supplier** (display name from FK, sortable)
- **Brand** (display name from FK, sortable)
- **Material** (display name)
- **Lens Type** (display name)
- **Index** (e.g. "1.67")
- **Base Price** (formatted currency)
- **Sell Price** (formatted currency)
- **Status** (Active/Inactive badge)
- **Active toggle** (Switch, editors only)

Clicking a row opens the lens detail/edit form.

### Add/Edit Form (Full-Page or Large Modal)

Since lenses have many fields, this will be a larger dialog or slide-over panel with grouped sections:

**Section 1 -- Identity**
- Name (text input)
- Supplier (Select dropdown, populated from `suppliers` where `is_active = true`)
- Brand (Select dropdown from `brands`)
- Material (Select dropdown from `materials`)
- MF Type (Select dropdown from `mftypes`)
- Lens Type (Select dropdown from `lenstypes`)

**Section 2 -- Specifications**
- Index Value (numeric input, step 0.01)
- SPH Range: min / max (two numeric inputs side by side)
- CYL Range: min / max
- ADD Range: min / max (shown conditionally when lens type is progressive or bifocal)

**Section 3 -- Pricing**
- Base Price (numeric input)
- Sell Price (numeric input)
- Margin display (calculated: sell - base, shown as read-only)

**Section 4 -- Options**
- Multi-select checklist of active `lens_options`
- Each selected option shows an "Extra Cost" numeric input beside it

**Section 5 -- Notes**
- Textarea for free-text notes

**Footer**
- Cancel / Save buttons
- Active/Inactive toggle

---

## 3. Data Hook: `useLenses`

New hook at `src/hooks/useLenses.ts` following the existing react-query pattern:

- **Query**: Fetches lenses with joined reference data names (using Supabase's `select` with foreign key expansion: `supplier:suppliers(name), brand:brands(name), ...`)
- **Create mutation**: Inserts lens + lens_lens_options rows
- **Update mutation**: Updates lens fields + upserts lens_lens_options
- **Toggle active**: Quick mutation for `is_active` toggle

---

## 4. File Structure (new/modified files)

```text
src/
  hooks/
    useLenses.ts              (NEW - react-query hook for lenses CRUD)
  components/admin/
    LensDataTable.tsx          (NEW - dense grid for lens catalog)
    LensFormDialog.tsx         (NEW - add/edit form dialog)
  pages/admin/
    LensesPage.tsx             (NEW - replaces PlaceholderPage for /admin/lenses)
  App.tsx                      (MODIFIED - swap PlaceholderPage for LensesPage on /admin/lenses route)
```

---

## 5. Routing Changes

In `App.tsx`, replace the lenses placeholder:

```text
Before:  <Route path="lenses" element={<PlaceholderPage />} />
After:   <Route path="lenses" element={<LensesPage />} />
```

No other routing changes needed.

---

## Technical Notes

- Foreign key joins via Supabase PostgREST: `supabase.from('lenses').select('*, supplier:suppliers(name), brand:brands(name), material:materials(name), mftype:mftypes(name), lenstype:lenstypes(name), lens_lens_options(lens_option_id, extra_cost, lens_option:lens_options(name))')` to get all related names in a single query.
- The form dropdowns will query active reference data using the existing `useReferenceData` hook, filtered to `is_active = true`.
- Numeric fields for prescription ranges use step="0.25" to match standard optical increments.
- Index value uses step="0.01" for precision.
- Currency fields display with 2 decimal places.
- The lens form validates that `sph_min <= sph_max`, `cyl_min <= cyl_max`, and `add_min <= add_max` before submission.
- The `lens_lens_options` junction table is managed transactionally: on lens save, delete existing options and re-insert the current selection.

