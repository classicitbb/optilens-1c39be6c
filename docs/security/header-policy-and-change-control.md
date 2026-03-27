# Frontend Security Header Policy and Change Control

## Owner

- **Primary owner:** Security Engineering
- **Supporting owner:** Platform Engineering
- **Escalation path:** Open `SEC-*` ticket and page the on-call platform engineer for emergency rollbacks.

## Required headers at CDN/edge/reverse proxy

The frontend must set the following response headers for every route:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` (enforcement mode) or `Content-Security-Policy-Report-Only` (rollout mode)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`

Canonical policy source lives in `security/http-header-policy.json` and should be treated as the single source of truth.

## CSP baseline

Strict CSP directives include:

- `script-src 'self'`
- `connect-src 'self' https://*.supabase.co https://api.openai.com`
- `img-src 'self' data: blob: https://*.supabase.co`
- `frame-ancestors 'none'`
- `object-src 'none'`
- `base-uri 'self'`

## Rollout procedure

1. Deploy `security/edge/cdn-headers.report-only.json`.
2. Observe CSP violations from report endpoint for at least one full release cycle.
3. Resolve violations by updating app behavior or policy.
4. Deploy `security/edge/cdn-headers.enforce.json`.
5. Confirm automated tests pass against all deployed environments.

## Automated regression tests

- Local policy validation: `src/tests/integration/securityHeaders.integration.test.ts`
- Deployed environment checks: same test file, enabled by `HEADER_TEST_URLS` env var (comma-separated HTTPS URLs).

## Change control requirements

Any header or CSP change requires:

1. Pull request from Platform Engineering or Security Engineering.
2. Approval from both owners.
3. Linked `SEC-*` ticket with risk assessment.
4. Passing checks: lint, tests, build, and deployed header regression test run with environment URLs.

Rollback target for invalid policy is **30 minutes** or less from incident declaration.
