

# Part 6: Governance Enforcement, Audit Logging, and Change Tracking

## Overview

Three interconnected features:

1. **Governance enforcement** in form dialogs -- block saves when pricing rules are violated, require reason selection when selling below strategic price
2. **Audit log table** -- records every create/update/delete across admin-managed tables with before/after snapshots
3. **Audit Log page** (`/admin/audit`) -- tabbed interface to browse change history by entity type

---

## 1. Database Changes

### New table: `audit_log`

A single audit trail table that captures all admin changes.

```sql
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,           -- e.g. "supplies", "lenses", "addons", "pricing_settings"
  record_id uuid NOT NULL,            -- the row that changed
  action text NOT NULL,               -- "create" | "update" | "delete"
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  old_data jsonb,                     -- snapshot before change (null for create)
  new_data jsonb,                     -- snapshot after change (null for delete)
  change_summary jsonb,               -- key fields: e.g. { "sell_price": { "old": 50, "new": 55 }, "margin_delta": -0.03 }
  reason text                         -- concession/override reason if applicable
);
```

- RLS: Readable by any role holder, insertable by editors
- Covers: supplies, lenses, addons, pricing_settings, company_settings, reference data tables (suppliers, brands, materials, mftypes, lenstypes, lens_options, finishtypes)

---

## 2. Governance Enforcement (Form Dialogs)

Applied to **SupplyFormDialog** and **LensFormDialog** (the two dialogs with sell_price fields). AddonFormDialog gets a lighter version since addons have a flat price without full engine calculations.

### Block rules (prevent save):

| Rule | Condition | Message |
|------|-----------|---------|
| Margin below floor | `margin < category_floor` and `block_below_floor = true` | "Sell price is below the margin floor for this category" |
| Selling at loss | `sell_price <= full_cost` and `block_loss = true` | "Sell price does not cover full cost" |
| Zero cost | `full_cost = 0` or `supplier_cost = 0` | "Supplier cost cannot be zero" |

### Require reason (show dialog before save):

| Rule | Condition |
|------|-----------|
| Below strategic | `sell_price < strategic_price` and `require_concession_reason = true` |

When triggered, a small dialog appears with preset reasons:
- "Competitive match"
- "Customer retention"
- "Volume deal"
- "Management override"
- "Other" (free text)

The selected reason is stored in the audit log entry.

### Implementation approach:

- Add a `useGovernanceCheck` helper that takes the pricing engine result and returns `{ blocked: boolean; blockReason: string; needsReason: boolean }`
- In the form dialog submit handler, check governance before calling onSubmit
- If blocked, show an inline alert (not a toast -- it should be visible and persistent)
- If needs reason, show a reason selection dialog, then proceed with save + audit log

---

## 3. Audit Logging Hook

### New hook: `useAuditLog`

```typescript
const { logChange } = useAuditLog();

// Called in mutation onSuccess callbacks
logChange({
  table_name: "supplies",
  record_id: supply.id,
  action: "update",
  old_data: originalSupply,
  new_data: updatedSupply,
  change_summary: { sell_price: { old: 50, new: 55 }, margin_delta: -0.03 },
  reason: concessionReason,
});
```

This hook:
- Gets the current user from auth
- Inserts a row into `audit_log`
- Is called from the page-level mutation callbacks (SuppliesPage, LensesPage, AddonsPage, CompanySettingsPage, ReferenceDataPage)

### Integration points (mutation hooks that need audit logging):

- `useSupplies` -- create, update, toggleActive
- `useLenses` -- create, update, toggleActive
- `useAddons` -- create, update, toggleActive, delete
- `useCompanySettings` -- update
- `usePricingSettings` -- saveNewVersion
- `useReferenceData` -- create, update, delete, bulkUpdate, bulkDelete

For pricing-related changes (supplies, lenses), the change_summary includes `previous_sell_price`, `new_sell_price`, and `margin_delta`.

---

## 4. Audit Log Page (`/admin/audit`)

Replace the current PlaceholderPage at `/admin/audit` with a real page.

### Layout:

```text
+------------------------------------------------------+
| Audit Log                                            |
+------------------------------------------------------+
| [All] [Supplies] [Lenses] [Add-Ons] [Settings]      |
| [Reference Data] [Pricing Settings]                  |
+------------------------------------------------------+
| Search: [____________]   Date: [from] - [to]        |
+------------------------------------------------------+
| Timestamp    | User  | Action | Table  | Record     |
|              |       |        |        | Summary    |
| 2026-02-13   | admin | update | supply | sell_price |
| 14:23        |       |        | Lens X | 50 -> 55   |
|              |       |        |        | reason:... |
+------------------------------------------------------+
|                              [Load More]             |
+------------------------------------------------------+
```

- Tabs filter by `table_name` groups
- Each row is expandable to show full before/after JSON diff
- Includes reason column when present
- Client-side pagination (100 per page with Load More)
- Date range filter and search by record name

---

## 5. Files

| File | Action |
|------|--------|
| Migration SQL | Create `audit_log` table with RLS |
| `src/hooks/useAuditLog.ts` | **New** -- hook for writing and reading audit entries |
| `src/hooks/useGovernanceCheck.ts` | **New** -- governance validation helper |
| `src/components/admin/ConcessionReasonDialog.tsx` | **New** -- reason selection dialog |
| `src/components/admin/GovernanceAlert.tsx` | **New** -- inline alert for blocked saves |
| `src/pages/admin/AuditLogPage.tsx` | **New** -- tabbed audit log viewer |
| `src/App.tsx` | Update route for `/admin/audit` |
| `src/components/admin/SupplyFormDialog.tsx` | Add governance checks + audit logging |
| `src/components/admin/LensFormDialog.tsx` | Add governance checks + audit logging |
| `src/pages/admin/SuppliesPage.tsx` | Add audit logging to mutation callbacks |
| `src/pages/admin/LensesPage.tsx` | Add audit logging to mutation callbacks |
| `src/pages/admin/AddonsPage.tsx` | Add audit logging to mutation callbacks |
| `src/pages/admin/CompanySettingsPage.tsx` | Add audit logging |
| `src/components/admin/PricingSettingsTab.tsx` | Add audit logging on version save |
| `src/pages/admin/ReferenceDataPage.tsx` | Add audit logging |

---

## Technical Notes

- Audit log inserts are fire-and-forget (non-blocking) so they don't slow down the save flow
- The `old_data` for updates is captured by reading the current record before the mutation executes (passed from the page component which already has the data loaded)
- Governance checks run client-side using the pricing engine result already computed in the form dialog
- The reason dialog only appears when governance requires it; otherwise saves proceed normally

