# Integration onboarding runbook

## Scope
Use this checklist when enabling a new tenant/provider integration.

## Steps
1. Confirm the tenant has the `integrations` feature visible for `admin` role only.
2. Navigate to **Admin → Settings → Integrations** and enter environment/base URL/database/user identifier.
3. Choose auth mode and enter credential (password or API key).
4. Save configuration.
5. Run **Test connection** and validate status is `Connected`.
6. Set sync direction + conflict policy and save.
7. Trigger **Initial import**.
8. Verify records in the integration health metrics panel.
9. Check `integration_audit_events` for:
   - `credentials_changed`
   - `connection_tested`
   - `manual_sync_triggered`
10. If conflicts exist, review `integration_conflict_queue` and resolve.

## Validation queries
```sql
select event_type, created_at
from public.integration_audit_events
where tenant_key = 'default' and provider = 'odoo'
order by created_at desc;
```
