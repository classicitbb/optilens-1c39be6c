# Supabase Database Replication Plan

This is the working plan for recreating the Lovable Cloud backend in the Datamation Supabase project.

Destination project:

- Project ref: `dzsalnvmlvjoatryhqfz`
- API URL: `https://dzsalnvmlvjoatryhqfz.supabase.co`

## Principle

Do not recreate the database by guessing. We need an inventory from the source and the target, then we compare them before importing production data.

The preferred path is a logical Postgres dump if Lovable exposes a database connection string. If Lovable does not expose that, we use Lovable's table CSV exports plus the schema inventory SQL in this repo.

## Track A: Full Postgres Dump

Use this if Lovable gives a usable source Postgres connection string.

Run against the source:

```powershell
$env:OLD_DB_URL="<lovable-cloud-postgres-url>"
npx supabase db dump --db-url $env:OLD_DB_URL -f tmp\roles.sql --role-only
npx supabase db dump --db-url $env:OLD_DB_URL -f tmp\schema.sql
npx supabase db dump --db-url $env:OLD_DB_URL -f tmp\data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Run against the Datamation target:

```powershell
$env:NEW_DB_URL="<datamation-postgres-url>"
psql --single-transaction --variable ON_ERROR_STOP=1 --file tmp\roles.sql --file tmp\schema.sql --command "SET session_replication_role = replica" --file tmp\data.sql --dbname $env:NEW_DB_URL
```

This is the cleanest route because it can include `auth` rows and password hashes when the source connection has enough access.

## Track B: Lovable Table CSV Export

Use this if Lovable only lets us export tables.

1. Run [scripts/supabase_schema_inventory.sql](../scripts/supabase_schema_inventory.sql) in Lovable Cloud SQL editor.
2. Save the JSON result as `tmp/lovable-schema-inventory.json`.
3. Run the same SQL in Datamation Supabase SQL editor.
4. Save the JSON result as `tmp/datamation-schema-inventory.json`.
5. Compare inventories:

```powershell
node scripts\compare_supabase_inventory.mjs --source tmp\lovable-schema-inventory.json --target tmp\datamation-schema-inventory.json --out docs\supabase-schema-inventory-comparison.md
```

6. Apply missing schema through migrations until the comparison is clean. Use [the Datamation schema-drift classification](datamation-schema-drift-classification.md) to distinguish live application dependencies from intentionally retired or system-managed source objects; do not copy every inventory difference blindly.
7. Export Lovable table CSVs.
8. Import auth users first.
9. Import data tables in dependency order.
10. Upload storage buckets and objects separately.

## Tables and Columns

The inventory SQL records:

- schemas, tables, views, materialized views, foreign tables
- all columns with type, nullability, defaults, identity/generated settings
- primary keys, unique constraints, foreign keys, and delete/update behavior
- indexes
- RLS enabled/forced state
- RLS policies
- triggers
- functions and `SECURITY DEFINER` state
- enum values
- installed extensions
- realtime publications
- storage buckets and object counts

## Auth Users

This app relies heavily on `auth.uid()` and `user_id` columns. Preserve auth UUIDs.

Best case:

- Lovable exports auth users with `id`, `email`, metadata, and `password_hash`.
- Use `scripts/import_supabase_auth_users.mjs`.

Acceptable fallback:

- Lovable exports `id`, `email`, and metadata, but no password hash.
- Use `scripts/import_supabase_auth_users.mjs` to preserve IDs.
- Users reset passwords on first login.

Bad case:

- Lovable cannot export auth IDs.
- Stop. We need a user remap before importing dependent tables.

## Data Import Order

Use this order unless the inventory comparison shows a stricter dependency:

1. `auth.users` equivalent import or Supabase Admin API user creation.
2. `public.profiles`
3. `public.user_roles`
4. reference/catalog/product tables
5. customer/account identity tables
6. pricing/catalog assignment tables
7. order/cart/address/payment tables
8. helpdesk/contact inquiry tables
9. analytics/audit/log/event tables
10. integration/sync status tables

For CSV imports, keep row IDs and timestamps exactly as exported. Do not let Supabase generate new IDs unless a table has no external references.

## Validation Gates

Before pointing Vercel at Datamation:

```powershell
npm run build
npm run qa:edge-smoke
```

Then browser-test:

- login/password reset
- admin authorization
- public contact form and pricelist request
- customer portal pages
- product/media storage URLs
- `innovations-sync` version endpoint
- `/admin/settings/edge-functions`

## Scheduled Functions

`supabase/config.toml` only supports Edge Function deployment/runtime keys such
as `verify_jwt`, `import_map`, `entrypoint`, and `static_files`. It does not
deploy cron schedules. Recreate these schedules separately in Datamation
Supabase using Supabase Cron / `pg_cron`:

| Function | Schedule |
| --- | --- |
| `helpdesk-followup` | `*/15 * * * *` |
| `process-email-queue` | `*/10 * * * *` |

## Source References

- Supabase backup/restore docs: `supabase db dump` for roles, schema, and data-only dumps.
- Supabase auth migration docs: auth schema migration can preserve hashed passwords when the auth tables can be exported.
- Supabase CLI docs: use `SUPABASE_ACCESS_TOKEN` for non-interactive CLI commands in CI.
