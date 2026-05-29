## Diagnosis

**Root cause:** stale-closure spread in `updateCharge` / `updateLine` in `src/pages/admin/costings/ShipmentDetailPage.tsx`.

```ts
const updateCharge = (charge, field, value) =>
  upsertCharge.mutate({ ...charge, [field]: value });   // ← spreads whole row
```

Sequence that reproduces the bug:

1. User types **VAT = 13.50** in row R, blurs → mutation sends `{...charge, vat_bbd: 13.5}`. DB now has VAT 13.5.
2. React-Query invalidates `shipment-charges`, refetch is in flight (async).
3. Before the refetch result lands and re-renders the row, the user edits **another cell in the same row** (Duty, Notes, VAT-Reclaimable toggle, or even Charge Type). The cell's onChange still closes over the **previous** `charge` object where `vat_bbd = 0`.
4. The next mutation sends `{...staleCharge, duty_bbd: x}` — which includes `vat_bbd: 0` — clobbering the value just saved.

Same pattern in `updateLine` (e.g. typing qty then unit FOB then markup back-to-back resets earlier fields).

DB confirms the symptom: all 4 charges on shipment `3afe3749…` show `vat_bbd = 0` / `duty_bbd = 0` even though only `amount_bbd` got persisted — whichever field was edited last per row "won".

Triggers/generated columns/RLS are not the culprit (verified: plain numeric columns, no triggers).

Activity in the Line Items tab doesn't write to charges directly, but switching tabs / typing into lines causes additional renders and lets the user touch the charge cells again later — at which point the still-cached stale charge object overwrites the saved VAT/Duty.

## Fix

Send only the changed field instead of spreading the whole row. The hook's upsert already accepts `Partial<ShipmentCharge>` and updates by `id`, so a minimal payload is safe.

### Edits in `src/pages/admin/costings/ShipmentDetailPage.tsx`

1. **`updateCharge`** — change to `upsertCharge.mutate({ id: charge.id, [field]: value })`.
2. **`updateLine`** — change to `upsertLine.mutate({ id: line.id, ...updates })`. (No spread of `line`.)
3. **`handleProductSelect`** — same: send `{ id: line.id, lens_id, supply_id, addon_id, description }` only.
4. **`handleProductTypeChange`** — send `{ id: line.id, product_type, lens_id: null, supply_id: null, addon_id: null }` only.
5. The two compound line edits that update qty + line_fob simultaneously (Qty and Unit FOB cells) already pass an `updates` object — they'll be safe once `updateLine` no longer spreads `line`.

### Optional hardening (same file)

- In `NumericInput`/`TextInput` `commit()`, if the value hasn't actually changed, skip the call (already done for numeric; keep).
- No hook changes required. `useShipmentCharges`/`useShipmentLines` already handle partial updates correctly.

### Validation

- Edit VAT → Duty → Notes in the same row rapidly; all three persist.
- Reload page: values match what was typed.
- Re-query `shipment_charges` for the affected shipment and confirm non-zero VAT/Duty.
- Repeat with line items (Qty, Unit FOB, Markup) — none reset.

No schema, RLS, or migration changes needed.
