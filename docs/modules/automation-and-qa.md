# Automation and QA Module Docs

## 2026-08-13 — Windows admin smoke process launch

- `scripts/admin_smoke_and_error_checks.mjs` starts npm through the active Node executable and `npm_execpath` when available, avoiding Windows `spawn npm ENOENT` and `.cmd` `EINVAL` failures.
- The smoke route matrix includes `/admin/copilot`, so a production preview must return the admin shell for the new route before source assertions run.

## 2026-08-12 — MCP deployment artifact generation

- `scripts/generate_mcp_function.mjs` bundles `src/lib/mcp/index.ts` into the portable `supabase/functions/mcp/index.ts` artifact for the explicit `SUPABASE_PROJECT_REF` target.
- Run `SUPABASE_PROJECT_REF=<target> npm run mcp:generate` before a manual MCP deployment. The normal Vite build and Vitest configuration intentionally do not generate this file.
- `scripts/deploy_supabase_functions.mjs` and the edge-function GitHub workflow generate the artifact immediately before deploying MCP, preventing a local test run from producing an unusable filesystem import.

## Purpose
This module covers repository automation scripts in `scripts/**`, including PR checks and quality gates.

## Documentation update requirements
When changing automation behavior, update:
- `CHANGELOG.md`
- `docs/release-notes.md`
- `docs/help/dev-workflow-help.md`
- `docs/bugs/automation-bug-reports.md`

## Guard reference
- `scripts/check_doc_symmetry.mjs`
- `docs/ai/module-doc-index.json`

## 2026-07-13 — Product-cost RLS migration audit

- `npm run security:product-cost-rls-audit` scans migrations added after `20260713150000_product_cost_rpc_access_and_audit.sql` and fails on direct `SELECT` grants for `anon`/`authenticated` or SELECT policies that do not require `has_edit_role()` on `addons`, `lenses`, or `supplies`.
- The command is part of `npm run qa:pr-checks`, which is required by the PR validation workflow.
- With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set, it also invokes the live `audit_product_cost_rls()` database RPC; it must return no rows.

## 2026-05-27 — npm lockfile and Vercel header sync checks

- `scripts/check_lockfiles.mjs` enforces the npm-only repository contract by requiring `package-lock.json` and rejecting both `bun.lock` and `bun.lockb`.
- `scripts/sync_vercel_security_headers.mjs --check` validates that `vercel.json` edge headers match `security/http-header-policy.json`.
- `npm run qa:pr-checks` now includes the Vercel header sync check so deployment config drift is caught before merge.
- To intentionally refresh Vercel headers after editing the security policy, run `node scripts/sync_vercel_security_headers.mjs`, review `vercel.json`, then run `npm run qa:vercel-headers`.

## 2026-04-13 — Wiki build-version validator Windows path fix

- `scripts/validate_wiki_build_versions.mjs` must resolve its own script directory through `fileURLToPath(import.meta.url)` rather than `new URL(import.meta.url).pathname`.
- On Windows, using `.pathname` can duplicate the drive prefix and produce invalid paths such as `C:\C:\...`, which breaks `qa:wiki-build-version`.
- Expected behavior: `npm run qa:pr-checks` should validate wiki build metadata successfully on Windows and POSIX environments without path normalization workarounds.
