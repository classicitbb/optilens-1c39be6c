

# Enhanced Add-Ons Catalog

## Overview

Upgrade the existing `addons` table and admin UI to support SKU, web visibility, deletion, duplication, and pricing sheet assignments. This turns the add-ons catalog into a full internal pricing tool component.

## Database Changes

### 1. Alter `addons` table -- add columns

| New Column | Type | Default | Purpose |
|------------|------|---------|---------|
| sku | text | '' | Internal SKU/code for the add-on |
| show_on_website | boolean | false | Controls storefront visibility |

### 2. New junction table: `addon_pricing_sheets`

Links add-ons to one or more pricing sheets (many-to-many).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| addon_id | uuid | FK to addons.id, ON DELETE CASCADE |
| pricing_sheet_id | uuid | FK to pricing_sheets.id, ON DELETE CASCADE |
| price_override | numeric, nullable | Optional per-sheet price (falls back to addon.price if null) |
| created_at | timestamp | Standard |

Unique constraint on (addon_id, pricing_sheet_id) to prevent duplicates.

RLS policies: same editor/role-user pattern as other admin tables.

## UI Changes

### Data Table (`AddonDataTable.tsx`)

Add columns:
- **SKU** -- displayed after Name
- **Web** -- a small globe icon or checkmark indicating `show_on_website`
- Row-level action buttons (visible on hover or always): **Duplicate** and **Delete**

### Form Dialog (`AddonFormDialog.tsx`)

Add fields:
- **SKU** text input
- **Show on Website** toggle switch
- **Pricing Sheets** multi-select checklist showing all active pricing sheets, with optional per-sheet price override

### Page (`AddonsPage.tsx`)

- Add **Duplicate** handler: copies all fields of an add-on (appending " (Copy)" to name, clearing SKU) and creates a new record
- Add **Delete** handler with confirmation dialog (admin-only, following existing delete patterns)

### Hook (`useAddons.ts`)

- Add `sku` and `show_on_website` to `Addon` and `AddonFormData` interfaces
- Add `deleteMutation` for removing add-ons
- Add `duplicateMutation` that reads an existing add-on and inserts a copy

### New Hook: `useAddonPricingSheets.ts`

- Fetches assigned pricing sheets for a given addon_id
- Provides mutations to assign/unassign pricing sheets
- Supports setting price_override per sheet

## Technical Details

### Migration SQL (single migration)

```sql
-- Add columns to addons
ALTER TABLE public.addons
  ADD COLUMN sku text NOT NULL DEFAULT '',
  ADD COLUMN show_on_website boolean NOT NULL DEFAULT false;

-- Junction table
CREATE TABLE public.addon_pricing_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_id uuid NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  pricing_sheet_id uuid NOT NULL REFERENCES public.pricing_sheets(id) ON DELETE CASCADE,
  price_override numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(addon_id, pricing_sheet_id)
);

ALTER TABLE public.addon_pricing_sheets ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as addons)
CREATE POLICY "Editors can insert addon_pricing_sheets"
  ON public.addon_pricing_sheets FOR INSERT
  WITH CHECK (has_edit_role(auth.uid()));

CREATE POLICY "Editors can update addon_pricing_sheets"
  ON public.addon_pricing_sheets FOR UPDATE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Editors can delete addon_pricing_sheets"
  ON public.addon_pricing_sheets FOR DELETE
  USING (has_edit_role(auth.uid()));

CREATE POLICY "Role users can select addon_pricing_sheets"
  ON public.addon_pricing_sheets FOR SELECT
  USING (has_any_role(auth.uid()));
```

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAddons.ts` | Add sku, show_on_website fields; add delete + duplicate mutations |
| `src/hooks/useAddonPricingSheets.ts` | **New** -- CRUD for addon-to-sheet assignments |
| `src/components/admin/AddonDataTable.tsx` | Add SKU, Web columns; add Duplicate/Delete row actions |
| `src/components/admin/AddonFormDialog.tsx` | Add SKU input, Show on Website toggle, pricing sheets multi-select |
| `src/pages/admin/AddonsPage.tsx` | Add duplicate + delete handlers with confirmation |

### Duplicate Behavior

When duplicating an add-on:
- Copies: name (with " (Copy)" suffix), category, description, price, is_auto, auto_rule, is_active, sort_order, show_on_website
- Clears: SKU (set to empty -- user must assign a unique one)
- Does NOT copy pricing sheet assignments (user assigns after creation)

### Delete Behavior

- Admin-only action (matching existing delete patterns)
- Confirmation dialog before deletion
- CASCADE deletes related `addon_pricing_sheets` rows automatically

