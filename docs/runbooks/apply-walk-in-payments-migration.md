# Runbook — apply the customer-device walk-in payments migration

## Why this runbook exists

Migrations committed to git **are not executed against the live database** by any
workflow in this repository. `.github/workflows/edge-function-release.yml` deploys
edge functions only; there is no `supabase db push` anywhere in `.github/workflows/`.
A migration that was assumed to have been applied by a git push previously caused a
three-day store outage (see `docs/doc-studio-mail-merge-campaigns-plan.md` §10).

The symptom of skipping this step is:

> Could not find the function `public.publish_walk_in_payment(...)` in the schema cache

## Target database

Apply to the **live Lovable Cloud project**: `xstmeirxhfbiyayrrsob`.

Confirmed by `.env` (`VITE_SUPABASE_URL`), the `index.html` preconnect,
`.lovable/mcp/manifest.json` (auth issuer), and the hardcoded `projectRef` in
`supabase/functions/mcp/index.ts`.

> **Do not** apply to `dzsalnvmlvjoatryhqfz`, the ref in `supabase/config.toml`.
> That is the unfinished Datamation destination from
> `docs/lovable-cloud-to-supabase-migration-runbook.md`, not the live project.
> `config.toml` being stale also means the edge-function deploy workflow parses the
> wrong ref — tracked separately.

## Steps

1. **Apply the SQL.** Paste the entire contents of
   `supabase/migrations/20260917101500_customer_device_walk_in_payments.sql` into the
   Lovable/Supabase SQL editor for the project above, or apply it through the Lovable
   MCP (`apply_migration` / `query_database`).

   The file is safe to re-run: every statement is guarded (`IF NOT EXISTS`,
   `DROP CONSTRAINT/POLICY/TRIGGER IF EXISTS`, `CREATE OR REPLACE FUNCTION`,
   `ON CONFLICT DO NOTHING`). Verified by applying it twice in a row to a scratch
   PostgreSQL 16 instance.

2. **Verify** — this must return `5` RPCs, `2` new tables and `0` rows still on the
   old currency code:

   ```sql
   SELECT
     (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname IN (
         'publish_walk_in_payment','resolve_walk_in_payment_link',
         'create_self_serve_walk_in_payment','match_walk_in_payment',
         'record_public_payment_attempt')) AS rpcs_expect_5,
     (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'
       AND table_name IN ('walk_in_payment_settings','public_payment_attempts')) AS tables_expect_2,
     (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public'
       AND table_name = 'walk_in_payments' AND column_name = 'origin') AS origin_col_expect_1,
     (SELECT count(*) FROM public.walk_in_payments WHERE currency <> '052') AS stale_currency_expect_0;
   ```

3. **If the RPC still 404s**, the Data API is serving a cached schema. The migration
   ends with `NOTIFY pgrst, 'reload schema';`, but you can re-issue it alone:

   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

4. **Deploy the edge functions** `walkin-pay`, `scotia-payment` and `scotia-return`.
   `walkin-pay` is new, so the public `/pay` page cannot work until it exists.

   ```bash
   SUPABASE_ACCESS_TOKEN=<token> node scripts/deploy_supabase_functions.mjs \
     --project-ref xstmeirxhfbiyayrrsob \
     --only walkin-pay,scotia-payment,scotia-return
   ```

   Add `--dry-run` first to print the exact CLI calls without deploying.

5. **Run the edge smoke suite**, which `AGENTS.md` requires after *any* edge function
   deploy, including ones triggered outside the release workflow:

   ```bash
   npm run qa:edge-smoke
   ```

6. **Set the Turnstile secrets** or self-service stays fail-closed (by design):
   `TURNSTILE_SECRET_KEY` as a Supabase function secret, `VITE_TURNSTILE_SITE_KEY` in
   Vercel. The assisted claim-code and email-request flows work without them.

## Then test in the app

Settings → Walk-in Payments → enter an amount and name → **Publish link**. A
six-character code should appear with a QR code and a countdown. Scanning the QR (or
opening `/pay`) and entering the code should show the name and amount.

Use the Scotia **test** environment for the first end-to-end run: keep
`VITE_SCOTIA_ENV` unset or `test`, and pay with a Fiserv test card.
