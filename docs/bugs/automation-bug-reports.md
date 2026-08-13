# Automation Bug Reports

## 2026-08-13
- Script(s): `scripts/admin_smoke_and_error_checks.mjs`
- Impact: the admin smoke gate could fail before starting Vite on Windows with `spawn npm ENOENT`, or with `EINVAL` when attempting to spawn `npm.cmd` directly.
- Root cause: the script assumed npm was a directly spawnable executable instead of using the npm CLI associated with the active Node installation.
- Resolution: launch `npm_execpath` with `process.execPath` when available and retain `npm` as the portable fallback; include `/admin/copilot` in the route matrix.
- Follow-up actions: run the smoke gate under the repository-supported Node version and distinguish route failures from existing source-assertion drift.

## 2026-08-12
- Script(s): Vite/Vitest MCP plugin lifecycle
- Impact: test or build execution could overwrite `supabase/functions/mcp/index.ts` with a `npm:C:\...` import that cannot run in Supabase.
- Root cause: Vite registered the MCP code generator for every config load, including Vitest on Windows.
- Resolution: removed generator side effects from Vite and added an explicit portable generator invoked only by MCP deployment paths.
- Follow-up actions: confirm the artifact hash is unchanged after focused tests and run `npm run mcp:generate` for the intended deploy project.

Track issues and exceptions related to QA automation and PR checks.

## Entry format
- Date (UTC)
- Script(s)
- Impact
- Root cause
- Resolution
- Follow-up actions

## 2026-07-13
- Script(s): `scripts/audit_product_cost_rls.mjs`, `scripts/pr_checks.mjs`
- Impact: a later migration could re-grant direct reads on `addons`, `lenses`, or `supplies`, exposing cost-bearing columns despite earlier RLS hardening.
- Root cause: the existing PR checks did not inspect subsequent database grants and SELECT policies after the original hardening migration.
- Resolution: added a migration-bound policy audit to every PR check plus an optional service-role live-database audit RPC.
- Follow-up actions: run `npm run security:product-cost-rls-audit` with service-role credentials before applying database-security migrations to a shared environment.

## 2026-05-27
- Script(s): `scripts/check_lockfiles.mjs`, `scripts/pr_checks.mjs`, `scripts/sync_vercel_security_headers.mjs`
- Impact: stale Bun lockfiles and unsynchronized Vercel edge headers could pass local QA despite violating the npm-only and security-policy contracts.
- Root cause: lockfile validation only rejected `bun.lockb`, and Vercel header generation was not part of the PR check pipeline.
- Resolution: reject both Bun lockfile formats, add a Vercel security-header sync script, and include the sync check in `npm run qa:pr-checks`.
- Follow-up actions: run `npm run qa:pr-checks` after changing automation scripts or security header policy.

## 2026-04-13
- Script(s): `scripts/validate_wiki_build_versions.mjs`
- Impact: `npm run qa:pr-checks` failed during `qa:wiki-build-version` on Windows before it could validate wiki article metadata.
- Root cause: the script built `wikiContent.ts` from `new URL(import.meta.url).pathname`, which duplicated the drive prefix on Windows and produced an invalid file path.
- Resolution: switched the script to `fileURLToPath(import.meta.url)` before joining the repo-relative path.
- Follow-up actions: keep path resolution for Node ESM scripts Windows-safe and rerun `npm run qa:pr-checks` after any validator changes.
