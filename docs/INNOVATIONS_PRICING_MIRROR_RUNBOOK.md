# Innovations pricing mirror (phase 1) — runbook

Read-only mirror of the Innovations pricing entities into Supabase `inn_*` tables, plus a reconciliation
report. **Nothing writes to Innovations.** Spec context: `docs/PRICING_WHICH_TABLE.md`, `docs/integration-innovations-sync-contract.md`,
`supabase/functions/innovations-sync/AGENTS.md`; Innovations-side notes in `Innova Training/docs/pricing/`.

## What was built

| Piece | Where |
|---|---|
| Mirror tables, change-stamp trigger, RLS, `inn_pricelist_map`, widened run-log CHECK | `supabase/migrations/20261110170000_inn_pricing_mirror_tables.sql` |
| `inn_lens_path_status`, `inn_lens_active_full_path`, `inn_lens_path_summary` (locked on/off rule) | `supabase/migrations/20261110170100_inn_lens_active_full_path_view.sql` |
| Reconciliation views (a)–(d) | `supabase/migrations/20261110170200_inn_pricing_reconciliation_views.sql` |
| Receiver entities (25 `inn_*`, scope `supplies:write`) | `supabase/functions/innovations-sync/index.ts` (VERSION `2026-11-10.1-inn-pricing-mirror`) |
| Office reader, watermark state, CLI flags | optilens-local `lib/innovations-pricing-mirror.js`, `lib/innovations-sync.js`, `lib/db.js` (`getLongSourcePool`), `scripts/innovations-sync-cli.js` |
| Count gate + allowlist drift check | optilens-local `scripts/innovations-pricing-counts.js`, `scripts/innovations-pricing-spec.js --check` |

The column list lives once (the `SPECS` array in `lib/innovations-pricing-mirror.js`); the migration DDL and the receiver
allowlists were generated from it, and `innovations-pricing-spec.js --check` proves the receiver still matches.

Rules the code follows: SELECT-only, `READ UNCOMMITTED`, on the existing read-only source login; entities are **not** in the
scheduled default selection and cannot be started from the cloud "Sync now" queue; the CLI **dry-runs unless `--commit`** is passed
for any `inn_*` entity; the watermark advances only after a committed run in which every batch was accepted.

## Run order

Nothing below has been run. Steps 1–3 are yours (you run all SQL and redeploys).

1. **Migrations**, in order, on the live DB (Lovable MCP `query_database` or the SQL editor):
   `20261110170000` → `20261110170100` → `20261110170200`. Tables stay empty until step 5. The first migration is re-runnable.
2. **Edge function redeploy** of `innovations-sync` (Lovable chat/dashboard; a git push does not redeploy).
3. **Verify the deploy** — this is the 2026-08-03 incident check, do not skip it:
   ```bash
   curl -s https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/innovations-sync/version
   ```
   Must show version `2026-11-10.1-inn-pricing-mirror` and 25 `inn_*` entities. Then `npm run qa:edge-smoke` (a bogus `x-api-key` with no
   Authorization header must reach the function's own `Invalid or revoked API key.`, not a gateway 401).
4. **Gate: expected counts.** On the office host (optilens-local checkout, vault unlocked), compare against the table below:
   ```bash
   node scripts/innovations-pricing-counts.js
   node scripts/innovations-pricing-spec.js --check
   ```
5. **Dry-run sync** (reads Innovations, posts `dry_run:true`, writes nothing; also confirms the receiver accepts every row):
   ```bash
   node scripts/innovations-sync-cli.js --use-credential-vault --entities all-inn --dry-run
   ```
   Each entity's `read` must equal its expected count below and `failed` must be 0. About 680 receiver calls; allow tens of minutes.
   To dry-run one entity: `--entities inn_lens_items`. Do not mix `inn_*` with other entities in one run (the CLI refuses).
6. **Commit sync** (first run is always a full read; this is the only step that writes to Supabase):
   ```bash
   node scripts/innovations-sync-cli.js --use-credential-vault --entities all-inn --commit
   ```
   Later runs are incremental on `LastUpdated` (10 minute overlap). `--full` re-reads everything.
7. **Report queries** (below). Step 1 of the reconciliation needs `inn_pricelist_map` filled before view (a) returns rows.

## Expected row counts (direct `SELECT COUNT(*)` on SQL Server, 2026-11-10, full run)

| Entity | Source | Expected rows |
|---|---|---:|
| `inn_price_lists` | `PriceLists` | 120 |
| `inn_rx_pos_sheets` | `PriceRxPOSSheets` | 325 |
| `inn_rx_pos_members` | `PriceRxPOSMembers` | 3,028 |
| `inn_rx_pos_items` | `PriceRxPOSItems` | 51,177 |
| `inn_price_lens_groups` | `PriceLensGroups` | 104 |
| `inn_stock_lenses` | `PriceStockLenses` | 173 |
| `inn_stock_lens_items` | `PriceStockLensItems` | 792 |
| `inn_stock_vendors` | `PriceStockVendors` | 54 |
| `inn_packages` | `Packages` | 94 |
| `inn_package_items` | `PackageItems` | 451 |
| `inn_price_packages` (added, parent of the two below) | `PricePackages` | 68 |
| `inn_price_package_members` | `PricePackageMembers` | 372 |
| `inn_price_package_items` | `PricePackageItems` | 279 |
| `inn_labs` | `Labs` | 12 |
| `inn_lab_extras` | `LabExtras` | 19 |
| `inn_currencies` | `Currencies` | 7 |
| `inn_material_groups` | `MaterialGroup` | 4 |
| `inn_materials` | `Materials` | 67 |
| `inn_mf_types` | `MFTypes` | 194 |
| `inn_lens_types` | `LensType` | 20,963 |
| `inn_lens_options` | `LensOptions` (all rows, on and off) | 226,712 |
| `inn_lens_items` | `LensItem`, **active path only** (item and every ancestor ON) | 148,008 |
| `inn_lens_alias` | `LensAlias` | 206,820 |
| `inn_customer_price_list` | `Customers` | 115 |
| `inn_invoice_lines` (added, for reconciliation c) | `InvoiceLines` ⋈ `Invoices`, CategoryType 1, `InvoiceTime >= 2026-01-01` | 16,603 |
| **Total** | | **676,561** |

Derived figures the views must reproduce (same date):

| Figure | Direct SQL Server count | Supabase |
|---|---:|---|
| Options ON at every level, every ancestor row present | 2,173 | `inn_lens_path_summary` → `full_path_on` |
| 2026 lens lines with no cost (any) | 4,421 | `select count(*) from inn_recon_zero_cost_lens_lines` |
| …charged and not suppressed (Phase 0 definition) | 1,913 | same view `where charged_unsuppressed` |

Live data moves (items, invoices, option flags change daily), so re-run `innovations-pricing-counts.js` immediately before the dry run and
compare against **that** output; the table above is the baseline from when the SQL was validated. `LensItem` has 1,557,593 rows in total; 1,082,201
are item-level ON, and 148,008 are ON at every level, which is what the mirror keeps.

### After the commit: compare Supabase to the gate

```sql
select e.entity, e.expected, c.n as in_supabase, c.n - e.expected as diff
from (values
  ('inn_price_lists',120),('inn_rx_pos_sheets',325),('inn_rx_pos_members',3028),('inn_rx_pos_items',51177),('inn_price_lens_groups',104),
  ('inn_stock_lenses',173),('inn_stock_lens_items',792),('inn_stock_vendors',54),('inn_packages',94),('inn_package_items',451),
  ('inn_price_packages',68),('inn_price_package_members',372),('inn_price_package_items',279),('inn_labs',12),('inn_lab_extras',19),
  ('inn_currencies',7),('inn_material_groups',4),('inn_materials',67),('inn_mf_types',194),('inn_lens_types',20963),
  ('inn_lens_options',226712),('inn_lens_items',148008),('inn_lens_alias',206820),('inn_customer_price_list',115),('inn_invoice_lines',16603)
) as e(entity, expected)
cross join lateral (
  select (xpath('/row/n/text()', query_to_xml(
    format('select count(*) as n from public.%I %s', e.entity, case when e.entity = 'inn_lens_items' then 'where on_active_path' else '' end),
    false, true, '')))[1]::text::int as n
) c
order by e.entity;
```

Rows that vanished from Innovations (hard deletes) are not propagated. After a **full** commit, stale rows are those with
`last_synced_at` older than that run's start, e.g. `select count(*) from inn_lens_options where last_synced_at < '<run start>'`.

## Reconciliation report queries

First tell the report which website price document corresponds to which Innovations customer list (there is no id link today; names only).
Candidates from Phase 0: the default website document ↔ list 109 "Wholesale Bdos Price List 2026", the export document ↔ list 116 "Wholesale Export Prices 2025". Confirm before relying on it:

```sql
-- insert into public.inn_pricelist_map (pricelist_version_id, inn_price_list_id, note) values (3, 109, 'default wholesale');
select id, name from public.pricelist_versions order by id;
select price_list_id, price_list_name, currency_id, is_active from public.inn_price_lists where price_list_group = 0 order by price_list_id;
```

```sql
-- lens on/off rule: summary, then the sellable set
select * from public.inn_lens_path_summary order by metric;
select * from public.inn_lens_active_full_path order by path_code;

-- (a) website price vs Innovations price, per lens, per list, per eye
select status, count(*) from public.inn_recon_price_vs_website group by status order by 2 desc;
select * from public.inn_recon_price_vs_website where status = 'differs' order by abs(diff_vs_min_bbd) desc;

-- (b) lenses sold on the website that are OFF (or unverifiable) in Innovations
select reason, count(*) from public.inn_recon_website_lens_off group by reason;
select * from public.inn_recon_website_lens_off where reason = 'off_in_innovations' order by lens_name;

-- (c) 2026 lens invoice lines with CostPrice = 0
select * from public.inn_recon_zero_cost_lens_summary order by invoice_month, zero_cost_lines desc;
select * from public.inn_recon_zero_cost_lens_lines where charged_unsuppressed order by invoice_time desc;

-- (d) cost lists in use whose items are older than 2022
select * from public.inn_recon_stale_cost_lists order by flag, price_list_id;
```

## Judgement calls to check

- **Per eye.** The website stores a pair price; per-eye is `pair / 2` (split-eye rule). Innovations `PriceRxPOSItems.Price` is read as a per-eye
  price in the list currency, converted to BBD with `Currencies.CurrentExchangeRate` (units of that currency per 1 BBD). A `differs`
  result that is exactly 2x means that assumption is wrong for that list. Tolerance for `match` is 0.01.
- **Group-priced lenses.** 1,431 `PriceRxPOSItems` rows price a whole `PriceLensGroup` with no lens signature, and nothing in Innovations
  records which lens belongs to which group (`LensProducts` is empty). Those lenses show as `no_innovations_price` in (a); only signature-priced lenses are compared.
- **Website lens ↔ Innovations lens** goes through `lens_alias_map` (primary alias). Lenses without a mapping appear in (b) as `no_alias_mapping`.
- **Added beyond the list:** `inn_price_packages` (the price-package header both child tables point at), `inn_invoice_lines` (reconciliation c needs invoice lines),
  `inn_pricelist_map` (manual link, not a mirror). `PackageMembers` is empty in Innovations and was left out.
- **`inn_lab_extras` is an allowlist.** `dbo.LabExtras` also holds AWS keys, Gatekeeper JWT secrets and PIN codes; none are selected, and a test enforces it.
- **Scope.** Receiver reuses `supplies:write` (already on the office key), so no new key is needed. A dedicated `pricing:write` scope is a later option.
- **Lens items, incremental runs.** An item whose item/option/type/MF type/material/group row changed is re-sent with `on_active_path` computed, so an item that
  falls off the path becomes `false` instead of being deleted. Some never-active items can also arrive; filter on `on_active_path`.
- **Cost data lands in Supabase** (`inn_rx_pos_items` cost-list prices, `inn_invoice_lines.cost_price`). RLS limits reads to admins; no anon access.
- `lens_aliases` (the existing Zen-fed entity) is untouched; `inn_lens_alias` reads SQL Server directly.
