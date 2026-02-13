

# Tabbed Import Page -- Lenses, Supplies, Add-Ons, Frames

## Overview

Convert the current Imports page into a tabbed interface with four tabs: **Lenses** (existing functionality), **Supplies**, **Add-Ons**, and **Frames** (placeholder for future use). Each tab will have its own independent import workflow.

## Changes

### 1. Refactor ImportsPage.tsx into a tabbed wrapper

- Add Radix Tabs at the top of the page with four tabs: Lenses | Supplies | Add-Ons | Frames
- Extract the current lens import content into a new component `ImportLensesTab.tsx`
- Each tab panel renders its own import component

### 2. Create new tab components

| File | Description |
|------|-------------|
| `src/components/admin/ImportLensesTab.tsx` | Extracted from current `ImportsPage.tsx` -- all existing lens import logic moves here unchanged |
| `src/components/admin/ImportSuppliesTab.tsx` | New CSV import for supplies -- drop zone, validation, preview table, import button (columns: Name, SKU, Category, Supplier, Brand, Cost, Sell Price, Currency, etc.) |
| `src/components/admin/ImportAddonsTab.tsx` | New CSV import for add-ons -- similar pattern (columns: Name, SKU, Category, Price, Supplier, etc.) |
| `src/components/admin/ImportFramesTab.tsx` | Placeholder tab showing "Coming soon" message |

### 3. Simplified ImportsPage.tsx

The page becomes a thin shell:

```text
+--------------------------------------------------+
| Import Data                          [Template v] |
+--------------------------------------------------+
| [Lenses] [Supplies] [Add-Ons] [Frames]           |
+--------------------------------------------------+
| (active tab content here)                         |
+--------------------------------------------------+
```

- The page title stays at the top
- Template download button becomes tab-specific (each tab has its own template)
- Tab state is stored locally (no URL changes needed)

### 4. Supplies and Add-Ons import tabs

These will follow the same pattern as the lens import:
- CSV drop zone with drag-and-drop
- Client-side validation against expected columns
- Preview table with status badges (New / Upsert / Error)
- Upsert logic based on name or SKU matching
- Template download for the expected CSV format

For the initial implementation, these tabs will show a simpler import flow (drop zone + preview + import button) without the reference resolution panel, since supplies and add-ons have fewer foreign key dependencies.

## Technical Details

### Files Changed

| File | Action |
|------|--------|
| `src/pages/admin/ImportsPage.tsx` | Rewrite as tabbed wrapper using Radix Tabs |
| `src/components/admin/ImportLensesTab.tsx` | **New** -- extracted lens import logic (moved from ImportsPage) |
| `src/components/admin/ImportSuppliesTab.tsx` | **New** -- CSV import for supplies |
| `src/components/admin/ImportAddonsTab.tsx` | **New** -- CSV import for add-ons |
| `src/components/admin/ImportFramesTab.tsx` | **New** -- placeholder "Coming soon" |
| `src/hooks/useImportSupplies.ts` | **New** -- hook for supply CSV parsing, validation, and upsert |
| `src/hooks/useImportAddons.ts` | **New** -- hook for add-on CSV parsing, validation, and upsert |

### Tab styling

Tabs will use the existing Radix Tabs component (`@/components/ui/tabs`) styled to match the admin interface aesthetic -- compact, slate tones, blue active indicator.

