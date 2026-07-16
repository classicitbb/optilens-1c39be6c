# Lovable Cloud to Managed Supabase Migration Runbook

This runbook moves backend ownership from Lovable Cloud to the managed Supabase project we control, while keeping Lovable available for editing/AI workflows.

## Facts that shape the plan

- Source backend: Lovable Cloud. Lovable owns the underlying Supabase instance.
- Destination backend: Datamation Supabase project, ref `dzsalnvmlvjoatryhqfz`.
- Frontend hosting: Vercel.
- Lovable remains connected for editing/AI; database management moves to the external Supabase project.
- Source exports from Lovable Cloud are limited. Lovable's own guidance treats schema as migrations, table data as CSV export/import, storage files as manual download/upload, and auth users as manual/partial because passwords cannot be exported unless a privileged export exposes password hashes.

## Cutover rules

- Do not delete or unpublish Lovable during migration.
- Freeze writes during final export/import. At minimum, disable public form submit and admin write workflows or schedule a short maintenance window.
- Preserve auth user UUIDs whenever possible. This app uses `auth.uid()` and many `user_id` columns, so changing auth IDs requires a deliberate remap of all user-owned rows.
- Import schema before table data.
- Import auth users before tables with foreign keys to `auth.users(id)` such as `profiles`, `user_roles`, orders, cart data, customer addresses, and payment methods.
- Deploy Edge Functions after schema and secrets exist.
- Point Vercel to the new Supabase URL/key only after backend smoke tests pass.

## Destination setup

1. In Supabase Dashboard for the Datamation project, capture:
   - Project ref: `dzsalnvmlvjoatryhqfz`
   - Project URL
   - Publishable/anon key
   - Secret/service-role key
2. Update local config when ready:
   - `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
   - `supabase/config.toml`: `project_id`
3. Link the local checkout:

```bash
npx supabase login
npx supabase link --project-ref dzsalnvmlvjoatryhqfz
```

## Schema migration

Preferred path from this repo:

```bash
npx supabase db push --project-ref dzsalnvmlvjoatryhqfz
```

If Lovable has migrations not present in this checkout, export or copy them from Lovable first and add them under `supabase/migrations/` in timestamp order. Then rerun `db push`.

After schema push:

```bash
npx supabase db diff --linked
```

The diff should be empty or explainable before data import.

## Auth users

There are two possible paths.

### Path A: preserve users with IDs and password hashes

Use this only if Lovable export gives `id`, `email`, and `password_hash`.

```bash
$env:SUPABASE_URL="https://dzsalnvmlvjoatryhqfz.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<secret-or-service-role-key>"
node scripts/import_supabase_auth_users.mjs --file exports/auth-users.csv --out tmp/auth-user-id-map.csv
```

Expected CSV columns:

```csv
id,email,phone,raw_user_meta_data,raw_app_meta_data,password_hash,email_confirmed_at,phone_confirmed_at
```

### Path B: preserve IDs, require password reset

Use this if Lovable only exports user IDs and emails. The script creates confirmed users with the old IDs, but without passwords. Users must set a password through the reset/invite flow.

```bash
$env:SUPABASE_URL="https://dzsalnvmlvjoatryhqfz.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<secret-or-service-role-key>"
node scripts/import_supabase_auth_users.mjs --file exports/auth-users.csv --out tmp/auth-user-id-map.csv
```

If IDs cannot be preserved, stop and build a remap plan before importing app data. At minimum, every exported table containing `user_id`, `created_by`, `assigned_to`, or other auth UUID references must be rewritten from old ID to new ID before import.

## Table data

Lovable's documented path is table-by-table CSV export:

1. In Lovable Cloud, export each table from Cloud -> Database -> Table -> Export CSV.
2. Import into the matching table in Supabase Table Editor, or use Postgres `COPY`/SQL once CSVs are normalized.
3. Import in dependency order:
   - Auth users first.
   - Parent/reference tables next.
   - User-owned child tables after their parent users/profiles exist.
   - Audit/log/event tables last.

For a safer large migration, place CSVs under a local ignored export folder such as `tmp/lovable-export/` and use staging tables or a one-off SQL import script. Do not commit exported customer data.

## Storage migration

1. In Lovable Cloud, download each bucket's files.
2. In the Datamation Supabase project, create matching buckets and policies.
3. Upload files preserving bucket names and object paths.
4. Verify public/private URL behavior for product media, email assets, documents, and any portal downloads.

## Edge Function deployment

Set secrets first in Supabase Dashboard or CLI. Then deploy from source:

```bash
$env:SUPABASE_ACCESS_TOKEN="<supabase-access-token>"
$env:SUPABASE_PROJECT_REF="dzsalnvmlvjoatryhqfz"
npm run supabase:functions:deploy
```

Dry run:

```bash
npm run supabase:functions:deploy:dry
```

Deploy a subset:

```bash
node scripts/deploy_supabase_functions.mjs --project-ref dzsalnvmlvjoatryhqfz --only contact-inquiry,innovations-sync
```

GitHub automation already exists in `.github/workflows/edge-function-release.yml`. Configure these repository secrets for the Datamation project:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Frontend cutover

In Vercel, update production environment variables:

- `VITE_SUPABASE_URL=https://dzsalnvmlvjoatryhqfz.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>`
- `VITE_SUPABASE_PROJECT_ID=dzsalnvmlvjoatryhqfz`

Then redeploy Vercel.

Update Supabase Auth settings:

- Site URL: production Vercel/custom domain URL.
- Redirect URLs: production URL, admin URL if separate, Lovable preview/editor URLs if still needed, localhost test URLs.
- OAuth providers: reconfigure Google or other providers against the new Supabase project.

## Smoke tests before cutover

Run:

```bash
npm run build
npm run qa:edge-smoke
```

Browser-check:

- Public contact form creates a helpdesk ticket and sends the expected emails.
- Login works for a migrated user after password reset/invite.
- Admin login still has expected role from `user_roles`.
- Portal pages read customer-scoped data only.
- Storage-backed media/documents load.
- `innovations-sync` version endpoint responds.
- `/admin/settings/edge-functions` shows the deployed functions as healthy after health storage migration exists.

## Rollback

Rollback is DNS/env based:

1. Repoint Vercel env vars to the Lovable Cloud Supabase values.
2. Redeploy Vercel.
3. Keep Lovable Cloud untouched until the Datamation backend has passed one full business cycle.
