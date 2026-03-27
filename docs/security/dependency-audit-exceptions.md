# Dependency Audit Exceptions Process

Use this process only for temporary accepted risk that cannot be remediated immediately.

## Policy

- Every exception must include:
  - advisory `id` (npm/GHSA source id from `npm audit --json`)
  - package name
  - reason and compensating controls
  - owner
  - `expiresOn` (ISO date, max 30 days)
- Expired exceptions are ignored automatically by CI.
- High/Critical vulnerabilities fail CI unless covered by a non-expired exception.

## File

- Source of truth: `security/dependency-audit-exceptions.json`.
- Schema:

```json
{
  "version": 1,
  "updatedAt": "2026-03-27",
  "owner": "engineering",
  "exceptions": [
    {
      "id": 1115493,
      "package": "picomatch",
      "severity": "high",
      "scope": "dev-only",
      "reason": "Awaiting upstream release",
      "compensatingControls": "Pinned CI runners; no untrusted glob input in production path",
      "owner": "team@example.com",
      "createdOn": "2026-03-27",
      "expiresOn": "2026-04-26"
    }
  ]
}
```

## Workflow

1. Attempt remediation first (upgrade direct dependency, then transitive via maintained upstream, then controlled override).
2. If still blocked, add a time-boxed exception with owner + expiration.
3. Open a tracking issue and link it in the exception reason.
4. Remove exception as soon as upstream fix lands.
