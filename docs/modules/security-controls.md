# Security Controls Module Docs

Operational notes for code in `security/**`.

## 2026-05-27 — Edge header policy synchronization

- `security/http-header-policy.json` is the canonical source for frontend edge security headers and CSP directives.
- `scripts/sync_vercel_security_headers.mjs` converts the enforcement-mode policy into the `headers` block in `vercel.json`.
- `X-Frame-Options: DENY` is included alongside CSP `frame-ancestors 'none'` for older browser and intermediary compatibility.
- After changing header policy, run `npm run qa:vercel-headers` and `npm run test:headers` to verify config sync and policy expectations.
