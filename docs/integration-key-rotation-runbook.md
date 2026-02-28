# Integration key rotation runbook

## Trigger events
- Scheduled key expiry.
- Suspected credential exposure.
- Provider-side forced rotation.

## Procedure
1. Generate a new provider credential in Odoo.
2. In OptiLens, update integration credential through the integration settings page.
3. Run **Test connection** immediately.
4. Trigger an incremental sync.
5. Confirm no overlapping runs were blocked unexpectedly.
6. Verify a new `credentials_changed` audit event.
7. Confirm structured logs store only redacted credential payload values.

## Post-rotation checks
```sql
select event_type, event_payload, created_at
from public.integration_audit_events
where event_type in ('credentials_changed', 'connection_tested')
order by created_at desc
limit 20;
```
