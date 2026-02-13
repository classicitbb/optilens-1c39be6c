

# Parameters Page: Tabbed Layout with Versioned Pricing Settings

## Overview

Refactor the Parameters page (`/admin/parameters`) into a two-tab interface:
1. **Company Info** -- the existing company_settings fields (renamed from the current flat view), repurposed for text values like pricelist export text and logos
2. **Pricing Settings** -- a new comprehensive, versioned pricing configuration covering Currency/FX, Import Defaults, Financial/Operational, Pricing Strategy, and Governance Rules

Pricing settings are versioned: each save creates a new version row. The active version is always the latest. Users can view past versions but only edit the current draft.

## Database Changes

### New table: `pricing_settings`

Stores all pricing engine parameters with version tracking.

```sql
CREATE TABLE public.pricing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL DEFAULT 1,
  label text,                          -- optional user label e.g. "Q1 2026"
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Currency & FX
  base_currency text NOT NULL DEFAULT 'BBD',
  fx_rates jsonb NOT NULL DEFAULT '{"USD":1,"BBD":2}',
  fx_risk_buffer numeric NOT NULL DEFAULT 0.02,

  -- Barbados Import Defaults
  vat_rate numeric NOT NULL DEFAULT 0.175,
  duty_rates jsonb NOT NULL DEFAULT '{"lenses":0.20,"frames":0.30,"supplies":0.20,"addons":0.15}',
  brokerage_fee numeric NOT NULL DEFAULT 0,
  port_charges numeric NOT NULL DEFAULT 0,
  freight_method text NOT NULL DEFAULT 'per_unit',
  insurance_percent numeric NOT NULL DEFAULT 0.01,

  -- Financial & Operational
  cost_of_capital numeric NOT NULL DEFAULT 0.08,
  inventory_holding numeric NOT NULL DEFAULT 0.05,
  avg_days_in_stock integer NOT NULL DEFAULT 90,
  overhead_percent numeric NOT NULL DEFAULT 0.10,
  shrinkage_percent numeric NOT NULL DEFAULT 0.02,

  -- Pricing Strategy
  target_margin numeric NOT NULL DEFAULT 0.50,
  category_margin_floors jsonb NOT NULL DEFAULT '{"lenses":0.30,"frames":0.35,"supplies":0.25,"addons":0.20}',
  category_target_margins jsonb NOT NULL DEFAULT '{"lenses":0.50,"frames":0.50,"supplies":0.45,"addons":0.40}',
  max_price_increase numeric NOT NULL DEFAULT 0.10,
  rounding_rule numeric NOT NULL DEFAULT 0.50,
  psychological_rounding boolean NOT NULL DEFAULT false,

  -- Governance Rules
  block_below_floor boolean NOT NULL DEFAULT true,
  block_loss boolean NOT NULL DEFAULT true,
  require_concession_reason boolean NOT NULL DEFAULT true,
  price_reduction_threshold numeric NOT NULL DEFAULT 0.10
);
```

RLS: same pattern as `company_settings` -- readable by any role holder, writable by admin/operator.

### Modify `company_settings` purpose

The existing `company_settings` table keeps its current columns for backward compatibility (the cost engine still reads from it). In the future the engine can be migrated to read from `pricing_settings`. For now the Company Info tab will continue editing `company_settings` but the field labels change to reflect company identity info (export text, logos). No schema change needed immediately -- just UI relabeling.

## UI Changes

### CompanySettingsPage.tsx -- Tabbed Wrapper

```text
+-----------------------------------------------------+
| Parameters                                          |
+-----------------------------------------------------+
| [Company Info]  [Pricing Settings]                  |
+-----------------------------------------------------+
| (active tab content)                                |
+-----------------------------------------------------+
```

- **Company Info tab**: Current settings fields stay, but header/description updated to reflect "Company identity, pricelist export text and logos"
- **Pricing Settings tab**: New component `PricingSettingsTab.tsx`

### PricingSettingsTab.tsx -- Sectioned Form with Version Bar

```text
+-----------------------------------------------------+
| Version: v3 (Q1 2026)  [v1] [v2] [v3]  [New Draft] |
+-----------------------------------------------------+
| Currency & FX                                       |
|   Base Currency: [BBD v]                            |
|   FX Rates:  USD [1.00]  BBD [2.00]  [+ Add]       |
|   FX Risk Buffer %: [2.0]                           |
+-----------------------------------------------------+
| Barbados Import Defaults                            |
|   VAT Rate %: [17.5]                                |
|   Duty by Category:                                 |
|     Lenses [20]  Frames [30]  Supplies [20]  ...    |
|   Brokerage Fee: [0]   Port Charges: [0]            |
|   Freight Method: [Per Unit v]                      |
|   Insurance %: [1.0]                                |
+-----------------------------------------------------+
| Financial & Operational                             |
|   Cost of Capital %: [8.0]                          |
|   Inventory Holding %: [5.0]                        |
|   Avg Days in Stock: [90]                           |
|   Overhead %: [10.0]                                |
|   Shrinkage %: [2.0]                                |
+-----------------------------------------------------+
| Pricing Strategy                                    |
|   Target Margin %: [50.0]                           |
|   Category Margin Floors: (inline grid)             |
|   Category Targets: (inline grid)                   |
|   Max Price Increase/Cycle %: [10.0]                |
|   Rounding Rule: [0.50 v]                           |
|   Psychological Rounding: [toggle]                  |
+-----------------------------------------------------+
| Governance Rules                                    |
|   Block Below Floor: [toggle]                       |
|   Block Loss: [toggle]                              |
|   Require Concession Reason: [toggle]               |
|   Price Reduction Threshold %: [10.0]               |
+-----------------------------------------------------+
|                          [Save as New Version]      |
+-----------------------------------------------------+
```

- **Version selector**: horizontal list of version chips at the top; clicking one loads that version read-only; the latest active version is editable
- **"New Draft" button**: copies current active version into a new editable draft
- **Sections**: grouped with collapsible accordion headers or simple bordered sections
- **JSONB fields** (fx_rates, duty_rates, category margins): rendered as small inline key-value grids with add/remove capability
- **Toggles**: Switch components for boolean governance rules
- **Select dropdowns**: for freight_method, rounding_rule, base_currency

### Version Logic

- On first load, fetch all versions ordered by `version DESC`
- Display the latest (active) version in editable mode
- Older versions are viewable but fields are disabled
- "Save as New Version" inserts a new row with `version = max + 1`, sets `is_active = true`, and sets all previous rows to `is_active = false`
- Version label is optional freetext (e.g. "Q1 2026", "Post-duty-change")

## Files

| File | Action |
|------|--------|
| Migration SQL | Create `pricing_settings` table with RLS |
| `src/pages/admin/CompanySettingsPage.tsx` | Add Tabs wrapper with Company Info + Pricing Settings tabs |
| `src/components/admin/PricingSettingsTab.tsx` | **New** -- full sectioned form with version bar |
| `src/hooks/usePricingSettings.ts` | **New** -- hook to fetch versions, load active, save new version |

## Seed Data

Insert one default row as version 1 with all the default values shown above so the page loads with sensible defaults on first visit.

