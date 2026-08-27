# Developer Workflow Help

## Copilot platform facts

`supabase/functions/_shared/copilot/platformFacts.generated.ts` is generated — never edit it by hand. After changing admin routes in `src/features/admin/core/config/apps.ts`, the resource registry in `adminResources.ts`, or the hand-maintained `platformFacts.source.ts`, regenerate it with `npm run copilot:facts` and commit the result. `npm run qa:pr-checks` fails if the committed file is stale.

## Windows admin smoke check

Run `npm run qa:smoke` from the supported Node/npm toolchain. The script now launches the preview through the active npm CLI on Windows and checks `/admin/copilot` with the other admin routes before running source assertions.

## PR quality guardrails
Run the PR checks locally before opening a pull request:

```bash
npm run qa:pr-checks
```

This includes lockfile policy, documentation symmetry, release-ledger drift, Vercel security-header sync, and wiki build-version validation.

## Product-cost RLS audit

Run the migration and optional live-database policy audit with:

```bash
npm run security:product-cost-rls-audit
```

The migration audit always runs. To include the live database check, provide both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; the service-role RPC must return no violations.

## Lockfile policy

- This repository standardizes on npm.
- Keep `package-lock.json`.
- Do not commit `bun.lock` or `bun.lockb`; `npm run qa:lockfiles` fails when either Bun lockfile exists.

## Vercel header sync

- Run `npm run qa:vercel-headers` to confirm `vercel.json` matches `security/http-header-policy.json`.
- After changing the security header policy, run `node scripts/sync_vercel_security_headers.mjs` to regenerate the Vercel header block.

## Doc symmetry guard
The doc symmetry guard validates mapped documentation changes for code updates.

### Allowed override
Use only for exceptional cases with mandatory rationale:
- Add a changed file under `docs/bugs/` with filename containing `doc-symmetry-exception` and include:
  - `Doc-Symmetry-Override: true`
  - `Rationale: <required explanation>`
- Or set PR label `docs-exception` and include `Doc-Symmetry-Rationale: ...` in PR body metadata.

## Wiki build-version validator

- The wiki build-version validation step runs inside `npm run qa:pr-checks` via `npm run qa:wiki-build-version`.
- On Windows, the validator must derive its local path from `fileURLToPath(import.meta.url)`; if you see a path like `C:\C:\...`, the script is using URL pathname semantics incorrectly.
- When this check fails, inspect `scripts/validate_wiki_build_versions.mjs` first, then verify `src/data/wikiContent.ts` still contains valid `Build version` metadata for non-draft wiki articles.

## Editing ERP-synced CRM fields (silent no-op guard)

Direct SQL writes to protected CRM fields on `customers` and `contacts` **silently do nothing** when run from an admin connection such as Lovable MCP `query_database`. The statement reports success and `RETURNING` hands back the *old* value, so the failure is invisible unless you re-read the row.

Protected fields (preserved on both tables): `name`, `email`, `phone`, `notes`, plus `account_number`, `address`, `country_code`, `pay_by_card`, `pay_by_eft`, `eft_institution_name`, `default_payment_type` on `customers`, and `business_name`, `street`, `street2`, `city`, `state`, `zip`, `country`, `is_company`, `status`, `pipeline_stage`, `type` on `contacts`.

### Why it happens

`preserve_populated_crm_fields_on_innovations_sync()` (see `supabase/migrations/20260721190000_fix_shared_crm_sync_trigger_cross_table_field_access.sql`) exists to stop the Innovations sync from overwriting values curated in the CRM. It opens with:

```sql
IF auth.role() <> 'service_role' THEN RETURN NEW; END IF;
```

On an admin connection `current_user` is `postgres` and `auth.role()` returns **NULL**, so the comparison evaluates to NULL rather than true. The early return never fires, execution falls through into the preserve block, and `NEW.pay_by_card := COALESCE(OLD.pay_by_card, NEW.pay_by_card)` pins every already-populated field to its existing value.

Only rows carrying `innovations_customer_id` / `innovations_contact_id` are affected — i.e. anything mirrored from the ERP, which is most real accounts. Rows created directly in the CRM update normally.

### How to make the write land

Set the JWT role claim for the duration of the transaction so the guard's early return fires:

```sql
begin;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
update customers set pay_by_card = true where id = 776;
commit;
```

Then confirm with a **separate** `SELECT` after the commit. The `UPDATE`'s own `RETURNING` clause is not proof — it reports the trigger-rewritten row.

Do not disable the trigger to force a write. If an Innovations sync runs while it is off, curated CRM values are overwritten wholesale from the ERP.

Application code is unaffected: authenticated admin/staff sessions carry a real role claim, so the Contacts and Customers screens write normally. This only bites out-of-band SQL.
