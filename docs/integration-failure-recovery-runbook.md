# Integration failure recovery runbook

## Detection signals
- Integration status flips to `error`.
- Error rate rises in integration health metrics.
- Failed jobs increase in `integration_sync_jobs`.

## Recovery flow
1. Inspect latest structured logs in `integration_structured_logs` (`log_level = 'error'`).
2. Inspect latest failed sync job with `error_message`.
3. Validate provider connectivity via **Test connection**.
4. If credentials are invalid, rotate credentials and retest.
5. Requeue one incremental sync after failure root cause is fixed.
6. If conflicts are blocking writes, resolve items in `integration_conflict_queue`.
7. Verify health dashboard shows improving lag and lower error rate.

## Escalation
Escalate to engineering if:
- Two consecutive retries fail with the same root cause.
- Lag behind source exceeds agreed SLA.
- Conflict queue grows faster than resolution throughput.
