# Security Operations Help

Runbook snippets for security operations and incident response.

## Frontend edge headers

- Canonical policy: `security/http-header-policy.json`.
- Deployed Vercel config: `vercel.json`.
- Drift check: `npm run qa:vercel-headers`.
- Policy test: `npm run test:headers`.

When changing CSP or security headers, update the canonical policy first, regenerate Vercel config with `node scripts/sync_vercel_security_headers.mjs`, then run both checks before release.
