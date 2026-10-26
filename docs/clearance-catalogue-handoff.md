# Clearance handoff
Status: Incomplete — final publication approval and live verification pending.

Current state: website and office code prepared on scoped local branches. Source/sale
rules, equal-column grids, host theme tokens, unlisted capability link and persistent
admin family suppression are implemented. No production deployment, migration, token
provisioning, visibility write, external publish or scheduled task installation occurred.

Affected website paths: src/features/clearance/, src/routes/clearance/, src/App.tsx,
src/routes/admin/AdminRoutes.tsx, src/config/routeRegistry.ts, the clearance unit tests,
supabase/functions/clearance-catalogue/, supabase/config.toml and migration
20261026192422_private_clearance_catalogue.sql; release/module/help/bug docs and STATUS.md.
The separate office worktree has the source review, publisher, exporter, tests and installer.

Tests: 12 focused website tests passed, including admin hide/restore and authorization.
Website lint completed with zero errors (existing warnings). Routing smoke passed.
The initial full run had 1708 passing tests and 8 suites failing to import the already-declared
read-excel-file/browser dependency. A normal no-save npm repair failed with
Cannot read properties of null (reading 'edgesOut'). The locked package was then restored
through an isolated npm install without changing package.json or package-lock.json.
Final production build, application TypeScript and Deno Edge Function checks pass. Scoped lint passes with zero warnings. PR-policy checks and routing smoke pass. The 12 catalogue/admin tests and all eight formerly import-blocked suites pass together (42 tests across 9 suites). No package manifest or npm lockfile changes were made.
Office full suite passed (629/629); focused inventory tests also passed (111/111). Browser review uses extracted real data;
website receiver/admin tests use mocks and do not prove live access.

Remaining gate: explicit production publication, new migration/function and source-to-website
snapshot write, host-local private-link/key configuration and daily schedule approval.
No unrelated source-system, auth-account or credential changes are included.
Next executable action: npm run build, then npm run qa:pr-checks from the website checkout
after review; follow the documented publication sequence only once explicitly authorized.
