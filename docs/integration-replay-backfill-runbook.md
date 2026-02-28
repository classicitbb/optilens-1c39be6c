# Integration replay/backfill runbook

## When to use
- Historical records were missed.
- A bad mapping was fixed and historical data must be remapped.
- Provider outage created a sync gap.

## Procedure
1. Freeze user-triggered sync operations for the affected tenant.
2. Capture current sync cursor and health baseline metrics.
3. Trigger an **Initial import** for wide backfill, or targeted replay process per model.
4. Monitor `integration_sync_run_metrics` for records processed and error rate.
5. Resolve conflicts from `integration_conflict_queue`.
6. Confirm cursor progression and reduced lag.
7. Re-enable normal incremental sync triggers.

## Verification query
```sql
select run_started_at, run_completed_at, success, records_processed, records_failed, error_rate
from public.integration_sync_run_metrics
where tenant_key = 'default' and provider = 'odoo'
order by run_started_at desc
limit 20;
```
