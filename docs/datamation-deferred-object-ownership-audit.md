# Datamation Deferred Object Ownership Audit

Date: 2026-07-16

## Scope

This is a read-only ownership and runtime-usage audit for the intentionally
deferred Lovable-source-only schema drift after the Datamation reconciliation
pass.

No database, deployment, Vercel, Lovable-connection, Edge Function, cron,
auth-user, application-data, or storage-object changes were made.

Datamation MCP verification used the configured project URL
`https://dzsalnvmlvjoatryhqfz.supabase.co`.

## Evidence Checked

- Current runtime source: `src`, `app`, `supabase/functions`, route files,
  hooks, pages, components, and libs.
- Current migrations: `supabase/migrations`.
- Generated types: `src/integrations/supabase/types.ts`.
- Generated inventories and docs: `tmp/lovable-schema-inventory.json`,
  `tmp/datamation-schema-inventory.json`, `docs/lovable-schema-inventory.md`,
  `docs/datamation-schema-inventory.md`, and
  `docs/supabase-schema-inventory-comparison.md`.
- Git history with `git log --all -G` for every deferred relation/function
  name group.
- Datamation read-only catalog checks for relation/function existence,
  function/view/trigger/policy definitions mentioning deferred names, cron jobs,
  Edge Functions, and function execute privileges.

## Current Runtime Findings

- `quotes_customer` has an active customer-portal call site:
  `src/components/account/sections/QuoteFormSection.tsx:24` and
  `src/components/account/sections/QuoteFormSection.tsx:34`. The route is
  still mounted through `src/routes/portal/PortalRoutes.tsx:12` and
  `src/routes/portal/PortalRoutes.tsx:34`.
- `addons_public` and `lenses_public` appear in integration tests and generated
  types, but not in current storefront/runtime queries:
  `src/tests/integration/supabaseRlsHardening.integration.test.ts:71` and
  `src/tests/integration/costColumnRlsRegression.integration.test.ts:39`.
- No current `src`, `app`, `supabase/functions`, route, page, hook, component,
  or lib source call site was found for the other deferred relation/function
  names.
- Datamation MCP reports no deployed Edge Functions and no matching cron jobs.
- Initial audit state: Datamation did not contain the deferred source-only
  relations or the listed source-only deferred RPCs.
- Applied follow-up state: `quotes_customer` and `quote_lines_customer` now
  exist in Datamation as `security_invoker=true` views with SELECT-only grants
  to `authenticated` and `service_role`.

## Target-Only Cleanup Finding

Datamation still has two target-side integration functions that reference the
retired integration tables even though those tables are absent:

| Target object | Evidence | Risk | Proposed disposition |
| --- | --- | --- | --- |
| `public.log_integration_event(uuid,text,text,text,text,jsonb)` | Datamation catalog definition inserted into `public.integration_structured_logs`; function was `SECURITY DEFINER`, `search_path=public`, and executable by `PUBLIC`, `anon`, `authenticated`, and `service_role`. No current source, Edge Function, or cron consumer found. | High: public-executable definer function with broken retired table dependency. | Completed by `20260717003613_datamation_drop_orphan_integration_functions.sql`; post-apply verification returned no matching function. |
| `public.timeout_stale_integration_sync_jobs()` | Datamation catalog definition updated `public.integration_sync_jobs` and `public.integration_connections`; function was `SECURITY DEFINER`, `search_path=public`, and executable by `PUBLIC`, `anon`, `authenticated`, and `service_role`. No current source, Edge Function, or cron consumer found. | High: public-executable definer function with broken retired table dependency. | Completed by `20260717003613_datamation_drop_orphan_integration_functions.sql`; post-apply verification returned no matching function. |

These were not source-only drift objects, so they were not restored from
Lovable. They were removed from Datamation as a target-only cleanup.

## Decision Matrix

| Object | Category | Evidence | Active consumer | Proposed disposition | Owner needed | Cleanup risk |
| --- | --- | --- | --- | --- | --- | --- |
| `public.addons_public` | R2 view | Defined by `supabase/migrations/20260617174130_d66da831-ed25-4237-8aac-86516e322907.sql:11`; grants repeated in `20260624090000_harden_product_cost_rls_and_analytics_inserts.sql:29`; current hits are tests/types. | No current runtime consumer found. | Remain deferred. Candidate for later Lovable cleanup only after storefront smoke confirms no legacy view dependency and tests/types are refreshed. | Storefront/pricing only if restored. | Low; possible stale generated-type/test dependency. |
| `public.lenses_public` | R2 view | Defined by `supabase/migrations/20260617174130_d66da831-ed25-4237-8aac-86516e322907.sql:24`; grants repeated in `20260712093219_9f18ae58-94e1-4f74-838c-2ed363ee7ef2.sql:6`; current hits are tests/types. | No current runtime consumer found. | Remain deferred. Candidate for later Lovable cleanup only after storefront smoke confirms no legacy view dependency and tests/types are refreshed. | Storefront/pricing only if restored. | Low; possible stale generated-type/test dependency. |
| `public.pricelist_variance` | R2 view | Defined by `supabase/migrations/20260715160000_pricelists_master_fork_model.sql:276`; documented in `docs/PRICING_SCHEMA.md:252` and `docs/issues/BS1-04-master-and-fork-model.md:30`. | No current runtime consumer found. | Remain deferred unless pricing analytics owner confirms an active report. Candidate for later Lovable cleanup if analytics owner declines. | Pricing analytics. | Low/medium; reporting expectation could exist outside current source. |
| `public.quotes_customer` | R2 portal view | Defined by `supabase/migrations/20260617174130_d66da831-ed25-4237-8aac-86516e322907.sql:70`; called by `QuoteFormSection.tsx:34`; route mounted in `PortalRoutes.tsx:34`. | Yes, customer portal quote requests. | Completed by `20260717003803_datamation_restore_portal_quote_customer_views.sql` and tightened by `20260717003919_datamation_tighten_portal_quote_view_grants.sql`. | Portal/quotes. | Low after restore; keep cutover smoke on `/profile/quotes`. |
| `public.quote_lines_customer` | R2 portal view | Defined by `supabase/migrations/20260617174130_d66da831-ed25-4237-8aac-86516e322907.sql:89`; generated type references at `src/integrations/supabase/types.ts:8166`. | No current direct runtime consumer found. | Restored as paired portal quote read model by `20260717003803_datamation_restore_portal_quote_customer_views.sql` and tightened by `20260717003919_datamation_tighten_portal_quote_view_grants.sql`. | Portal/quotes. | Low; selected columns exclude cost/profit/internal fields. |
| `public.integration_connections` | Retired integration/Odoo | Created in March integration migrations; explicitly dropped by `supabase/migrations/20260624181000_drop_odoo_integration.sql:43`. Git history removal commit: `19bcbd03 Add Scotia eCom gateway; remove Odoo`. | No current runtime consumer found. | Retire from Lovable later in a separate cleanup migration after source access is reauthorized. Do not restore to Datamation. | No, unless Odoo decommissioning is reversed. | Medium; Lovable inventory estimated 1 row and newer Datamation has replacement contact/integration tables. |
| `public.integration_connection_secrets` | Retired integration/Odoo | Explicitly dropped by `20260624181000_drop_odoo_integration.sql:42`; source policy blocked direct access in `docs/lovable-schema-inventory.md:6486`. | No current runtime consumer found. | Retire from Lovable later; do not restore secrets table. | No, unless Odoo decommissioning is reversed. | High; secret-bearing table with estimated 1 source row. |
| `public.integration_sync_jobs` | Retired integration/Odoo | Explicitly dropped by `20260624181000_drop_odoo_integration.sql:41`; stale docs mention it in `docs/integration-failure-recovery-runbook.md:6`. | No current runtime consumer found. | Retire from Lovable later; also clean stale docs in a docs-only follow-up if desired. | No, unless Odoo decommissioning is reversed. | Medium; source inventory estimated 5 rows and stale operational docs remain. |
| `public.integration_sync_errors` | Retired integration/Odoo | Explicitly dropped by `20260624181000_drop_odoo_integration.sql:40`; management RPC created in `supabase/migrations/20260304110000_integration_sync_errors_management.sql:39`. | No current runtime consumer found. | Retire from Lovable later. Do not restore. | No, unless Odoo decommissioning is reversed. | Low/medium; source inventory estimated 0 rows, but historical error semantics may be useful only for archive. |
| `public.integration_structured_logs` | Retired integration/Odoo | Explicitly dropped by `20260624181000_drop_odoo_integration.sql:39`; stale docs mention it in `docs/integration-failure-recovery-runbook.md:9`. | No current runtime consumer found. | Retire from Lovable later; do not restore. | No, unless Odoo decommissioning is reversed. | Medium; source inventory estimated 17 log rows. |
| `public.integration_health_metrics_dashboard` | Retired integration/Odoo | Explicitly dropped by `20260624181000_drop_odoo_integration.sql:35`; current generated types still include it at `src/integrations/supabase/types.ts:8063`. | No current runtime consumer found. | Retire from Lovable later; do not restore. | No, unless Odoo decommissioning is reversed. | Low; generated-type residue only. |
| `public.lens_recommendation_rule_sets` | Owner decision | Present in Lovable inventory at `docs/lovable-schema-inventory.md:156` and generated types at `src/integrations/supabase/types.ts:4158`; Git history points to `bd107cac feat: add smart customer journey`; related current files from that commit are absent. | No current runtime consumer found. | Remain deferred. Adopt only with a named lens-assistant/product owner and final RLS/RPC review. | Lens assistant/product. | Medium; inventory estimated 0 rows but SECURITY DEFINER recommendation RPCs are related. |
| `public.lens_recommendation_rules` | Owner decision | Present in Lovable inventory at `docs/lovable-schema-inventory.md:157` and generated types at `src/integrations/supabase/types.ts:4197`; related historical lens-assistant files are absent from current tree. | No current runtime consumer found. | Remain deferred. Adopt only with the lens recommendation product surface. | Lens assistant/product. | Medium; depends on lenses and recommendation RPCs. |
| `public.order_payment_links` | Owner decision | Present in Lovable inventory at `docs/lovable-schema-inventory.md:172` and generated types at `src/integrations/supabase/types.ts:4980`; Git history points to order-first checkout work in `ef46336a`. | No current runtime consumer found. | Remain deferred. Adopt only if checkout owner confirms tokenized order payment links are still required. | Checkout/payments. | Medium/high; token-bearing payment-link surface. |
| `public.order_revisions` | Owner decision | Present in Lovable inventory at `docs/lovable-schema-inventory.md:174` and generated types at `src/integrations/supabase/types.ts:5084`; related `place_customer_order_v2` is also deferred. | No current runtime consumer found. | Remain deferred. Adopt only with a confirmed order revision/audit product requirement. | Checkout/orders. | Medium; audit-history semantics should not be invented during migration. |
| `public.product_variant_configs` | Owner decision | Present in Lovable inventory at `docs/lovable-schema-inventory.md:193` and generated types at `src/integrations/supabase/types.ts:5879`; Git history points to `ef46336a`; current historical files such as `src/features/store/variants/useProductVariants.ts` are absent. | No current runtime consumer found. | Remain deferred. Needs website store owner decision because source inventory estimated 3 rows. | Website store/product variants. | Medium; source data exists and current Datamation uses different store variant tables. |
| `public.rx_order_drafts` | Owner decision | Present in Lovable inventory at `docs/lovable-schema-inventory.md:203` and generated types at `src/integrations/supabase/types.ts:6514`; Git history points to smart customer journey work. | No current runtime consumer found. | Remain deferred. Adopt only if Rx draft workflow is revived. | Portal/Rx/lens assistant. | Medium; depends on recommendation rule sets. |
| `realtime.messages_2026_07_*` partitions | Supabase-managed Realtime | Listed only as source-only Realtime partitions in `docs/supabase-schema-inventory-comparison.md:33` through `docs/supabase-schema-inventory-comparison.md:38`. | Supabase-managed only. | Never recreate manually. Leave to Supabase Realtime. | No. | None for app cleanup; manual recreation would be the risk. |
| `public.cancel_integration_sync_job(uuid)` | Retired integration/Odoo function | Explicitly included in the drop loop at `20260624181000_drop_odoo_integration.sql:26`; created/updated in `20260304170000_add_cancel_sync_job_rpc.sql:3` and `20260308213659_9225e3dc-276e-4356-8d2a-a5e66ac41f7a.sql:3`. | No current runtime consumer found. | Retire from Lovable later; do not restore. | No, unless Odoo decommissioning is reversed. | Low/medium; broken without retired job tables. |
| `public.enqueue_due_odoo_sync_jobs()` | Retired integration/Odoo function | Explicitly included in the drop loop at `20260624181000_drop_odoo_integration.sql:21`; source function listed in `tmp/lovable-schema-inventory.json:56627`. | No current runtime or cron consumer found. | Retire from Lovable later; do not restore. | No, unless Odoo decommissioning is reversed. | Medium; scheduler-like function, but Datamation cron scan returned 0 matching jobs. |
| `public.get_integration_connection_secret(uuid)` | Retired integration/Odoo function | Explicitly included in the drop loop at `20260624181000_drop_odoo_integration.sql:22`; source function listed in `tmp/lovable-schema-inventory.json:56690`. | No current runtime consumer found. | Retire from Lovable later; do not restore. | No, unless Odoo decommissioning is reversed. | High; secret accessor. |
| `public.manage_integration_sync_error(uuid,text)` | Retired integration/Odoo function | Explicitly included in the drop loop at `20260624181000_drop_odoo_integration.sql:27`; source function listed in `tmp/lovable-schema-inventory.json:56843`. | No current runtime consumer found. | Retire from Lovable later; do not restore. | No, unless Odoo decommissioning is reversed. | Low/medium; broken without retired error table. |
| `public.trigger_integration_sync_job(text,text,text)` | Retired integration/Odoo function | Explicitly included in the drop loop at `20260624181000_drop_odoo_integration.sql:25`; source function listed in `tmp/lovable-schema-inventory.json:57104`. | No current runtime consumer found. | Retire from Lovable later; do not restore. | No, unless Odoo decommissioning is reversed. | Medium; job-triggering function. |
| `public.upsert_integration_connection(...)` overloads | Retired integration/Odoo function | Explicitly included in the drop loop at `20260624181000_drop_odoo_integration.sql:23`; source overloads listed in `tmp/lovable-schema-inventory.json:57131` and `tmp/lovable-schema-inventory.json:57140`. | No current runtime consumer found. | Retire from Lovable later; do not restore. | No, unless Odoo decommissioning is reversed. | High; writes connection and credential records. |
| `public.upsert_integration_connection_with_secret(...)` overloads | Retired integration/Odoo function | Explicitly included in the drop loop at `20260624181000_drop_odoo_integration.sql:24`; source overloads listed in `tmp/lovable-schema-inventory.json:57149` and `tmp/lovable-schema-inventory.json:57158`. | No current runtime consumer found. | Retire from Lovable later; do not restore. | No, unless Odoo decommissioning is reversed. | High; writes connection secrets. |
| `public.email_queue_dispatch()` | Owner decision function | Source function listed in `tmp/lovable-schema-inventory.json:56600`; current Edge Function list is empty and no current runtime caller found. | No current runtime consumer found. | Remain deferred. Needs email-infra owner to decide whether PGMQ dispatch stays database-owned or Edge/runtime-owned. | Email infrastructure. | Medium/high; dispatch code may call network/email paths. |
| `public.email_queue_wake()` | Owner decision function | Source function listed in `tmp/lovable-schema-inventory.json:56609`; source triggers shown at `docs/lovable-schema-inventory.md:2001` and `docs/lovable-schema-inventory.md:2087`; Datamation has no matching email triggers. | No current runtime trigger/consumer found. | Remain deferred unless email-infra owner revives DB-triggered queue wakeups. | Email infrastructure. | Medium; trigger-based dispatch can create unexpected side effects. |
| `public.publish_lens_recommendation_rule_set(uuid)` | Owner decision function | Source function listed in `tmp/lovable-schema-inventory.json:56924`; generated type at `src/integrations/supabase/types.ts:8843`; related current rules admin page is absent. | No current runtime consumer found. | Remain deferred with lens recommendation rules. | Lens assistant/product. | Medium; publishing changes customer-facing recommendations. |
| `public.recommend_lenses(jsonb)` | Owner decision function | Source function listed in `tmp/lovable-schema-inventory.json:56951`; generated type at `src/integrations/supabase/types.ts:8859`; historical lens assistant files are absent. | No current runtime consumer found. | Remain deferred. Adopt only with a product-owned lens assistant flow. | Lens assistant/product. | Medium; SECURITY DEFINER review required before exposure. |
| `public.set_updated_at_timestamp()` | Owner decision function | Source function listed in `tmp/lovable-schema-inventory.json:57041`; source triggers shown in `docs/lovable-schema-inventory.md:2614`, `docs/lovable-schema-inventory.md:10576`, and `docs/lovable-schema-inventory.md:10631`; Datamation has no matching triggers on those tables. | No current target trigger/consumer found. | Remain deferred. Prefer existing current timestamp helper if a future migration needs one. | Platform/schema owner. | Low/medium; generic helper name can hide search-path/privilege mistakes. |
| `public.sync_auth_email_to_profile()` | Owner decision function | Source function listed in `tmp/lovable-schema-inventory.json:57068`; source auth triggers shown in `docs/lovable-schema-inventory.md:1368` and `docs/lovable-schema-inventory.md:1369`. | No current Datamation auth trigger found. | Remain deferred. Requires explicit auth/profile owner decision; do not touch auth triggers in this audit. | Auth/profile. | High; auth trigger changes are sensitive and outside current allowed scope. |
| `public.get_customer_command_center()` | Owner decision function | Source function listed in `tmp/lovable-schema-inventory.json:56681`; generated type at `src/integrations/supabase/types.ts:8665`; Git history points to `bd107cac`, but current `src/features/portal/customerCommandCenter.ts` is absent. | No current runtime consumer found. | Remain deferred. Adopt only if customer command center product surface is restored. | Portal/customer experience. | Medium; depends on `rx_order_drafts` and customer summary assumptions. |
| `public.place_customer_order_v2(uuid,jsonb,jsonb,uuid)` | Owner decision function | Source function listed in `tmp/lovable-schema-inventory.json:56897`; generated type at `src/integrations/supabase/types.ts:8824`; depends on deferred order/payment surfaces. | No current runtime consumer found. | Remain deferred. Adopt only with a checkout owner decision and full payment/security review. | Checkout/payments/orders. | High; order-placement RPC is a write path. |

## Applied Migration Follow-up

Applied to Datamation after this audit:

- `20260717003613_datamation_drop_orphan_integration_functions.sql`
  - Remote migration history: `20260717003651`
  - Dropped `public.log_integration_event(...)` and
    `public.timeout_stale_integration_sync_jobs()`.
- `20260717003803_datamation_restore_portal_quote_customer_views.sql`
  - Remote migration history: `20260717003847`
  - Restored `quotes_customer` and `quote_lines_customer` as
    `security_invoker=true` views.
- `20260717003919_datamation_tighten_portal_quote_view_grants.sql`
  - Remote migration history: `20260717003943`
  - Restricted both portal quote views to SELECT-only for `authenticated` and
    `service_role`.

Post-apply Datamation counts from MCP catalog checks: 242 migrations, 236
relations, 2,539 columns, 2,076 constraints, 518 policies, and 238 functions.

## Recommended Next Migration

Do not migrate additional Lovable source-only objects until the remaining owner
decisions are resolved. The next database step should be either:

- a narrow storefront/pricing compatibility migration if `addons_public`,
  `lenses_public`, or `pricelist_variance` is confirmed active by smoke tests;
  or
- a source-cleanup plan for retired Lovable Odoo objects after source access is
  explicitly reauthorized.

## Items Requiring Product/Owner Decisions

- Lens assistant/recommendations: decide whether the smart customer journey
  experiment is being revived.
- Checkout/order revisions/payment links: decide whether the order-first
  checkout experiment is being revived.
- Store variant configs: decide whether the three source-estimated
  `product_variant_configs` rows belong to the current store variant model.
- Email queue functions: decide whether Datamation email dispatch should be
  database-triggered or handled outside Postgres.
- Auth email/profile sync: decide separately because auth triggers are outside
  this audit's allowed change set.
