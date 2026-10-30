# Automation Bug Reports

## 2026-10-30 — Workbook parity check (no defect)

New check, no bug fixed. Findings: the 2026 workbook rounds exact half-cent R&R amounts inconsistently (up in some months, down in others), and CV-02's R&R column holds a flat non-levy amount, so the check allows one cent on R&R and skips CV-02's R&R.

## 2026-10-29 — Salary importer (no defect)

New script, no bug fixed. Note: the importer's first run skipped every sheet because a text-value heuristic treated employee names as the next label; it now stops only on known label words.

Localhost gateway transport (2026-10-20): root causes were a port-specific hosted CORS allowlist and Node lacking the installed system CA by default. A loopback-restricted Vite proxy, verified upstream TLS and unchanged caller auth resolve the development path. Missing login still returns 401; the fix must not inject service-role credentials or widen hosted permissions.


## 2026-10-05 — Stale smoke assertions and Windows cleanup

- The harness checked admin routes in the old monolithic App file, superseded CRM paths and obsolete UI strings. Assertions now target current route ownership and controls while preserving route/guard checks.
- Killing npm alone on Windows left Vite holding output pipes open after a successful run. Cleanup now terminates the harness's own process tree. Strict port binding prevents validation against a leftover server.
- Verified with `npm run qa:smoke` (exit zero) and focused lint. Application routes, copy and permissions are unchanged.

## 2026-08-27
- Script(s): `scripts/generate_copilot_platform_facts.mjs`
- Impact: the Copilot gained CRM enrichment tools but its always-on context still listed only the read-only lookups, so it would not volunteer enrichment when an admin asked how to complete a contact's details.
- Root cause: the generator read tool names from `lookupTools.ts` and the router literals only.
- Resolution: read `enrichmentTools.ts` as well and advertise those names as a distinct writing capability.
- Follow-up actions: any new tool module must be added to the generator, or it stays invisible to the model until it is explicitly called.

## 2026-08-27
- Script(s): `scripts/generate_copilot_platform_facts.mjs`
- Impact: the Copilot grounding context was maintained by hand and could drift from the app it describes; only module titles were guarded, and nothing checked routes, capabilities or page-context slugs.
- Root cause: `systemContext.ts` was a manual mirror of `apps.ts` with no generator and no capability data.
- Resolution: generate the context, the route table and the capability index from the code that defines them, and gate the committed artifact with `npm run qa:copilot-facts` inside `qa:pr-checks`.
- Follow-up actions: keep the generator slug transform identical to `buildContextOptions()` in `src/lib/adminContexts.ts`; an integration test fails if they diverge.

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

Atlas sharing SQL regression (local only): scripts/test_atlas_sharing_sql.mjs executes the actual migration in isolated PostgreSQL WASM (PGlite 0.5.8) with minimal auth/table/policy fixtures. Install PGlite separately and set ATLAS_SQL_TEST_MODULE_PATH to its directory package.json for module resolution; then run node scripts/test_atlas_sharing_sql.mjs. No hosted connector or data write is involved. Focused frontend command: npx.cmd vitest run --coverage=false src/tests/unit/atlas src/tests/integration/atlasRouteAccessibility.integration.test.ts. See docs/agent/HANDOFF.md for release gates and verification limits.

PBX agent (2026-10-24, local source): unconfirmed on a real PBX — dialplan context/prefix, recording file-name format and on-demand recording behaviour for Local channels. Recordings that do not match are stored unlinked, not lost.

2026-10-28 QA maintenance: retain the legacy admin lens-assistant URL as a redirect to Rx Rules; the smoke harness now checks the current Forgot password button text. Route/source contract tests follow the current explicit aliases and live-data field projections, while launcher pins now forward context-menu trigger props and are found by their disambiguated accessible link names. Validation remains enabled; no gates were removed.

PBX call panel (2026-10-30, local source): the agent's channel matching assumes one `PJSIP/<ext>-` channel per staff phone during a website call and that the `channel originate PJSIP/<ext>` target is right for every staff phone (a follow-me or mobile-only extension would not ring). Unconfirmed on the real PBX.
