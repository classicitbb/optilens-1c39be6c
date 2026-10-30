# Asset Register Plan

Status: design, not built. Branch `finance-asset-register`.

The goal is a fixed asset register under **Finance**. It covers:

- depreciation, with an accounting book and a tax book
- a fleet profile for vehicles
- lease contracts and loans
- service schedules for any asset

It replaces the accountant's Excel schedule as the system of record. QBO gets one summary journal entry per month.

The Odoo Fleet vehicle form was used as a reference for the fleet fields. We are not syncing with Odoo.

## 1. What the current spreadsheet tells us

> **No money figures in this file.** Every Markdown file in the repo is bundled into the public site by the `/repo-health` page (`src/pages/RepoHealth.tsx`), so balances, loan amounts and lender details stay out of here. The figures live in QBO, the accountant's workbook and the register itself.

Source: the external accountant's asset schedule (Excel), with three sheets: Fixture and Fittings (16 assets), Machinery & Equip (55) and Vehicles (10). That's 81 assets in all.

The columns are: Asset, Purchase Date, Cost, Disposals, Useful Life, Method, Accum Dep (Opening), Dep (Current Year), Accum Dep (Closing), NBV and Monthly Depreciation. A free-text "COGS" marker sits beside some lines.

Conventions we can read from the data:

- Every asset is straight-line with zero residual value. Lives are 5, 8 or 10 years.
- The current year is FY2026. Opening accumulated depreciation is as at the end of FY2025, which we assume is 31 Dec. This needs confirming.
- Most assets get a **full year in the year of purchase**. For example, the Velocity coater bought 2025-08-22 has a full year in its opening balance.
  - The three Dell desktops are prorated monthly instead (14 and 11 months), so the convention is applied inconsistently.
- Monthly depreciation is the annual charge ÷ 12.
- The "COGS" marker means that line's depreciation goes to cost of sales. Unmarked lines go to overhead.
- Cost includes landed cost. For example, the Essilor edger is carried at its landed BBD cost, not its USD FOB invoice.
- Disposals are recorded by putting the cost in the Disposals column. There are no proceeds and no gain or loss (see the #4T Frame Tracer).
- Plates are recorded only in the asset name (`Reg:J4023`, `J3763`, `C4056`…).
- There are no serial numbers, locations, custodians, suppliers or invoice references.

Data problems to resolve with the accountant **before** the opening balances are locked. These are reported fixed (see §9), and the importer still checks for them:

1. **Lenovo Mini Computers (2):** accumulated depreciation is greater than cost, so the NBV is negative. The excess equals Lenovo Thinkbook #1's annual charge, so it looks like it was posted to the wrong line.
2. **Lenovo Thinkbook #1 and #2:** same cost and date, but #2 is fully depreciated and #1 still has NBV left.
3. **Frame Heater (2005):** never depreciated.
4. **Mazda 2 (2012):** no cost.
5. **Suzuki S-Cross:** NBV a few cents negative, a rounding error.
6. **Ocuco software:** the "Innovations software" and "additional software" lines are intangibles under IAS 38. They sit in Fixtures & Fittings, and the "Lab Hardware" lines in Machinery are probably right where they are.
7. **Very old fully depreciated assets** (2005 lab equipment, the 2010–2016 vehicles): we need to confirm they still exist. Anything gone should be disposed in the register so it drops off the list.
8. **Proration:** the mixed full-year and monthly conventions above. Pick one policy going forward (see §2).

## 2. Standards and policies

- **IAS 16 / IFRS for SMEs s.17 (property, plant and equipment).** Assets are held at cost less accumulated depreciation and impairment. Useful life, residual value and method are reviewed every year, and a change is applied going forward, never backdated. The register produces the roll-forward by class: opening, additions, disposals, depreciation, closing.
- **IAS 38 (intangible assets).** Software gets its own class, amortised the same way.
- **IAS 36 (impairment).** A write-down is recorded as an event.
- **IFRS 16 (leases).** A lease we hold becomes a right-of-use asset plus a lease liability. Leases of 12 months or less, and low-value leases, can be expensed instead. This is a flag on each lease.
- **IAS 23 (borrowing costs).** Loan interest is expensed unless it funds the build of a qualifying asset. We record which asset a loan funds but don't capitalise interest automatically.
- **Two books per asset.**
  - **Book:** IFRS depreciation. This is what goes to QBO.
  - **Tax:** Barbados capital allowances, meaning an initial allowance plus annual wear-and-tear by tax class. Rates are configured per tax class, and the accountant confirms them. Nothing is hard-coded.
- **Capitalisation threshold** (configurable, e.g. BBD 500). Purchases below it are expensed and never enter the register.
- **Proration convention** is set per book, with three options: `full_year` (what the accountant mostly uses), `full_month` (from the month in service) or `mid_month`. The default is `full_year` so the numbers match the accountant's (decided, see §9). Changing it later recalculates only future periods.

## 3. Data model

All tables are new and live in `public`. Money is `numeric(14,2)` in BBD. A purchase made in a foreign currency keeps its original amount and rate for reference only.

### Core register

- **`asset_classes`** (seed rows: Fixtures & Fittings, Machinery & Equipment, Vehicles, Computer Equipment, Software (intangible), Right-of-use)
  - `name`, `is_intangible`
  - default life, method and residual %
  - QBO accounts: cost, accumulated depreciation, depreciation expense (overhead), depreciation expense (COGS), gain/loss on disposal
  - `tax_class_id`
- **`asset_tax_classes`**: `name`, `initial_allowance_pct`, `annual_allowance_pct`, `notes`.
- **`assets`**:
  - Identity: `tag` (unique, printable as a barcode), `name`, `description`, `class_id`, `parent_asset_id` (for components)
  - Details: `serial_no`, `manufacturer`, `model`, `location`, `custodian_employee_id` (→ `employees`)
  - Purchase: `supplier`, `invoice_ref`, `shipment_id` (→ landed cost, when there is one)
  - Dates: `acquired_on`, `in_service_on`, `warranty_expires_on`
  - Cost: `cost`, `original_currency`, `original_amount`
  - `expense_target`: `cogs` or `overhead` (this replaces the "COGS" marker)
  - `status`: `draft → in_service → disposed | written_off`
  - `notes`, `photo_path`
- **`asset_books`**: one row per asset per book (`book`, `tax`).
  - `method` (`straight_line`, `declining_balance`, `units_of_production`)
  - `useful_life_months`, `residual_value`, `rate_pct` (declining balance), `total_units` (units of production)
  - `convention`
  - `opening_accum_dep` and `opening_as_of`: the import cut-over balance
  - `accum_dep` (cached), `nbv` (generated)
- **`asset_events`**: append-only history.
  - `type`: `acquired`, `improvement` (adds cost), `revaluation`, `impairment`, `transfer` (location or custodian), `life_change`, `disposal`, `write_off`, `opening_balance`
  - `occurred_on`, `amount`, `proceeds`, `gain_loss`, `memo`, `created_by`
- **`depreciation_runs`**:
  - `period` (first of month), `book`, `status` (`draft → approved → posted`)
  - `approved_by`, `posted_at`, `qbo_journal_id`, `locked`
- **`depreciation_lines`**: `run_id`, `asset_id`, `amount`, `units` (units of production), `expense_target`. Unique on (`run_id`, `asset_id`).

### Fleet

The fleet profile is a 1:1 extension of `assets`. Only assets in the Vehicles class get one.

- **`vehicles`**:
  - Identity: `asset_id` (PK), `plate`, `chassis_no` (VIN), `make`, `model`, `model_year`, `colour`
  - Type: `category` (car, van, pickup), `fuel_type`, `transmission`, `seats`
  - People: `fleet_manager_id` and `driver_id` (→ `employees`), `future_driver_id`
  - `state`: `new_request → to_order → registered → downgraded`
  - Dates: `order_date`, `first_contract_date`, `registration_expires_on`, `insurance_expires_on`, `inspection_due_on`
  - `odometer_unit`
- **`vehicle_driver_history`**: `vehicle_id`, `employee_id`, `from_date`, `to_date`.
- **`vehicle_odometer_logs`**: `vehicle_id`, `read_on`, `reading`, `source` (manual, service, fuel).
- **`vehicle_fuel_logs`**: `vehicle_id`, `filled_on`, `litres`, `cost`, `odometer`, `driver_id`, `receipt_path`.

### Service schedules

These work for any asset, not just vehicles: edgers, coaters, compressors, air conditioning and generators all need servicing.

- **`asset_service_plans`**:
  - `asset_id`, `name` (e.g. "Oil change", "Coater calibration")
  - `every_days` and/or `every_units` (km or hours), meaning "whichever comes first"
  - `last_done_on`, `last_done_units`
  - `next_due_on`, `next_due_units` (computed)
  - `vendor`, `remind_days_before`, `active`
- **`asset_service_logs`**: `asset_id`, `plan_id` (nullable for one-off repairs), `done_on`, `units_at_service`, `vendor`, `cost`, `description`, `invoice_ref`, `attachment_path`, `capitalise` (true creates an `improvement` event instead of an expense).

### Leases

- **`lease_contracts`**:
  - Identity and parties: `reference`, `lessor`, `asset_id` (the leased item, or the ROU asset it creates)
  - Dates: `start_on`, `end_on`
  - Payments: `payment_amount`, `frequency` (monthly, quarterly, annual), `payments_in_advance`
  - Money terms: `deposit`, `discount_rate_pct` (incremental borrowing rate), `residual_guarantee`
  - Options: `renewal_option`, `termination_notice_days`, `purchase_option_amount`
  - `ifrs16`: false means short-term or low-value, so payments are simply expensed
  - `status`: `draft`, `active`, `ended`, `terminated`
  - `document_path`
- **`lease_schedule`**: generated rows of `period`, `payment`, `interest`, `principal`, `closing_liability` and `rou_amortisation`.

### Loans

- **`loans`**:
  - `reference`, `lender`, `principal`, `annual_rate_pct`, `term_months`, `start_on`
  - `payment_amount`, `frequency`, `type` (amortising, interest-only, balloon), `balloon_amount`
  - `collateral_asset_id`, `funds_asset_id`, `status`, `document_path`
- **`loan_schedule`**: generated rows of `due_on`, `payment`, `interest`, `principal` and `closing_balance`, with `paid_on` and `paid_amount` when actually paid.
- The current and non-current split, meaning principal due within 12 months, is calculated from the schedule for the balance sheet.

### Permissions and audit

- There is a new `role_permissions` feature, `assets`, plus a `can_assets()` SQL helper. It follows the `can_hr()` pattern in `20261029130100_hr_core.sql`.
  - `admin` and `office_admin` can view and edit.
  - `operator` can view the register and fleet, and log fuel, odometer and service (decided, see §9).
  - The other roles get nothing.
- Leases and loans are financial agreements, so only `admin` and `office_admin` can see them.
- Every write to the register goes through RLS on `can_assets()`. `asset_events` is insert-only.

## 4. Calculations

These are pure TypeScript functions in `src/features/admin/finance/assets/engine/`, unit-tested. A matching SQL function is only added where a run must be atomic.

- **Straight-line:** `(cost − residual) / life_months` per month, applying the book's convention in the first and last periods. The charge never takes NBV below the residual value.
- **Declining balance:** `NBV × rate / 12` per month. It switches to straight-line once that gives the larger charge, so the asset still reaches its residual value.
- **Units of production:** `(cost − residual) × units_this_period / total_units`. Units come from odometer logs (vehicles) or hour-meter readings.
- **Disposal:** depreciation runs to the disposal date under the convention, then `gain_loss = proceeds − NBV`.
- **Lease (IFRS 16):**
  - Initial liability = present value of the payments at the discount rate.
  - ROU asset = liability + initial direct costs + payments in advance − incentives.
  - Each period: interest = opening liability × rate, and principal = payment − interest.
  - The ROU asset depreciates straight-line over the lease term, or over its useful life if ownership transfers.
- **Loan:** a standard amortising schedule (PMT), interest-only or balloon. Paying early or paying a different amount recalculates the rest of the schedule from the actual balance.
- **Tax book:** the initial allowance in the first year, then annual wear-and-tear on the tax written-down value. It is reported yearly for the tax computation and never posted to QBO.

## 5. Workflows

1. **Add an asset.** Enter it manually or create it from a costing shipment line, which pre-fills cost, supplier and invoice. Choosing the class fills in the life, method, accounts and tax class. It starts as `draft` and becomes `in_service` once it has an in-service date.
2. **Monthly depreciation run.**
   - Generate a draft run for the period, then review the lines grouped by class and by COGS or overhead.
   - Approve it. The period is then locked, and later edits to those assets go into the next period.
   - Post it: one summary JE per run (Dr depreciation expense COGS/overhead, Cr accumulated depreciation per class).
   - Posting goes through the Finance → QBO outbox that OptiLens Local claims, as in the Finance module proposal. **No outbox exists in the codebase yet**, so phase 1 offers a JE export (CSV / printable) for the accountant to key in, and posting through the outbox follows later.
3. **Dispose or write off.** Enter the date and proceeds. The register works out depreciation to that date and the gain or loss, and produces a disposal JE.
4. **Leases.** Enter the contract and a schedule is generated. Each month's lease run creates the interest, principal and ROU amortisation lines alongside the depreciation run.
5. **Loans.** Enter the loan and a schedule is generated. Paying an instalment records the actual payment and produces the interest and principal split for the JE.
6. **Service.** Logging a service rolls the plan's next due date and meter reading forward. A fuel log or service with an odometer reading updates the vehicle's odometer.
7. **Reminders.** A daily job lists everything due within each plan's `remind_days_before`:
   - service plans
   - registration, insurance and inspection expiry
   - warranty expiry
   - lease end and notice deadlines
   - loan payments

   These show on the Assets dashboard and in admin notifications. Emails can be added later, and if they are, they are internal only (no customer emails).

## 6. Screens and routes

These are under `/admin/finance/assets/*` and guarded by an `AssetsRoute` like `HrRoute`. In-app dialogs are used for confirmations.

| Route | Screen |
| --- | --- |
| `finance/assets` | Dashboard: NBV by class, this month's depreciation, items due in 30/60/90 days, data problems |
| `finance/assets/register` | Register table: filter by class, status, location or custodian; search; export |
| `finance/assets/:id` | Asset detail, with tabs for Overview, Depreciation (both books, period schedule), Events, Service, Documents, plus Vehicle when it's a vehicle |
| `finance/assets/runs` and `/:runId` | Depreciation runs: draft, then approve, then post or export |
| `finance/assets/fleet` | Vehicle list with a state pipeline (New Request → To Order → Registered → Downgraded), driver, plate and expiry badges |
| `finance/assets/service` | Service calendar and list across all assets, with overdue items first |
| `finance/assets/leases` and `/:id` | Lease contracts and their schedules |
| `finance/assets/loans` and `/:id` | Loans, their schedules and payment recording |
| `finance/assets/reports` | Fixed asset register, IAS 16 roll-forward by class, depreciation by period, tax capital-allowance schedule, lease maturity, loan balances |
| `finance/assets/import` | Spreadsheet import (see §7) |

The vehicle tab borrows the layout of the Odoo reference: driver and future driver on the left, and vehicle details (category, order date, chassis, fleet manager, location) on the right. Below that are tabs for Tax/Contract (catalogue value, purchase value, residual), Model (year, colour) and Notes. A header bar shows smart buttons for Drivers History, Contracts and Services.

## 7. Import and cut-over

- **Cut-over date: 31 Oct 2026, using QBO balances** (see §9, decision 6).
  - Each QBO per-asset sub-account becomes an asset with an `opening_balance` event.
  - `cost` is the "Original cost" balance, and `asset_books.opening_accum_dep` is the "Depreciation" balance.
  - The accountant's sheet is matched to it by name and fills in life, purchase date, COGS flag and class.
  - We don't recalculate history.
  - The QBO balances are captured once into a reviewed CSV, from the Account List or Balance Sheet report at 31 Oct. Live API access isn't needed for this.
- The importer reads the workbook in the browser and maps each sheet to a class. No spreadsheet parser is installed on `main` yet, so this adds one as a dependency.
  - Fixtures & Fittings is split into Computer Equipment, F&F and Software by keyword.
  - The importer suggests those splits, and you confirm them.
- Parsing rules:
  - `Useful Life` → months (from either the "8 Yrs" text or a plain number).
  - The "COGS" marker → `expense_target`.
  - Plates and model year are pulled from vehicle names (`Reg:J2055`, a `C4056` suffix).
  - Rows with `Disposals` = cost become `disposed`.
  - Total rows and blank rows are skipped.
- The preview flags every problem in §1 (negative NBV, depreciation greater than cost, zero cost, never depreciated) and won't import those rows until each one has been fixed or acknowledged.
- **Reconciliation check:** the imported cost, accumulated depreciation and NBV per class must match the QBO parent balances (157, 159 and 161) at 31 Oct 2026 to the cent before the import can be committed.

## 8. Phases

1. **Register and depreciation.**
   - Tables for classes, tax classes, assets, books, events, runs and lines, with RLS.
   - The engine and its tests, plus the importer.
   - Register and asset detail screens, monthly run with JE export, disposal, and the roll-forward and register reports.
2. **Fleet and service.** Vehicle profile, driver history, odometer and fuel logs, service plans and logs, expiry reminders, and the dashboard "due" panel.
3. **Leases and loans.** Contracts and schedules, posting lines added to the monthly run, and the maturity and balance reports. All four 2024 vehicles are leased or financed, so this can run alongside phase 2 once the contract documents are in.
4. **Tax book and QBO posting.** Capital allowance schedule and outbox posting through OptiLens Local, once the outbox exists.

Each phase is its own PR. Migrations are applied to the live DB through the Lovable MCP `query_database`, because pushing a migration file does not run it.

## 9. Decisions (2026-10-30)

1. **Year end** is 31 Dec.
2. **Data corrections** in §1 are reported done by the accountant. The import must use the corrected workbook. The copy in Downloads (saved 2026-10-30 10:10) still shows the old values, and so does QBO (see §10).
3. **Proration** is a full year in the year of purchase. It is the default `convention` for both books. It applies to assets acquired after the cut-over. Existing assets carry on at the annual charge ÷ 12 from their QBO opening balances (decision 6).
4. **Vehicles:** all of the 2024 vehicles (XL7, Grand Vitara, BYD T3, Kia Sonet) are leased or on a loan. Each one is linked to a `lease_contracts` or `loans` row, so leases and loans are needed sooner than originally planned (see §8).
5. **Operators** can log fuel, mileage (odometer) and services. Admin and office admin can do everything. Under RLS, operators can insert into `vehicle_fuel_logs`, `vehicle_odometer_logs` and `asset_service_logs`, and can read the register and fleet. They can't change assets, books, runs, leases or loans.
6. **Opening balances come from QBO at 31 Oct 2026** (decided 2026-10-30).
   - **What is imported.** Each asset's "Original cost" and "Depreciation" sub-account balance as at 31 Oct 2026 becomes its opening cost and opening accumulated depreciation, with October's depreciation already posted in QBO.
   - **Role of the accountant's sheet.** It supplies only the useful life, purchase date, COGS flag and class.
   - **Mismatches.** Where an asset is in QBO but not the sheet, or the reverse, the importer shows it for a decision. It doesn't guess.
   - **First run.** The register's first depreciation run is November 2026.
   - **Ongoing charge.** The monthly charge continues at the annual charge ÷ 12, which is what QBO has been doing. The full-year convention (decision 3) applies to assets acquired after the cut-over.
   - **Errors still in QBO.** The negative-NBV and missing-sub-account cases in §10 must be corrected in QBO by the accountant before 31 Oct closes, or by a correcting JE in November. The importer won't accept a negative NBV.
7. **QBO posting is per class** (decided 2026-10-30). The class parents become control accounts, and the register is the subledger that holds per-asset detail.
   - **Accounts per class.** Each `asset_classes` row maps to one QBO cost account and one accumulated-depreciation account. For example, Machinery & Equipment maps to 157 for cost and a new "157 Accumulated depreciation" account, so cost and depreciation stay separate on the balance sheet.
   - **Monthly JE.** It has one Dr/Cr line per class per expense target (COS or overhead), not one per asset.
   - **One-off reclass.** After the 31 Oct import reconciles, the accountant posts one reclass JE in QBO. It moves every per-asset "Original cost" and "Depreciation" balance into the class cost and accumulated-depreciation accounts. The emptied per-asset sub-accounts are then made inactive.
   - **The register generates that reclass JE** from the imported balances, so it matches to the cent.
   - **Stray balance.** The small balance on account 450 is investigated and cleared as part of the reclass.
8. **Ocuco "Innovations software" (2016):** this line covers 2 servers plus the software. The import splits it into Computer Equipment (servers) and Software if the invoice gives a breakdown. Otherwise it goes into Computer Equipment as one asset. "Ocuco – additional software" (2020) moves to the Software class.

## 10. QBO chart of accounts (read 2026-10-30)

**How fixed assets are set up today.** Each class has a parent account, and under it each asset has its own sub-account. That sub-account has two children of its own: "Original cost" and "Depreciation", where Depreciation holds the accumulated depreciation.

| Parent | Account type | Notes |
| --- | --- | --- |
| 157 Machinery and equipment | Fixed assets | |
| 159 Furniture & Fixtures | Fixed assets | Computers are carried here too |
| 161 Vehicles | Fixed assets | |
| 450 Accumulated depreciation on PP&E | Fixed assets | Small stray balance, no children |
| Intangibles | Non-current assets | Unused; target for Software |

Expense and P&L accounts that already exist:

| Purpose | Account |
| --- | --- |
| Depreciation, COGS lines | `DEP` Depreciation - COS (Cost of sales) |
| Depreciation, overhead lines | Depreciation (Other expense) |
| Amortisation (software, right-of-use) | Amortisation expense |
| Disposal | `584` Loss on disposal of assets, `DOA` Profit/(loss) on sale of asset |
| Loan and lease interest | `I` Interest expense |
| Operating lease payments | `RT` Rent or lease payments |
| Fleet running costs | `CTX` Vehicle Expenses, `RP` Repairs and Maintenance, `INS` Insurance - General |

So the COGS/overhead split exists as two separate accounts. `expense_target` maps straight onto them.

**Finance liabilities.** These turn the lease and loan phase from hypothetical into required:

- **Vehicle finance:** 251 Vehicle Finance (lease liabilities), a long-term debt account with a sub-account per finance company.
- **Equipment loans:** two long-term bank loans, one for the Coburn coater and one for the Essilor edger.
- **Other loans:** one current-liability loan from private lenders.

The vehicles sit in QBO as owned fixed assets with finance liabilities against them. That looks like **hire purchase**, a loan against an owned asset, rather than an IFRS 16 lease. The contracts will tell. The coater and edger are also loan-financed, so the loans table covers equipment, not only vehicles.

**QBO and the spreadsheet don't agree.**

- **Convention.** QBO has been posted monthly at the annual charge ÷ 12. For example, the Velocity coater has 21 monthly charges in QBO. The spreadsheet uses full years. NBVs differ for that reason as well as the date.
- **Errors still in QBO.**
  - The Lenovo Minis still show a negative NBV.
  - Thinkbook #1's NBV differs from the sheet, and #2 is a few cents negative.
  - The Suzuki S-Cross is a few cents negative.
  - F80 (Dell 5060) is booked under an accumulated-depreciation account type.
  - F81 (Dell 7070) has no cost or depreciation sub-accounts.
  - F82 has no original cost but carries a balance on its parent account.
- **Classification differences.**
  - The Lenovo Legion 5 is under Machinery in QBO but under F&F in the sheet.
  - The Essilor Blocker has its own empty account because it's included in the edger's cost.
  - Ocuco software is under Furniture & Fixtures.
- **Assets QBO no longer has.** The Nissan Tiidas and Mazdas aren't in QBO, so they were probably already written off there. Pole Display (F62) is in QBO but not in the sheet.

## 11. Still open

1. Capitalisation threshold (proposed: BBD 500).
2. Which of the old 2005 lab equipment and pre-2020 vehicles are physically gone, so they can be disposed on import. QBO suggests the Tiidas and Mazdas already are.
3. Barbados capital allowance rates per tax class (from the accountant, later).
4. The finance documents:
   - The vehicle finance agreements for the 2024 vehicles: which vehicle, rate, term, payment and start date, and whether it's hire purchase or a lease.
   - The bank loans for the coater and edger.
   - The private loan.
