# Deploy pushed backend changes, verify build, publish

## What's out of sync right now

- Three QuickBooks (QBO) migrations exist in the repo but have never been applied to the live database. The tables they create (`qbo_connections`, `qbo_command_queue`) do not exist yet:
  - `20260820193539_qbo_oauth_gateway.sql`
  - `20260821045024_qbo_command_queue.sql`
  - `20260821131231_qbo_gateway_rate_limit.sql`
- Edge functions in the repo have not been redeployed since the last pushes (36 function folders).
- The build log currently shows two real TypeScript errors that must be fixed before publishing:
  - `supabase/functions/companion-assistant/index.ts` — `match` is typed `unknown` in the citation regex loop.
  - `supabase/functions/_shared/microsoft/graphOneDrive.ts` — `SharedArrayBuffer` vs `ArrayBuffer` body type mismatch.
  - (The `@react-email/components` "not found in node_modules" entries are sandbox-only Deno resolution noise, not deploy blockers — they resolve normally on the Supabase runtime.)

## Steps

1. Apply the three QBO migrations, in order, as a single reviewed migration so the OAuth gateway, command queue and rate-limit tables/policies land with proper grants and row-level security.
2. Fix the two TypeScript errors above (narrow the regex match type; cast the upload body). No behaviour changes.
3. Redeploy every edge function from current repo source, and regenerate the MCP function bundle first so it deploys in sync.
4. Verify:
   - Build log is clean.
   - Spot-check live versions of the recently touched functions (`innovations-sync`, `portal-copilot`, `live-data-gateway`, `mcp`, `platform-health-check`) via their version/health endpoints.
   - Confirm the QBO tables now exist and the `/qbo/*` gateway route responds.
5. Run a security scan, report any critical findings, then publish the site.

## Notes

- No feature or UI changes are included; this is a sync-and-release pass only.
- If any migration fails on conflicting existing objects, it will be reworked to be idempotent rather than dropping live data.
