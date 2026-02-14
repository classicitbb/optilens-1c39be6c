

# Fix: Disable Duty and VAT in Lens Pricing Calculation

Lenses do not have import duty or VAT applied to their pricing. The current integration passes `duty_applicable: true` and `vat_recoverable: false` to the pricing engine, which causes duty, charges, and VAT to be calculated incorrectly.

## Change

In `src/components/admin/LensFormDialog.tsx`, update the pricing engine input:

- Set `duty_applicable: false` (no duty on lenses)
- Set `vat_recoverable: true` (effectively zeroes out VAT impact)

This means the pricing engine will skip the entire CIF/duty/charges/VAT block and use the converted cost directly as the landed cost, which is the correct behavior for lenses.

## Technical Detail

In `usePricingEngine.ts`, when `duty_applicable` is false (or `bb_item` is true), the engine skips duty/CIF calculation and sets `landed_cost = converted_cost`. Setting `duty_applicable: false` achieves this. The calculated values panel will then show 0 for CIF, Duty, Charges, and VAT fields.

### File to modify

| File | Change |
|------|--------|
| `src/components/admin/LensFormDialog.tsx` | Change `duty_applicable: true` to `duty_applicable: false` in the pricing engine call (~line 131) |

