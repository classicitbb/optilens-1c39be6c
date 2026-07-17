# Datamation Schema Drift Classification

Generated from the Lovable and Datamation inventories after the schema and
policy/RPC reconciliation migrations.

## Decision

Do **not** copy every source-only object into Datamation. The source inventory contains a mixture of:

- current application schema that must be restored in Datamation;
- deliberately retired Odoo/integration schema that the repository drops later;
- source-only, unowned remnants that need an owner decision before adoption; and
- Supabase-managed realtime partitions that must never be recreated manually.

No data import, storage-object upload, Vercel cutover, edge-function deployment, or cron creation is part of this work.

## Evidence baseline

| Item | Result |
| --- | --- |
| Lovable inventory | 229 relations, 2,441 columns, 456 policies, 238 functions, 6 buckets |
| Datamation inventory after reconciliation | 234 relations, 2,506 columns, 518 policies, 240 functions, 6 buckets |
| Remaining source-only drift | 23 relations, 260 columns, 1,489 constraints, 51 policies, 17 functions, 0 buckets |
| Datamation migration history | 239 migration names recorded, including `datamation_schema_reconciliation`, `datamation_policy_rpc_reconciliation`, and `datamation_recovered_rpc_definitions` |

Post-audit Datamation state after the applied cleanup and portal quote view
migrations: 242 migrations, 236 relations, 2,539 columns, 2,076 constraints,
518 policies, and 238 functions. The remaining source-only relation drift is
now 21 relations after restoring `quotes_customer` and
`quote_lines_customer`; the remaining source-only function drift is still 17,
while target-only function extras decreased by two.

The repaired migration history is not by itself proof of schema parity. During the initial MCP run, 80 migration-history records had to be inserted with `created_by = 'mcp_history_repair'` after the MCP-generated migration versions collided. The target inventory is still missing objects defined by those files, including `catalog_templates`, `catalog_sections`, `cadences`, `customers`, `statements`, and `live_data_gateway_requests`.

Therefore, do not replay the historical files blindly: several contain static seeds or backfill DML, and later migrations may have changed their assumptions. The additive reconciliation migration restored all R1 relation and column shapes, the five missing buckets, and the core secure views. It deliberately did not import data, upload storage objects, create cron jobs, or cut over Vercel/Lovable.

The remaining relation and column differences are entirely classified as R2 compatibility views, retired Odoo/integration objects, owner-decision objects, or Supabase-managed Realtime partitions.

## Policy/RPC reconciliation — completed 2026-07-16

`20260716203249_datamation_policy_rpc_reconciliation.sql` restored 85
source-equivalent R1 policies and 19 active R1 functions.
`20260716211046_datamation_recovered_rpc_definitions.sql` then restored the
three source-exported R1 functions `effective_prices_for_customer`,
`resolve_contact_customer_links`, and `update_api_key_scopes`.

Every restored `SECURITY DEFINER` function has `PUBLIC` and `anon` execute
revoked before receiving only its required `authenticated` and/or
`service_role` grant. The recovered routines use `SET search_path = ''` and
fully-qualified references. Direct post-apply verification found all 85
policies and all 22 functions present, with no restored `SECURITY DEFINER`
function executable by `PUBLIC`.

The remaining 51 source-named policy differences are name-level
consolidations already covered by Datamation policies, retired Odoo policy
surfaces, or owner-decision surfaces. They are not a reason to replay
historical policy migrations.

The remaining 17 source-only functions are deliberately deferred:

- Retired Odoo/integration: `cancel_integration_sync_job`,
  `enqueue_due_odoo_sync_jobs`, `get_integration_connection_secret`,
  `manage_integration_sync_error`, `trigger_integration_sync_job`, and
  the four `upsert_integration_connection*` overloads.
- Owner-decision: `email_queue_dispatch`, `email_queue_wake`,
  `publish_lens_recommendation_rule_set`, `recommend_lenses`,
  `set_updated_at_timestamp`, and `sync_auth_email_to_profile`.
- Dependent on owner-decision relations: `get_customer_command_center`
  (uses `rx_order_drafts`) and `place_customer_order_v2` (uses
  `order_payment_links` and `order_revisions`).

## Deferred-object ownership audit — completed 2026-07-16

See `docs/datamation-deferred-object-ownership-audit.md` for the read-only
ownership and runtime-usage matrix covering the remaining deferred relations
and functions.

Confirmed outcomes from that audit and the applied follow-up migrations:

- `quotes_customer` had an active customer-portal runtime consumer in
  `QuoteFormSection` and has now been restored in Datamation as a
  `security_invoker=true` view.
- `quote_lines_customer` had no current direct runtime consumer, but remained
  paired with the portal quote surface and has now been restored with the same
  security model.
- The restored portal quote views now grant only SELECT to `authenticated` and
  `service_role`; selected columns exclude cost, profit, and internal-note
  fields.
- `addons_public`, `lenses_public`, and `pricelist_variance` have no current
  runtime consumer outside tests, generated types, and docs; keep them
  deferred unless their owning storefront/pricing/reporting surface is
  explicitly confirmed.
- The Odoo/integration relation and function set remains retired. The audit
  found no current source, Edge Function, route, or cron consumer.
- Owner-decision objects remain unapproved for Datamation adoption; some came
  from historical smart customer journey/order-first checkout experiments that
  are not present in the current tree.
- The Realtime partitions remain system-managed and must not be recreated.

The audit also found two **target-only** Datamation orphan functions that were
not source-only drift objects: `log_integration_event(...)` and
`timeout_stale_integration_sync_jobs()`. Both referenced missing retired
integration tables, were `SECURITY DEFINER`, used `search_path=public`, and
were executable by broad roles. They were dropped by
`20260717003613_datamation_drop_orphan_integration_functions.sql`.

## Classification

### R1 — restore in the Datamation reconciliation migration

These objects have production call sites and/or their source definitions live in repository migrations that did not land in Datamation. Their missing columns, constraints, policies, and database functions belong in the same reconciliation migration.

| Domain | Relations / views to restore | Runtime evidence |
| --- | --- | --- |
| Catalog publisher | `catalog_templates`, `catalog_sections`, `catalog_assignments`, `catalog_pages`, `catalog_page_objects`, `catalog_live` | `src/hooks/useCatalogTemplates.ts`, `CatalogPublisherPage.tsx`, `CatalogEditorPage.tsx`, Canvas Editor |
| Pricing | `material_upgrades`, `matrix_allocations`, `price_matrix`, `pricelist_catalog_rows`, `pricelist_child_sections`, `pricelist_line_overrides`, `pricelist_lines`, `pricelist_notes`, `pricelist_overrides`, `pricelist_versions`, `pricelists`, `rx_price_categories`, `rx_price_category_versions`, `rx_price_groupings`, `rx_price_grouping_versions` | pricing hooks, `src/lib/pricing/**`, catalog editor |
| Customer and portal | `customers`, `balances`, `balances_public`, `bank_payment_portals`, `customer_account_number_duplicates`, `customer_payment_profile_public`, `statements`, `statement_lines`, `statements_public`, `statement_lines_public` | `WebsitePortalsPage.tsx`, `ContactsPage.tsx`, statement UI, `innovations-sync`, `api-v1`, and Doc Studio functions |
| Gateway and sync | `live_data_gateway_agents`, `live_data_gateway_requests`, `innovations_sync_runs`, `innovations_sync_dead_letters` | `live-data-gateway` and `innovations-sync` Edge Functions |
| CRM workflow | `crm_pipelines`, `cadences`, `cadence_steps`, `cadence_enrollments`, `order_activity`, `outreach_outbox`, `customer_order_health` | `useCadences.ts`, CRM pages, `crm-draft-outreach` |
| Store and variants | `product_variants`, `store_product_media`, `store_product_overrides`, `store_product_variants_public` | `useProductVariants.ts`, `useStoreProducts.ts`, `WebsiteStorePage.tsx` |
| API surface | `api_keys`, `api_audit_log` | `ApiKeysPage.tsx` and the `api-v1` function |

The reconciliation must also restore missing columns on relations that already exist in Datamation. The inventory identifies these target relations: `activities`, `cart_items`, `contacts`, `help_articles`, `helpdesk_ticket_review_queue_items`, `lead_audits`, `lenses`, `notes`, `opportunities`, `order_items`, `price_catalog`, and `profiles`.

For each R1 table, bring over only the final schema state: columns, constraints, indexes, triggers, RLS enablement, policies, and required functions. Do not copy rows, seed example catalogs/blog posts, or historical backfill updates.

### R2 — restore only after the R1 repair is proven

These are compatibility/read-model views. They should be recreated only when the consuming route or API endpoint is included in the cutover smoke tests.

- `addons_public` and `lenses_public`: source safe views. The storefront’s current preferred path is the safe RPC surface, so do not restore them solely to satisfy stale generated types or tests.
- `quotes_customer`: restored because the customer quote route remains enabled and `QuoteFormSection` consumes it.
- `quote_lines_customer`: restored as the paired portal quote-line read model; no current direct consumer was found, but its column set is safe and excludes cost/profit/internal fields.
- `pricelist_variance`: no direct current production query was found; retain only if its intended analytics consumer is confirmed.

All R2 views must use the final security model (`security_invoker` where appropriate) and must not re-expose cost-bearing columns.

### Retire — intentionally do not copy from Lovable

The following source relations belong to the decommissioned Odoo/generic integration. `20260624181000_drop_odoo_integration.sql` explicitly drops them and their dependent routines, so Datamation is correct to omit them.

- `integration_connections`
- `integration_connection_secrets`
- `integration_sync_jobs`
- `integration_sync_errors`
- `integration_structured_logs`
- `integration_health_metrics_dashboard`

The associated missing functions are also retired: `cancel_integration_sync_job`, `enqueue_due_odoo_sync_jobs`, `get_integration_connection_secret`, `manage_integration_sync_error`, `trigger_integration_sync_job`, and the `upsert_integration_connection*` overloads.

Do not restore these objects unless the product decision reverses the Odoo decommissioning.

### Owner decision required — do not migrate yet

No current production call site establishes these as active product surfaces:

- `lens_recommendation_rule_sets`
- `lens_recommendation_rules`
- `order_payment_links`
- `order_revisions`
- `product_variant_configs`
- `rx_order_drafts`

Related functions that also need explicit ownership before adoption include `publish_lens_recommendation_rule_set`, `recommend_lenses`, `email_queue_dispatch`, `email_queue_wake`, `set_updated_at_timestamp`, and `sync_auth_email_to_profile`.

Default disposition: leave them out of Datamation and record that decision in
the reconciliation migration documentation. If an owner confirms an active
consumer, add a separately reviewed additive migration sourced from Lovable's
exact definition. The ownership audit found the strongest historical evidence
for these objects in smart customer journey and order-first checkout commits
whose runtime files are not present in the current tree.

### System-managed — never recreate manually

The six `realtime.messages_2026_07_*` partitions are generated by Supabase Realtime. They are inventory drift only, not application schema. Do not create or migrate them.

## Storage bucket classification

Create bucket definitions and their RLS policies in the reconciliation migration, but do **not** upload any objects yet.

| Bucket | Public | Decision |
| --- | --- | --- |
| `catalog-assets` | yes | Recreate definition; editor-only write/delete policies |
| `data-files` | no | Recreate definition; authenticated editor read/write/delete policies |
| `docs` | no | Recreate definition; authenticated editor read/write/delete policies |
| `product-images` | yes | Recreate definition; public read plus authenticated editor write policy |
| `zenvue-branding` | yes | Recreate definition; authenticated editor write/delete policies |
| `video` | yes | Already present; retain existing policy set |

The inventory’s source storage policies are the authority for the exact predicates. Public buckets still need narrow write policies; public read does not justify public listing or mutation.

## Required repair sequence

1. Create a new migration with `supabase migration new datamation_schema_reconciliation`.
2. Populate it from the final definitions of the R1 relations and the existing-relation column gaps. Use idempotent DDL and preserve the repository’s current security patterns.
3. Add the five bucket definitions and source-equivalent storage policies. Do not insert storage objects.
4. Add only the R2 views whose consuming route/API is included in the planned cutover smoke test.
5. Leave Retire, Owner-decision, and System-managed groups out of the migration.
6. Run MCP migration status/dry-run review before applying. Apply the new reconciliation migration once, not the 80 historical files again.
7. Re-run `scripts/supabase_schema_inventory.sql`, render the Datamation manifest, and regenerate the comparison. Every remaining difference must be either Retire, Owner-decision, or System-managed and be documented here.
8. Only after that schema gate passes, plan auth/data export, storage-object transfer, Edge Function deployment, and Vercel cutover.

## Acceptance criteria for the next migration pass

- Production catalog, pricing, CRM, customer/statement, store, API-key, and gateway queries no longer receive missing-relation or missing-column errors.
- R1 relation/column/constraint/policy/function drift is eliminated or has a documented intentional replacement.
- The five bucket records and their policies exist, while their object counts remain zero until the data-transfer phase.
- `cron.job` remains unchanged; schedules are a separate explicit decision.
- No Vercel environment variable, Lovable connection, auth user, or application data changes.
