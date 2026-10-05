# Open branch review — 2026-10-05

Status: Complete — reviewed integration merged and frontend publication verified.

## Scope and integration

Reviewed local and origin branches against main. Smart Customer Journey is excluded. Branches with no remaining commits were left alone; no branches were deleted. The prepared branch is `codex/review-open-branches`, based on current main through `d5dc34d1`.

| Branch | PR / reviewed head | Integration result |
| --- | --- | --- |
| `rx-phase2-my-orders` | #608 / `d4ebfab7` | Statement functions/migrations already present through equivalent commits. Corrects statement-job types from OneDrive fields to private-storage fields. |
| `rx-draft-preview-formatting` | #609 / `0a3a789d` | Adds the direct Rx shipping-address migration and prior repair notes. STATUS conflict preserves both Atlas and shipping-address entries. |
| `lovable-sync` | #607 / `8e77f8bb` | Rx type additions already present; incoming snapshot omitted newer fields/RPCs. Preserved current integrated types. Ancestry only. |
| `fix-preexisting-test-failures` | `93d80b1b` | Normalizes CRLF in two migration-text read helpers; assertions preserved. |
| `rx-capture-server` | `98ec4c8e` | Code/migrations already present through equivalent commits. Preserved current function configuration, including notification settings. Ancestry only. |
| `admin-workspace-phase3-editor` | `62d86a9f` | Equivalent Atlas follow-up already present. Ancestry only. |

All non-excluded local/origin branch heads inspected are ancestors of the prepared integration. The direct Rx migration scopes address lookup to the authenticated user, preserves credit checks/shared-order delegation/cart restoration, and revokes anonymous execution. Prior hosted apply notes are historical evidence, not current hosted verification. No order was placed.

The final integration has no change to `supabase/functions/**` or `supabase/config.toml`. The main-push Edge workflow redeploys all functions and submits a real email smoke test when those paths change. Advancing main still triggers the linked production frontend publication and requires approval.

## Existing source findings requiring separate work

These findings already exist on main; the ancestry merges introduce none of them:

- **P1, Rx capture object ownership:** customer INSERT/UPDATE policies in `20261001160000_rx_capture_customer_access.sql` constrain row ownership but not `storage_path`, `extra_paths`, or `purge_after`. Extraction downloads the supplied path with service access; purge deletes supplied paths with service access. Validate object ownership and make extraction/retention fields server-owned before expanding customer capture use. No exploit or permission change was performed.
- **P2, extraction attempt accounting:** `rx-capture-extract` counts daily jobs rather than model attempts and lacks an atomic processing claim. Repeated/concurrent attempts need a durable claim and limit.
- **P2, statement migration upgrade order:** the rewritten original statement migration creates a storage-column index after `CREATE TABLE IF NOT EXISTS`; existing OneDrive schemas receive those columns only in the later conversion migration. Repair history compatibility before following the documented rollout order.
- The conversion migration drops OneDrive identifiers. Verify existing PDF recoverability before an approved destructive rollout. Review retention scheduler configuration before reuse outside its original environment.
- The Atlas defects from the preceding review remain unresolved; this integration does not modify Atlas behavior.

## Validation

- Node 22 / npm 10 runtime guard: passed.
- TypeScript: passed.
- Full lint: zero errors; existing warnings remain. Changed smoke script focused lint: passed.
- Full tests: 199 files / 1,316 tests passed, with coverage.
- Build: passed using fresh lockfile dependencies in an isolated local dependency directory. The primary checkout's old dependencies lacked newer font/editor packages.
- PR checks: passed after `copilot:facts`, `search:index`, and `release-ledger:sync` restored generated LF files; Git content did not change. The documented source-only documentation exception avoids representing pending publication as a released product update.
- Smoke: passed with exit zero after assertions were aligned to the modular admin router, canonical CRM paths and current controls. JSX whitespace no longer causes false failures. Windows cleanup terminates only the harness's spawned process tree; strict port binding prevents accidental checks against a leftover server.
- Local in-app browser: the built Atlas deep link rendered sign-in with its redirect preserved. No authentication or hosted data write was performed.
- Diff whitespace check: passed.

## Remaining action

The user approved the automatic production frontend publication. After refreshing remote main, integration commit `566077c5` was pushed without force. GitHub confirms PR #607/#608/#609 merged. PR Validation passed on Node 20 and Node 22, Lockfile Policy and Pages deployment passed, and both linked Vercel deployments reported success. The production sign-in page returned HTTP 200; authenticated workflows were not exercised. Migration applies, workers, permissions, orders, and email remain outside this source integration.
