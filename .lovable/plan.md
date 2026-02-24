

## Implement WSPL-Specific Margin Rules for Stock Lenses

This plan covers three tasks: (1) adding WSPL margin rules, (2) wiring them through the UI, and (3) adding a Wiki article.

---

### 1. Database Migration -- Add WSPL defaults to pricing_settings

Add `wspl` keys to the default JSONB values for `category_margin_floors` and `category_target_margins`, and backfill any existing rows missing the key.

```sql
-- Update column defaults
ALTER TABLE pricing_settings
  ALTER COLUMN category_margin_floors SET DEFAULT '{"addons":0.20,"frames":0.35,"lenses":0.30,"wspl":0.25,"supplies":0.25}'::jsonb,
  ALTER COLUMN category_target_margins SET DEFAULT '{"addons":0.40,"frames":0.50,"lenses":0.50,"wspl":0.40,"supplies":0.45}'::jsonb;

-- Backfill existing rows
UPDATE pricing_settings
  SET category_margin_floors = category_margin_floors || '{"wspl":0.25}'::jsonb
  WHERE NOT (category_margin_floors ? 'wspl');

UPDATE pricing_settings
  SET category_target_margins = category_target_margins || '{"wspl":0.40}'::jsonb
  WHERE NOT (category_target_margins ? 'wspl');
```

---

### 2. PricingSettingsTab -- Add WSPL to defaults

**File:** `src/components/admin/PricingSettingsTab.tsx`

Update the `DEFAULTS` constant so new versions created from the UI include the `wspl` key:

- `category_margin_floors`: add `wspl: 0.25`
- `category_target_margins`: add `wspl: 0.40`

No other changes needed -- the existing `JsonGrid` widget already renders all keys dynamically.

---

### 3. MarginBadge -- Accept configurable margin floor

**File:** `src/components/admin/MarginBadge.tsx`

- Add an optional `marginFloor` prop (default `20`).
- Replace the hardcoded `marginPercent < 20` warning check with `marginPercent < marginFloor`.
- Update the warning text from "below 20% floor" to "below {marginFloor}% floor".

---

### 4. ListCatalogTab -- Use WSPL floor for stock lenses

**File:** `src/components/admin/ListCatalogTab.tsx`

- Import `usePricingSettings` (or the active settings hook).
- When `catalogType === "stock"`, read the `wspl` floor from `settings.category_margin_floors.wspl` (converted to percent, e.g., 0.25 becomes 25).
- For non-stock catalog types, use the appropriate category floor (lenses for rx, supplies for buysell).
- Pass this floor value as the `marginFloor` prop to every `MarginBadge` rendered in the table rows.

---

### 5. LineOverrideDialog -- Use WSPL category for stock overrides

**File:** `src/components/admin/LineOverrideDialog.tsx`

- Add an optional `marginFloor` prop.
- Pass `marginFloor` to the `MarginBadge` inside the dialog.
- Update the warning threshold check (`margin < 20`) to use `marginFloor` instead of hardcoded 20.
- The calling code in `ListCatalogTab` already knows the catalog type and will pass the correct floor.

---

### 6. Wiki -- Add WSPL Pricing article

**File:** `src/data/wikiContent.ts`

Update the existing "Stock Lens Prices (WSPL)" article (`id: "stock-lens-prices"`) in the pricing-engine category to include a detailed explanation of how WSPL margin rules differ from RX:

- WSPL lenses use a separate margin floor (`wspl` category in Pricing Settings), typically lower than the standard `lenses` floor.
- WSPL lenses use a separate target margin (`wspl` category), typically lower than the `lenses` target.
- These values are configurable in Settings under "Category Margin Floors" and "Category Target Margins".
- Governance warnings and line override dialogs on the Stock Lens Prices page use the WSPL floor, not the lenses floor.
- Only lenses with the WSPL flag enabled in the Product Catalog appear in this module.

---

### Summary of files changed

| File | Change |
|------|--------|
| Migration (SQL) | Add `wspl` defaults, backfill existing rows |
| `PricingSettingsTab.tsx` | Add `wspl` to `DEFAULTS` object |
| `MarginBadge.tsx` | Add `marginFloor` prop, use it in warning |
| `ListCatalogTab.tsx` | Read WSPL floor from settings, pass to MarginBadge |
| `LineOverrideDialog.tsx` | Add `marginFloor` prop, pass to MarginBadge and warning |
| `wikiContent.ts` | Expand WSPL article with margin rule documentation |

