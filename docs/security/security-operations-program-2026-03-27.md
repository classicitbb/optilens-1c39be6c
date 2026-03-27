# Security operations program (effective 2026-03-27)

## 1) Centralized audit logging

All auth events, privileged actions, and security-relevant edge-function events are centralized in:

- `public.security_audit_events`
- `public.security_alerts`

### Event taxonomy

- `auth`
  - `auth.authenticated`
  - `auth.unauthorized`
  - `auth.forbidden`
  - `auth.role_granted`
- `privileged_action`
  - role-check and admin authorization outcomes.
- `edge_security`
  - bot detection, rate-limit abuse, webhook auth failures.
- `secrets_management`
  - sensitive secret access and service-role handling.
- `incident_response`
  - runbook execution evidence.

### Required event envelope

Each event includes category, event type, severity, status code (if applicable), source function, source path, request id, masked IP, user agent, redacted payload, and UTC timestamp.

## 2) Alerting for suspicious activity

`public.log_security_event` auto-emits deduplicated alerts in `public.security_alerts` for:

1. **Auth anomalies**
   - Trigger: >= 10 unauthorized/forbidden auth events from one `ip_hint` in 15 minutes.
2. **401/403/429 spikes**
   - Trigger: >= 20 matching status codes in 5 minutes per edge function.
3. **Abuse patterns**
   - Trigger: `abuse.rate_limit`, `abuse.bot_detected`, or service-role exposure events.

Alerts are deduplicated by `dedupe_key`, with `occurrence_count`, `first_seen_at`, and `last_seen_at` for incident triage.

## 3) Incident response runbooks

Runbooks are defined in code (`src/security/program.ts`) and tested in unit tests (`src/tests/unit/securityProgram.unit.test.ts`):

- Credential leak
- Account takeover
- Service-role exposure
- Data exfiltration

Each runbook includes evidence, containment, eradication, recovery, and communications steps.

## 4) Secrets management policy

1. **No hardcoded secrets**
   - Secrets must only come from platform-managed secret stores/environment variables.
2. **Scoped keys**
   - One workload per key, least privilege by default.
3. **Rotation cadence**
   - Standard keys: every 90 days.
   - Break-glass keys: rotate after every use and at least every 30 days.
4. **Break-glass process**
   - Requires active incident ticket, dual approval, and post-use audit evidence.

## 5) Recurring security activities schedule

- Quarterly threat modeling
- Quarterly dependency + SAST review
- Annual external penetration test
- Continuous remediation SLA tracking (30-day SLA max)

All activity definitions and owners are tracked in `src/security/program.ts` and enforced by unit tests.
