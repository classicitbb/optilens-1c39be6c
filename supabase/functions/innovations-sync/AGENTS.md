# AGENTS.md — innovations-sync

Guardrails for anyone (human or agent) touching this function, its migration,
or its office-side caller (`optilens-local/lib/innovations-sync.js`). Read this
before adding an entity, changing auth, or redeploying.

## What this is

The only one-way sync from the office ERP (Innovations, reached via
`optilens-local`) into this website's database. It has been running an hourly
scheduled push for customers/contacts/balances/statements/order_activity/
lens_aliases/supplies for months, unattended. Full contract:
`docs/integration-innovations-sync-contract.md`. Full history of the
Supplies entity specifically: `docs/ERP_ITEM_SYNC_PLAN.md`.

## The rule that must never break: no Authorization header required

**The office caller sends only `x-api-key` and `content-type`. It never sends
an `Authorization` or `apikey` header, and it cannot easily be made to** — it's
an unattended scheduled task on office hardware, not a browser session with a
Supabase session token.

This means:
- `supabase/config.toml` must keep `verify_jwt = false` for this function.
- The **project's edge-function gateway** must also allow requests through with
  zero Authorization header. `verify_jwt = false` in config.toml is necessary
  but **not sufficient** — a project-level or dashboard-level gateway setting
  can independently enforce "some Authorization header required" ahead of your
  function code, and this can drift out of sync with config.toml.

### Incident record (2026-08-03)

A manual redeploy triggered through the Lovable chat/dashboard (not a `git
push`) left the gateway requiring an Authorization header. Every entity's
sync — not just the one being added — started failing with
`{"code":"UNAUTHORIZED_NO_AUTH_HEADER"}` before the function's own
`verify_api_key` logic ever ran. It was caught by manually curling the live
endpoint immediately after the deploy, not by an automated gate at deploy
time, because **the Lovable chat/dashboard redeploy path does not go through
this repo's git-push CI** (see below). Do not assume "the deploy tool said it
succeeded" means the gateway config is still correct — verify directly.

## Mandatory after ANY redeploy of this function

Run this, or have it run, immediately after every redeploy — whether
triggered by `git push` (which fires `.github/workflows/edge-function-release.yml`
automatically) or by a manual Lovable chat/dashboard action (which does
**not** go through that workflow at all):

```bash
npm run qa:edge-smoke
```

This asserts, among other things, that a bogus `x-api-key` with **no**
Authorization header reaches this function's own auth check (a
`{"error":"..."}` body) rather than being rejected by the platform gateway
first (a `{"code":"UNAUTHORIZED_NO_AUTH_HEADER",...}` body) — see the
`innovations-sync auth contract` probe in `scripts/edge_functions_smoke.mjs`.
If you can't run the npm script, the minimum manual check is:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/innovations-sync/customers" \
  -H "x-api-key: bogus" -H "content-type: application/json" -d '{"dry_run":true,"records":[]}'
# Must return {"error":"Invalid or revoked API key."} — NOT a gateway-shaped 401.
```

There is also a 5-minute continuous-health-monitor cron in the same workflow
that runs this same smoke suite regardless of how the function was deployed —
but don't rely on that as your only signal; verify immediately, don't wait.

## Adding a new entity — checklist

Every entity follows the same shape (`ENTITIES` config in `index.ts`, mirrored
by an `ENTITIES` entry in `optilens-local/lib/innovations-sync.js`). To add one:

1. Add the column(s) + a **plain (non-partial) unique index** on the new
   `innovations_<x>_id` to the target table via a migration. A partial
   (`WHERE ... IS NOT NULL`) index will NOT work as an `ON CONFLICT` arbiter —
   this has bitten this system before (see
   `20260630160000_innovations_sync_fix_unique_indexes.sql`).
2. Widen the `innovations_sync_runs_entity_check` CHECK constraint to include
   the new entity name. **This is easy to forget** — `order_activity` and
   `lens_aliases` both shipped without it and had their run-log inserts
   silently failing for a while before it was caught. Grep the constraint
   definition before assuming it's already permissive.
3. Add the `EntityConfig` entry in `index.ts`'s `ENTITIES` map: `table`,
   `conflictKey`, `required`, `scope`, `allow` (an explicit column allowlist —
   never let the office push arbitrary columns).
4. If the new scope isn't a reuse of an existing one, add it to `ALL_SCOPES` in
   `src/pages/admin/settings/ApiKeysPage.tsx` and mint/update the key
   optilens-local uses.
5. On the office side, add the matching `sql`/`map` (or `read`) entry and add
   the entity name to `ENTITY_ORDER`. If the entity reads a table the Zen-fed
   mirror doesn't carry (stock tables — see `lib/db.js`'s comment on
   `getLiveSourcePool`), set `usesLivePool: true` on the entity definition so
   `readEntity()` forces the live connection regardless of the active
   `source_backend` switch.
6. Dry-run first (`commit:false`), review the mapped sample, **then** commit.
   Never ship a new entity straight to `commit:true`.
7. Run the mandatory post-deploy check above.

## Don't guess ERP field semantics from source code alone

The ERP (Innovations) encodes most of its checkboxes as bits in a single
`Flags` integer column, not separate boolean columns, and **the same bit
number means different things on different tables** — a convention borrowed
from one table's `Flags` usage does not transfer to another's. When adding a
new entity that filters on one of these flags, confirm the bit against a real,
known example from the live data (ideally two: one where the flag is known ON,
one where it's known OFF) before writing the filter — don't assume a bit
number based on what a comment elsewhere in the codebase says it means for a
different table. See `docs/ERP_ITEM_SYNC_PLAN.md` §7 for a worked example of
getting this wrong once (borrowed `Flags & 2` for "Inactive", which was
actually a different table's convention) and fixing it with a real
counter-example.

## Price data: don't assume a column is real without checking it

Not every ERP-looking column is populated. `MiscItems.Price` looks like the
obvious sell price and is *always 0* in practice — real prices resolve
through a separate multi-pricelist system with no single canonical value per
item. Before wiring an ERP field into a payload, spot-check its actual values
across a meaningful sample, not just one row.
