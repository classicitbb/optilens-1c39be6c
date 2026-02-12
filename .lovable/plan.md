# Enhanced Supply Catalog -- Landed Cost Fields

## Overview

Extend the supplies table and edit form to capture all cost-related fields from the legacy database, and create a company settings table to store the rates used for automatic landed cost calculations. Computed values (BBCost, Duty, VAT, Labour, FullCost, AutoPrice, Markup, Profit%) will be calculated on the fly in the form and displayed as read-only fields.

## Database Changes

### 1. New table: `company_settings`

A single-row settings table storing company-wide cost multipliers.


| Column                     | Type        | Default | Legacy field             |
| -------------------------- | ----------- | ------- | ------------------------ |
| id                         | uuid        | PK      | --                       |
| import_duty                | numeric     | 0       | ImportDuty               |
| frames_duty                | numeric     | 0       | FramesDuty               |
| default_vat                | numeric     | 0       | DefaultVAT%              |
| labour_percent             | numeric     | 0       | LabourPercent            |
| profit_percent             | numeric     | 0       | ProfitPercent            |
| import_multiple            | numeric     | 1       | ImportMultiple           |
| wholesale_stock_percentage | numeric     | 0       | WholesaleStockPercentage |
| updated_at                 | timestamptz | now()   | --                       |


RLS: role-users can SELECT; editors can UPDATE. Only one row ever exists (seeded in migration).

### 2. Alter `supplies` table -- add columns


| New Column        | Type           | Default | Legacy field   |
| ----------------- | -------------- | ------- | -------------- |
| preferred         | boolean        | false   | Pfrd           |
| stocked           | boolean        | false   | Stocked        |
| show_in_pricelist | boolean        | false   | ShowInPL       |
| bin               | text           | ''      | Bin            |
| detail            | text           | ''      | Desc2 / Detail |
| currency          | text           | 'USD'   | CXY            |
| bb_item           | boolean        | false   | BB_Item        |
| duty_added        | boolean        | false   | DutyAdded      |
| vat_paid          | boolean        | false   | VatPaid        |
| labour_added      | boolean        | false   | LabourAdded    |
| brand_id          | uuid, nullable | null    | Brand FK       |
| stk_wspl          | boolean        | false   | StkWSPL        |


All defaults ensure existing rows are unaffected.

## Code Changes

### New hook: `useCompanySettings.ts`

- Fetches the single row from `company_settings`
- Provides an update mutation for editing rates
- Exports a helper function `calculateLandedCost(supply, settings)` that returns all computed fields: `bbCost`, `duty`, `vat`, `labour`, `fullCost`, `autoPrice`, `markup`, `profitPercent`, `salesTax`, `plusSalesTax`, `wsStkPrice`

### Updated: `useSupplies.ts`

- Add all new columns to `Supply` and `SupplyFormData` interfaces
- Join `brands` table for brand name display (same pattern as supplier join)

### Updated: `SupplyFormDialog.tsx`

Reorganize the form into logical sections using visual grouping:

**Section 1 -- Item Info** (existing + new fields):

- Name, SKU, Category, Supplier, Brand (new dropdown from brands reference)
- Description, Detail (new), Bin (new), Unit, Qty per Unit

**Section 2 -- Flags** (toggles in a compact row):

- Active, Show on Website, Preferred (new), Stocked (new), Show in Price List (new), Stk WSPL (new)

**Section 3 -- Pricing and Cost**:

- Currency selector (USD / BBD) (new)
- Cost (renamed from base_price for clarity, or kept as-is)
- Sell Price
- BB Item toggle (new)
- Duty Added toggle (new)
- VAT Paid toggle (new)
- Labour Added toggle (new)

**Section 4 -- Calculated Values** (read-only, computed live):

- BB Cost, + Duty, + VAT, + Labour, Full Cost
- Profit%, AutoPrice, Markup, O/A Profit%
- Sales Tax, Plus Sales Tax
- WS Stk Price (only shown if Stk WSPL is on)

These are computed using `calculateLandedCost()` with company settings and displayed as read-only text fields.

### Updated: `SupplyDataTable.tsx`

- No immediate changes to calculated columns (user will decide later)
- Add Brand column if space allows, or defer

### New: Admin settings page or section

- A small form (could be on the Parameters page) to edit company rates
- Shows all 7 rate values with inline editing

## Technical Details

### Migration SQL

```sql
-- Company settings table
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_duty numeric NOT NULL DEFAULT 0,
  frames_duty numeric NOT NULL DEFAULT 0,
  default_vat numeric NOT NULL DEFAULT 0,
  labour_percent numeric NOT NULL DEFAULT 0,
  profit_percent numeric NOT NULL DEFAULT 0,
  import_multiple numeric NOT NULL DEFAULT 1,
  wholesale_stock_percentage numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role users can select company_settings"
  ON public.company_settings FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Editors can update company_settings"
  ON public.company_settings FOR UPDATE
  USING (has_edit_role(auth.uid()));

-- Seed single row
INSERT INTO public.company_settings (id) VALUES (gen_random_uuid());

-- Add columns to supplies
ALTER TABLE public.supplies
  ADD COLUMN preferred boolean NOT NULL DEFAULT false,
  ADD COLUMN stocked boolean NOT NULL DEFAULT false,
  ADD COLUMN show_in_pricelist boolean NOT NULL DEFAULT false,
  ADD COLUMN bin text NOT NULL DEFAULT '',
  ADD COLUMN detail text NOT NULL DEFAULT '',
  ADD COLUMN currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN bb_item boolean NOT NULL DEFAULT false,
  ADD COLUMN duty_added boolean NOT NULL DEFAULT false,
  ADD COLUMN vat_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN labour_added boolean NOT NULL DEFAULT false,
  ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN stk_wspl boolean NOT NULL DEFAULT false;
```

### Landed cost calculation logic (matching legacy query)

```text
bbCost = bb_item ? cost : cost * importMultiple
duty   = duty_added ? (category=="frames" ? bbCost*framesDuty : bbCost*importDuty) : 0
vat    = vat_paid ? duty * defaultVat : 0
labour = labour_added ? bbCost * labourPercent : 0
fullCost = duty_added ? bbCost + (duty-bbCost) + (vat_paid ? vat-bbCost : 0) + labour
         : bbCost * 1.15
autoPrice = fullCost + fullCost * (profitPercent / 2)
markup    = sellPrice - fullCost
profitPct = cost > 0 ? markup / fullCost : profitPercent
salesTax  = vat_paid ? sellPrice * defaultVat : sellPrice
wsStkPrice= stk_wspl ? fullCost + fullCost * wholesaleStockPercentage : 0
```

### Files Changed


| File                                        | Action                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| Migration SQL                               | Create company_settings table; alter supplies                            |
| `src/hooks/useCompanySettings.ts`           | **New** -- fetch/update company settings + calculation helper            |
| `src/hooks/useSupplies.ts`                  | Add new fields to interfaces; join brands                                |
| `src/components/admin/SupplyFormDialog.tsx` | Reorganize into sections; add all new fields + computed read-only values |
| `src/components/admin/SupplyDataTable.tsx`  | Minor: update colSpan for empty state                                    |
| Admin sidebar/page                          | Add Company Settings section for editing rates                           |
