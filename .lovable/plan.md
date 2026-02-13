

# Dual-Currency Fix: Addons Cost Column + FX Rate Correction

## Three Issues to Fix

### 1. FX Rate Data is Wrong (Root Cause of Bad Conversions)

The active pricing settings have `fx_rates: {"USD": 1, "BBD": 2}`. The conversion formula is `supplier_cost * rate * (1 + buffer)`. With USD rate = 1, a $10 USD cost converts to $10.20 BBD instead of the correct ~$20.40 BBD.

**Fix**: The USD rate should be `2.0` (meaning 1 USD = 2 BBD). This is a data fix, not a code fix -- the formula is correct, the stored rate is wrong.

**Action**: Update the active pricing_settings row to set `fx_rates` to `{"USD": 2, "BBD": 1}` (BBD-to-BBD is 1:1, USD-to-BBD is 2:1).

### 2. Addons Table Missing Cost Column

The `addons` table only has `price` (the sell price in BBD). There is no supplier cost (USD) field. This means the addon catalog can't show Cost (USD) like the other catalogs do.

**Action**: Add a `cost` column (numeric, default 0) to the `addons` table via migration.

### 3. LensDataTable Missing Sell (USD) Column

SupplyDataTable already computes and shows Sell (USD) using the FX rate. LensDataTable does not -- it only shows Cost (USD) and Sell (BBD).

## Changes

### Database

| Change | Detail |
|--------|--------|
| Migration | Add `cost numeric NOT NULL DEFAULT 0` to `addons` table |
| Data fix | Update active `pricing_settings` row: set `fx_rates` to `{"USD": 2, "BBD": 1}` |

### Files

| File | Change |
|------|--------|
| `src/hooks/useAddons.ts` | Add `cost: number` to `Addon` interface and `AddonFormData` |
| `src/components/admin/AddonFormDialog.tsx` | Add "Cost (USD)" input field next to "Price (BBD)" |
| `src/components/admin/AddonDataTable.tsx` | Rename "Price" to "Sell (BBD)"; add "Cost (USD)" and "Sell (USD)" columns; import usePricingEngine for FX rate |
| `src/components/admin/LensDataTable.tsx` | Add "Sell (USD)" column using same FX rate pattern as SupplyDataTable |
| `src/components/admin/ImportAddonsTab.tsx` | Add Cost (USD) column to import preview |
| `src/pages/admin/AddonsPage.tsx` | Pass `cost` through in create/update/duplicate handlers |

### Sell (USD) Calculation (consistent across all three catalogs)

All three data tables will use the same pattern already in SupplyDataTable:

```typescript
const { settings } = usePricingEngine();
const fxRate = useMemo(() => {
  if (!settings) return 2;
  const rates = settings.fx_rates as Record<string, number>;
  return (rates["USD"] ?? 1) * (1 + settings.fx_risk_buffer);
}, [settings]);

// Then per row:
const sellUsd = fxRate > 0 ? (sellPriceBbd / fxRate).toFixed(2) : "---";
```

### Column Layout (consistent across all catalogs)

All catalog data tables will show these pricing columns:

```text
... | Cost (USD) | Sell (BBD) | Sell (USD) | ...
```

