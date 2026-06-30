# Innovations → Classic Visions Sync — Runbook (v1)

Operator guide for the outbound push that mirrors selected Innovations MS SQL
data into the CV cloud. See `integration-innovations-sync-contract.md` for the
full contract.

## Integration context card

| Field | Value |
| ----- | ----- |
| Provider | `innovations` (on-prem MS SQL, `Innovations` on `MSSQL-SVR`) |
| Purpose | Mirror customers + contacts (later: balances, invoices, statements) into CV cloud for the Customer Journey Hub |
| Direction | Outbound push, office → cloud (office DB never exposed inbound) |
| Auth | `x-api-key: cv_live_…`; scopes `customers:write` + `contacts:write`, verified by `verify_api_key` |
| Office env var | `OPTILENS_SYNC_TOKEN` (vault token, for unattended runs) |
| CV tables written | `customers`, `contacts` (upsert by `innovations_customer_id` / `innovations_contact_id`) |
| Observability | `innovations_sync_runs`, `innovations_sync_dead_letters` |
| Fallback | On cloud outage the office logs + retries next run; office DB unaffected (read-only) |
| Human approval | Dry-run reviewed before first commit; key minted by an admin |

## One-time setup

**CV cloud**
1. Apply migration `supabase/migrations/20260630120000_innovations_sync_v1.sql`
   (adds external-id columns, observability tables, `innovations` provider).
2. Deploy the edge function: `supabase functions deploy innovations-sync`.
3. Mint an API key: **Settings → API Keys**, tick **`customers:write`** and
   **`contacts:write`** (both already on that screen). Copy the `cv_live_…`
   value (shown once).

**OptiLens Local (office)**
4. Unlock the vault, then save the key under the CV API connector
   (`/api/connectors/cvapi/config` — same place the catalog pull uses).
5. Dry-run from the admin action or CLI (below) and review the sample/counts.
6. When the sample looks right, commit, then install the scheduled task.

## Running it

**On-demand (manual, session + vault gated)**
```
POST /api/connectors/innovations-sync/run
{ "token": "<vault-token>", "commit": false }        # dry-run (default)
{ "token": "<vault-token>", "commit": true,
  "entities": ["customers","contacts"] }              # write
```

**Unattended (scheduled)**
```
# preview
node scripts/innovations-sync-cli.js --dry-run --token <token>
# write
node scripts/innovations-sync-cli.js --token <token>
# install hourly task (set OPTILENS_SYNC_TOKEN at Machine scope first)
powershell -File scripts/install-innovations-sync-task.ps1 -IntervalMinutes 60
```

## Verifying / monitoring
- `select * from innovations_sync_runs order by started_at desc limit 20;`
  — received / upserted / failed per run.
- `select * from innovations_sync_dead_letters where status='pending';`
  — records that failed upsert, with the source payload for replay.
- CV row counts: `select count(*) from customers where innovations_customer_id is not null;`

## Troubleshooting

| Symptom | Cause / fix |
| ------- | ----------- |
| `401 Missing/invalid x-api-key` | Key not saved in vault, or wrong value. Re-save under CV API connector. |
| `403 Missing required scope: customers:write` (or `contacts:write`) | Key lacks that scope. Mint a key with both `customers:write` and `contacts:write`. |
| `404 Unknown entity` | Only `customers`, `contacts` supported in v1. |
| `422` / `failed` status | Upsert errors — inspect `innovations_sync_dead_letters.last_error`. |
| `Invalid column name` in office logs | The `contacts` SQL uses assumed `dbo.Contacts` columns. Adjust `ENTITIES.contacts.sql` / `.map` in `lib/innovations-sync.js` to the real columns, re-run dry-run. |
| Duplicate rows | Should not happen (unique index on `innovations_*_id`). If seen, confirm the migration's unique indexes were applied. |

## Notes
- Cost/financial minimization: v1 sends no financial figures. Balances, invoice,
  and statement **headers** are a planned v2 once their source columns are confirmed.
- Re-runs are safe: every entity upserts on an immutable Innovations id.
