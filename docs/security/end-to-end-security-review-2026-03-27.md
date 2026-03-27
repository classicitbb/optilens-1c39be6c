# End-to-end security review (repository-level)

Date: 2026-03-27 (UTC)

## Scope and method

This is a source-level security review based on the current repository state (frontend, route/auth patterns, Supabase edge functions, SQL migrations, and dependency posture). It is **not** a production penetration test and does not include runtime checks such as TLS posture, CDN/WAF config, or live HTTP header scanning.

Checks performed:

- Install and baseline validation (`npm ci`, `npm run lint`, `npm run build`, `npm audit --json`).
- Manual review of auth routing, role checks, content rendering, and server-side function patterns.
- Manual review of representative SQL migrations for row-level security (RLS) and checkout hardening.

## Executive summary

**Current rating: Moderate security maturity (approx. 6.5/10).**

Strengths:

1. Admin/ops/moonshot surfaces are behind explicit route guards and role checks.
2. Wiki/article rendering follows a shared canonical renderer path rather than raw HTML output.
3. Recent SQL hardening shows strong server-side validation and permission checks in checkout flows.
4. Contact inquiry handling includes schema validation, anti-bot controls, and basic rate limiting.

Primary gaps:

1. Dependency audit shows unresolved known vulnerabilities (14 total: 2 high, 12 moderate).
2. Several edge functions use wildcard CORS (`Access-Control-Allow-Origin: *`) while also using service-role access patterns.
3. One admin-critical edge function (`admin-user-management`) has `verify_jwt = false`, relying on in-function auth checks rather than gateway JWT enforcement.
4. No visible frontend CSP/security-header policy in the web entrypoint.
5. At least one admin page renders unsanitized `dangerouslySetInnerHTML` from editable content.

## Findings

### 1) Authentication and route protection: generally strong

- Admin/ops/moonshot route trees are wrapped in `AdminProtectedRoute`, with unauthenticated users redirected and unauthorized users blocked.
- Customer portal routes are wrapped by `ProtectedRoute`, including redirect hardening that prevents protocol-relative open redirects (`//...`).
- Route registry encodes auth expectations (`public`, `authenticated`, `admin`) and marks admin roots accordingly.

## 2) Content rendering and XSS posture: mixed

Positive:

- Wiki rendering is centralized through one shared renderer (`WikiArticleRenderer` → `BlogPostRenderer`) and uses structured rendering rather than generic plaintext shortcuts.
- Link rendering includes `rel="noreferrer noopener"` and `target="_blank"` safeguards.

Risk:

- `MoonshotBusinessPlanPage` uses `dangerouslySetInnerHTML` with rich text stored from a `contentEditable` element without visible sanitization in that path. This is a stored-XSS risk if untrusted content enters `futureFocus.richNotes`.

## 3) Backend/data-layer controls: improving, with notable strengths

Positive:

- Migration history shows active RLS enablement/policy work across multiple tables.
- Checkout function hardening includes explicit permission checks, strong input validation, supported-method allowlists, and role-based constraints inside `SECURITY DEFINER` function logic.

Risk:

- Security quality varies by function; some high-privilege edge functions still rely on broad CORS and custom in-function checks.

## 4) Edge function hardening: mixed (important)

Positive:

- `send-transactional-email` is configured with `verify_jwt = true`, and code comments indicate gateway JWT verification.

Risk:

- Many functions expose wildcard CORS (`*`). This is not always a vulnerability by itself, but materially increases abuse surface if endpoint auth/authorization is weak or bypassed.
- `admin-user-management` has `verify_jwt = false` in config, while doing manual bearer-token/user-role checks inside function code. This is safer than no checks, but less robust than enforcing JWT at gateway plus in-function authorization.

## 5) Dependency and supply-chain posture: needs immediate remediation

`npm audit --json` reports:

- Total vulnerabilities: 14
- High: 2
- Moderate: 12

Notable transitive/direct issues include advisories affecting `flatted`, `picomatch`, and dependency chains through `eslint`/`minimatch` and `exceljs`/`archiver` stacks.

## 6) Build/test governance status

- `npm ci`: passed after environment alignment to npm 10.x.
- `npm run lint`: passed with warnings only (804 warnings, 0 errors).
- `npm run build`: passed.
- `npm run test -- --runInBand`: failed because `test` script is not defined in `package.json`.

Root cause for test failure: repository currently does not define a `test` npm script.

## Priority remediation plan

### P0 (do first)

1. Add/restore a real `test` script and enforce it in CI.
2. Triage and remediate high vulnerabilities from `npm audit`.
3. Replace unsanitized `dangerouslySetInnerHTML` admin path with sanitized pipeline or structured renderer.

### P1 (next)

1. Tighten CORS for edge functions to trusted origins only.
2. Enable `verify_jwt = true` for `admin-user-management` unless there is a hard blocker.
3. Add centralized security headers policy (at minimum CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS at edge/proxy).

### P2 (hardening depth)

1. Add automated SAST/dependency checks in PR pipeline.
2. Add abuse controls for public endpoints (rate limits by IP + fingerprint, bot protections).
3. Add security-focused integration tests for role boundaries and edge-function authorization.

## What this score does not include

Not evaluated from this repository-only review:

- Live deployment TLS/certificate setup.
- Runtime headers and CDN/WAF configuration.
- Secret rotation hygiene in deployed environments.
- Infrastructure IAM and production logging retention settings.

A full end-to-end security answer requires a live environment assessment in addition to this code review.
