

# Fix: Missing Currency Labels Across Admin Forms

## Issues Found

### 1. AddonFormDialog -- No currency on Price field
- "Price" label needs to become **"Price (BBD)"**
- Pricing sheet override placeholder "Override $" should become **"Override (BBD)"**

### 2. LensFormDialog -- Missing Sell (USD) equivalent
- "Base Price (USD)" and "Sell Price (BBD)" labels are correct
- Missing: a read-only **"Sell (USD)"** field showing the reverse-converted value
- Missing: **FX Rate** display for transparency
- Requires importing usePricingEngine to compute the USD equivalent

### 3. PricingSettingsTab -- Monetary fields unlabeled
- "Brokerage Fee" should become **"Brokerage Fee (BBD)"**
- "Port Charges" should become **"Port Charges (BBD)"**
- Rounding Rule options "$0.50" / "$1.00" should become **"BBD 0.50"** / **"BBD 1.00"**

## Changes

| File | What Changes |
|------|-------------|
| `src/components/admin/AddonFormDialog.tsx` | "Price" label becomes "Price (BBD)"; override placeholder becomes "Override (BBD)" |
| `src/components/admin/LensFormDialog.tsx` | Add usePricingEngine import; compute sell_price_usd and fx_rate; add read-only "Sell (USD)" and "FX Rate" fields in the Pricing section |
| `src/components/admin/PricingSettingsTab.tsx` | Add "(BBD)" to Brokerage Fee and Port Charges labels; change rounding rule display to "BBD 0.50" / "BBD 1.00" |

## Technical Detail

For the LensFormDialog, the pricing engine call will be minimal -- just enough to get the FX rate and compute the USD equivalent:

```typescript
const { calculate } = usePricingEngine();
const calc = useMemo(() => calculate({
  component_type: "lenses",
  supplier_cost: form.base_price,
  currency: "USD",
  bb_item: false,
  vat_recoverable: false,
  duty_applicable: true,
  labour_cost: 0,
  category: "lenses",
  sell_price: form.sell_price,
}), [form.base_price, form.sell_price, calculate]);
```

Then display `calc?.sell_price_usd` and `calc?.fx_rate_used` as read-only fields alongside the existing Margin field.

