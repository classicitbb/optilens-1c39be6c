# Tracing a released Rx order to the Innovations folder

The path, with where to look at each hop (verified end to end 2026-10-01, ~2 s from release to file):

| # | Hop | Where | Look at |
|---|---|---|---|
| 1 | Customer/staff places the order | website | `rx_order_submissions` row, `status='pending_review'` (event `submitted`) |
| 2 | Staff **Release** | website (Rx Orders workspace) | `status='approved'`, `approved_at` (event `submission_approved`) |
| 3 | Host claims it | host `192.168.254.7`, task **OptiLens Rx Submissions** (every 5 min, as Administrator) → `innovations-sync/_rx_submissions/next` | `status='claimed'` (event `submission_claimed`); host log `rx_submission.claimed` |
| 4 | Host builds the `.rx` and drops it | `scripts/rx-submissions-cli.js` → `lib/rx-order-submitter.js` → `data/rx/config.json` `folders.incoming` = `\192.168.254.5\Innovations\Incoming` (no InnovaAPI key, so file-drop) | host log `rx_submission.finished [file_drop] <file>.rx` |
| 5 | Host reports back | `/_rx_submissions/complete` | `status='submitted'`, `result_message` "Dropped …" (event `submission_submitted`) |
| 6 | Innovations consumes the file | `\192.168.254.5\Innovations\Incoming` | the `.rx` disappears within seconds; later `lab_status` fills in on the row |

Orders whose `dispatch_provider` is `gatekeeper` do not use this path.

## Website half (Lovable `query_database`)
```sql
select s.status, s.dispatch_provider, s.transport, s.attempts, s.last_error, s.result_message,
       s.approved_at, s.claimed_at, s.submitted_at, s.lab_status, s.lab_status_at
from rx_order_submissions s where s.id = '<submission id>' or s.quote_id = '<quote id>';

select event, from_status, to_status, created_at from rx_order_events
where quote_id = '<quote id>' order by created_at;
```

## Host half (read-only)
```
ssh 192.168.254.7 "cd C:\Users\Administrator\Documents\GitHub\optilens-local && node scripts\rx-order-trace.js <submission-id | quote-id | file fragment>"
```
(`node.exe` is `C:\Users\Administrator\AppData\Local\hermes\node\node.exe`.) It prints the poll task's last run, the incoming folder's reachability, the order's `rx_submission.*` events, and whether the file is still waiting in Incoming.

## Where it stalls
- `approved` for more than ~5 min: the poll task is not running (check `Get-ScheduledTaskInfo 'OptiLens Rx Submissions'`) or the vault passphrase env var is missing.
- `claimed` and never `submitted`: the host crashed mid-run; look for `rx_submission.failed` / `complete_failed`.
- `failed` with a write error: the incoming path. **`INNOVA-SVR` now resolves to 192.168.254.8, not .5**; the config was repointed to `\192.168.254.5\Innovations\Incoming` on 2026-10-02 (host commit `27bf72e`, not pushed).
- File sits in Incoming: Innovations is not importing.

## Re-running a test
Re-release a `ZZ…DONOTCUT` submission (e.g. `81cc6287-1c90-4368-9871-07c0c89e2833`): set it back to `approved` with `attempts=0, claimed_at=null, submitted_at=null`; it is claimed by the next poll and drops a new `ZZOLTEST1_DONOTCUT_QA` file.
