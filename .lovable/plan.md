

# Part 2: Central Pricing Engine (`usePricingEngine`)

## Overview

Create a new reusable hook `usePricingEngine()` that replaces the old `calculateLandedCost` function with a proper import costing model. It reads from the versioned `pricing_settings` table (active version) and implements the full landed cost, operational cost, and strategic pricing logic described in the spec.

The old `calculateLandedCost` function in `useCompanySettings.ts` remains for backward compatibility but its consumer (`SupplyFormDialog.tsx`) will be migrated to use the new engine.

## Engine Logic Summary

```text
Input --> Currency Conversion --> CIF --> Duty/Charges/VAT --> Landed Cost
      --> Operational Layer (overhead, financing, holding, shrinkage, labour)
      --> Full Cost
      --> Strategic Price (target margin)
      --> Margin Analysis & Governance Flags
```

### Step-by-step:

1. **Currency conversion**: If `bb_item`, use cost as-is. Otherwise multiply by FX rate (from `pricing_settings.fx_rates`) plus risk buffer.
2. **CIF**: `converted_cost + freight_allocation + insurance`
3. **Import duties/charges**: `duty = CIF x duty_rate[category]`, `charges = brokerage + port_charges`, `VAT = (CIF + duty + charges) x vat_rate` (included in landed cost only if VAT is not recoverable)
4. **Landed cost**: `CIF + duty + charges + (VAT if not recoverable)` -- or just `converted_cost` if not imported
5. **Operational layer**: overhead, financing (cost_of_capital x days/365), holding (inventory_holding x days/365), shrinkage -- all as percentages of landed cost, plus labour_cost as absolute value
6. **Full cost**: `landed_cost + overhead + financing + holding + shrinkage + labour_cost`
7. **Strategic price**: `full_cost / (1 - target_margin)` using category target or company default
8. **Margin**: `(sell_price - full_cost) / sell_price`
9. **Governance flags**: `below_floor`, `at_loss`, `below_target`, `exceeds_price_increase`

## Interface Definitions

### Input

```typescript
interface PricingEngineInput {
  component_type: string;       // "lenses" | "frames" | "supplies" | "addons"
  supplier_cost: number;
  currency: string;             // e.g. "USD"
  bb_item: boolean;
  vat_recoverable: boolean;
  duty_applicable: boolean;
  labour_cost: number;
  category: string;             // maps to duty_rates keys
  avg_days_in_stock?: number;   // override, falls back to settings default
  sell_price?: number;          // optional, for margin calculation
  previous_sell_price?: number; // optional, for price increase check
}
```

### Output

```typescript
interface PricingEngineResult {
  converted_cost: number;
  cif: number;
  duty: number;
  charges: number;
  vat: number;
  landed_cost: number;
  overhead: number;
  financing: number;
  holding: number;
  shrinkage: number;
  labour: number;
  full_cost: number;
  strategic_price: number;
  margin: number | null;        // null if no sell_price provided
  margin_status: "healthy" | "thin" | "below_floor" | "loss" | null;
  governance_flags: {
    below_floor: boolean;
    at_loss: boolean;
    below_target: boolean;
    exceeds_price_increase: boolean;
  };
}
```

## Implementation

### Pure function: `calculatePricingEngine(input, settings)`

A stateless pure function that takes the input and a `PricingSettings` object and returns `PricingEngineResult`. This makes it testable and usable outside React.

### Hook: `usePricingEngine()`

A React hook that:
1. Fetches the active `pricing_settings` version (reuses the existing query from `usePricingSettings`)
2. Returns a `calculate(input)` function that calls the pure function with the loaded settings
3. Also exposes `settings`, `isLoading`

```typescript
const { calculate, settings, isLoading } = usePricingEngine();
const result = calculate({ supplier_cost: 10, currency: "USD", ... });
```

### Migration of `SupplyFormDialog.tsx`

Replace the `calculateLandedCost` call with the new engine:
- Map the existing form fields to `PricingEngineInput`
- Display the richer result set (full_cost, strategic_price, margin, flags)

## Files

| File | Action |
|------|--------|
| `src/hooks/usePricingEngine.ts` | **New** -- pure function `calculatePricingEngine` + hook `usePricingEngine` |
| `src/components/admin/SupplyFormDialog.tsx` | Update to use `usePricingEngine` instead of `calculateLandedCost` |

No database changes needed -- reads from the existing `pricing_settings` table created in Part 1.

