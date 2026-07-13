# Innovations → Classic Visions Sync — Runbook (v1)

Operator guide for the outbound push that mirrors selected Innovations MS SQL
data into the CV cloud. See `integration-innovations-sync-contract.md` for the
full contract.

## Integration context card

| Field | Value |
| ----- | ----- |
| Provider | `innovations` (on-prem MS SQL, `Innovations` on `MSSQL-SVR`) |
| Purpose | Mirror customers, contacts, balances, posted statements, and statement lines into CV cloud for the Customer Journey Hub |
| Direction | Outbound push, office → cloud (office DB never exposed inbound) |
| Auth | `x-api-key: cv_live_…`; scopes `customers:write`, `contacts:write`, `balances:write`, `statements:write`, and `gateway:agent`, verified by `verify_api_key` |
| Office env var | `OPTILENS_SYNC_TOKEN` (vault token, for unattended runs) |
| CV tables written | `customers`, `contacts`, `customer_balances`, `statements`, `statement_lines` (upsert by Innovations identifiers) |
| Observability | `innovations_sync_runs`, `innovations_sync_dead_letters` |
| Fallback | On cloud outage the office logs + retries next run; office DB unaffected (read-only) |
| Human approval | Dry-run reviewed before first commit; key minted by an admin |

## One-time setup

**CV cloud**
1. Apply `supabase/migrations/20260630120000_innovations_sync_v1.sql` and
   `supabase/migrations/20260711090000_portal_statement_and_rx_status.sql`,
   then `supabase/migrations/20260711110000_mssql_gateway_orders_and_account_guard.sql`
   (external-id columns, observability tables, statement fields, MSSQL-backed
   order gateway operation, and customer account-number duplicate guard).
2. Deploy both edge functions: `supabase functions deploy innovations-sync` and
   `supabase functions deploy live-data-gateway`.
3. Mint an API key: **Settings → API Keys**, tick **`customers:write`** and
   **`contacts:write`**, **`balances:write`**, **`statements:write`**, and
   **`gateway:agent`**. Copy the `cv_live_…` value (shown once).

**OptiLens Local (office)**
4. Unlock the vault, then save the key under the CV API connector
   (`/api/connectors/cvapi/config` — same place the catalog pull uses).
5. Confirm the local Innovations/MSSQL connection is configured and reachable.
   No InnovaAPI connector or bearer token is required for portal orders.
6. Restart the local app/gateway worker, then confirm its status advertises
   `innovations.customer_orders`.
7. Dry-run from the admin action or CLI (below) and review the sample/counts.
8. When the sample looks right, commit, then install the scheduled task.

## Running it

The token below is obtained by unlocking the vault with your passphrase
(`POST /api/connectors/unlock { "passphrase": "..." }` returns a 30-min token).

**On-demand (manual, session + vault gated)**
```
POST /api/connectors/innovations-sync/run
{ "token": "<vault-token>", "commit": false }        # dry-run (default)
{ "token": "<vault-token>", "commit": true,
  "entities": ["customers","contacts","balances","statements","statement_lines"],
  "suppress_email": true }                                # initial/backfill write
```

**Unattended (scheduled)** — the CLI is a separate process, so it takes the
vault **passphrase** and unlocks itself (a server-minted token won't work here):
```
# preview
node scripts/innovations-sync-cli.js --dry-run --passphrase "<vault passphrase>"
# write
node scripts/innovations-sync-cli.js --passphrase "<vault passphrase>"
# install hourly task (set OPTILENS_SYNC_PASSPHRASE at Machine scope first)
powershell -File scripts/install-innovations-sync-task.ps1 -IntervalMinutes 60
```

**Cloud "Sync now" button** (admin → `/admin/settings/integrations`)
The cloud cannot call the office directly, so the button **queues** a request in
`innovations_sync_requests`. The office picks it up via:
```
# install a frequent request-poller task (e.g. every 3 min)
powershell -File scripts/install-innovations-sync-task.ps1 -ServeRequests -IntervalMinutes 3
# or process the queue once, on demand:
POST /api/connectors/innovations-sync/check-requests { "token": "<vault-token>" }
```
The office claims the request (`GET _requests/next`), runs the write, and reports
back (`POST _requests/complete`); the card shows pending → done.

## Verifying / monitoring
- `select * from innovations_sync_runs order by started_at desc limit 20;`
  — received / upserted / failed per run.
- `select * from innovations_sync_dead_letters where status='pending';`
  — records that failed upsert, with the source payload for replay.
- CV row counts: `select count(*) from customers where innovations_customer_id is not null;`
- Account-number duplicates: `select * from customer_account_number_duplicates;`
  — must be empty before the normalized unique index can be created.
- Office run history: `GET /api/connectors/innovations-sync/logs` (requires the
  local `integrations.read` permission). It records timestamps, entity counts,
  and sanitised failures only—never the API key or source payloads. The active
  log is `data/logs/innovations-sync.jsonl` and rotates at 5 MB.
- The two installer commands intentionally create different tasks by default:
  **OptiLens Innovations Sync** (hourly full push) and **OptiLens Innovations
  Sync Requests** (three-minute cloud request poller). Confirm both exist in
  Task Scheduler; installing the poller must not replace the full push.

## Troubleshooting

| Symptom | Cause / fix |
| ------- | ----------- |
| `401 Missing/invalid x-api-key` | Key not saved in vault, or wrong value. Re-save under CV API connector. |
| `403 Missing required scope` | Key lacks the required entity scope. Mint a key with `customers:write`, `contacts:write`, and `statements:write`. |
| `404 Unknown entity` | Check the entity name against the sync contract and confirm the current `innovations-sync` Edge Function is deployed. |
| Cloud “Sync now” stays pending | Confirm the request-poller task is installed and the office log contains `queue.request.claimed` followed by `queue.request.finished`. |
| `422` / `failed` status | Upsert errors — inspect `innovations_sync_dead_letters.last_error`. |
| `Invalid column name` in office logs | The `contacts` SQL uses assumed `dbo.Contacts` columns. Adjust `ENTITIES.contacts.sql` / `.map` in `lib/innovations-sync.js` to the real columns, re-run dry-run. |
| Duplicate rows | Should not happen (unique index on `innovations_*_id`). If seen, confirm the migration's unique indexes were applied. |

## Notes
- The first historical statement sync must set `suppress_email: true`; this
  prevents old posted statements from triggering customer emails.
- Statement lines exclude `HideFromStatement = 1` and rows whose parent
  statement is void. The portal receives financial display fields only, not a
  full AR ledger or payment instrument data.
- Re-runs are safe: every entity upserts on an immutable Innovations id.
