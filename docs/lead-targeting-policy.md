# Lead Targeting Safety & Compliance Policy

## Purpose
This policy defines guardrails for search planning and campaign generation in the lead-intelligence workflow.

## Blocked-Intent Taxonomy
The platform blocks requests that match any of the following categories:

1. **illegal**
   - Intent to facilitate unlawful activity (for example: fraud, money laundering, counterfeit goods, tax evasion).
2. **exploitative_vulnerability**
   - Intent to target or manipulate vulnerable populations (for example: desperate, grieving, addicted, elderly victims).
3. **coercive_abusive_targeting**
   - Intent involving harassment, threats, blackmail, force, stalking, or non-consensual targeting.

## Enforcement Points

### Lead search planning (`lead-intelligence`)
- Incoming search query text is validated against blocked-intent rules.
- Blocked requests return HTTP 400 with:
  - an actionable error message,
  - blocked category,
  - compliant alternatives.

### Campaign generation (sequence runner)
- Sequence prompts are validated before activities are queued.
- If blocked terms are detected, sequence generation is denied and the UI receives a compliant error message.

## Compliant Alternatives Returned to Users
When a request is blocked, users are guided to one or more compliant patterns:

- **Role-based targeting:** clinic owner, purchasing manager, store manager.
- **Industry-based targeting:** independent optical retailers, eye clinics, pharmacies.
- **Account-based targeting:** named chains, priority account lists, territory accounts.

## Audit Logging
Blocked requests are recorded in `lead_events` with `event_type = 'blocked_request'`.

`provider_diagnostics_summary` should include:
- source module (`lead_intelligence` or `sequence_runner`)
- blocked category
- matched term
- blocked input/query

This log enables compliance review, policy tuning, and incident response.

## Administration Guidance
- Periodically review `lead_events` for blocked-request trends.
- Expand blocked term coverage when new abuse patterns appear.
- Keep alternatives focused on legitimate B2B growth outcomes.
- Communicate policy updates to sales and growth operators.
