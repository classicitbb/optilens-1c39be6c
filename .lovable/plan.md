

# Dual-Currency Display (USD / BBD)

## The Problem

Every number in the system is technically in one currency or the other, but the UI doesn't say which. Users see "Cost: 25.00" and "Sell Price: 120.00" without knowing if that's USD or BBD. This causes confusion.

## The Leanest Solution: Label, Don't Duplicate

**No new database columns needed.** Here's why:

- `base_price` is already stored as the supplier's price (USD for imports, BBD for local/BB items)
- `sell_price` is already the local retail price (BBD) -- what customers pay
- The USD equivalent of any BBD value is just `value / fx_rate` -- a display calculation

Adding a `sell_price_usd` column would create a sync problem: every time the FX rate changes, you'd need to update thousands of rows. Instead, we compute it on the fly.

## Currency Rules (made explicit)

```text
STAGE                    CURRENCY    SOURCE
-----                    --------    ------
Supplier Cost            USD         User input (base_price)
FX Converted Cost        BBD         Engine: supplier_cost * fx_rate * (1 + buffer)
CIF                      BBD         Engine: converted + insurance
Duty                     BBD         Customs calculates in local
Charges                  BBD         Local fees
VAT                      BBD         Local tax
Landed Cost              BBD         Sum of above
Overhead                 BBD         Local operational cost
Financing                BBD         Local cost of capital
Holding                  BBD         Local warehousing
Shrinkage                BBD         Local
Labour                   BBD         Local
Full Cost                BBD         Sum of all above
Strategic Price          BBD         Derived from full cost + margin
Sell Price               BBD         User input (sell_price)
Sell Price (USD equiv)   USD         Display only: sell_price / fx_rate
```

## What Changes

### 1. Pricing Engine Output -- add currency labels

Update `PricingEngineResult` to include:
- `supplier_cost_usd`: the original USD input (pass-through)
- `sell_price_usd`: computed as `sell_price / fx_rate` (display convenience)
- `fx_rate_used`: the effective rate applied (for transparency)

These are computed fields added to the engine return, not stored in the database.

### 2. Form Dialogs (SupplyFormDialog, LensFormDialog)

Update the "Pricing and Cost" section:
- Label the Cost input as **"Supplier Cost (USD)"**
- Label the Sell Price input as **"Sell Price (BBD)"**
- In the Calculated Values section, add currency suffixes to every label:
  - "Converted (BBD)", "CIF (BBD)", "Duty (BBD)", etc.
  - "Full Cost (BBD)", "Strategic Price (BBD)"
- Add a new read-only row: **"Sell Price (USD)"** showing the reverse-converted value
- Add a read-only row: **"FX Rate"** showing the rate being used

### 3. Data Tables (SupplyDataTable, LensDataTable)

Update column headers:
- "Cost" becomes **"Cost (USD)"**
- "Sell" becomes **"Sell (BBD)"**
- Add a new column: **"Sell (USD)"** showing the computed USD equivalent

### 4. Import Review Tables

Same dual-currency display in the import preview tables -- show both BBD and USD columns for sell price.

### 5. BB Items (local purchases)

For `bb_item = true`, the supplier cost is already in BBD (no conversion). The UI should:
- Label Cost as **"Supplier Cost (BBD)"** when bb_item is checked
- Skip the FX conversion display (rate = 1)
- Still show sell price in both BBD and USD

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/usePricingEngine.ts` | Add `supplier_cost_usd`, `sell_price_usd`, `fx_rate_used` to result |
| `src/components/admin/SupplyFormDialog.tsx` | Currency labels on inputs + calculated values + USD sell price row |
| `src/components/admin/LensFormDialog.tsx` | Same currency labeling |
| `src/components/admin/SupplyDataTable.tsx` | Rename columns + add Sell (USD) column |
| `src/components/admin/LensDataTable.tsx` | Rename columns + add Sell (USD) column |
| `src/components/admin/ImportSuppliesTab.tsx` | Dual currency columns in preview |
| `src/components/admin/ImportLensesTab.tsx` | Dual currency columns in preview |
| `src/components/admin/ImportAddonsTab.tsx` | Dual currency columns in preview |

## What This Does NOT Do (intentionally)

- Does NOT add new database columns -- avoids sync issues when FX rates change
- Does NOT change how data is stored -- `base_price` stays as supplier currency, `sell_price` stays as BBD
- Does NOT require a migration -- purely UI and engine output changes
- Does NOT change the pricing engine math -- just adds labels and a reverse conversion

## Technical Detail

The reverse conversion uses the same FX rate from pricing settings:

```typescript
// In calculatePricingEngine, after all calculations:
const fxRates = settings.fx_rates as Record<string, number>;
const effectiveRate = bb_item ? 1 : (fxRates[currency] ?? 1) * (1 + settings.fx_risk_buffer);

return {
  ...existingResult,
  supplier_cost_usd: supplier_cost,
  sell_price_usd: sell_price != null && effectiveRate > 0
    ? sell_price / effectiveRate
    : null,
  fx_rate_used: effectiveRate,
};
```

