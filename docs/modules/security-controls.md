# Security Controls Module Docs

Operational notes for code in `security/**`.

## 2026-08-22 — Public view caller permissions

- Public Data API views must use `security_invoker=true` so underlying table RLS evaluates as the querying role.
- `store_product_variants_public` also retains `security_barrier=true`; the forward migration repairs databases that applied the earlier owner-permission definition.
- The migration audit scans every migration after the customer-data hardening guard and rejects newly created public views that omit caller permissions.

## 2026-08-22 — Portal microphone scope

- `Permissions-Policy` allows microphone capture only for the same origin (`microphone=(self)`). Camera, geolocation, payment and other unused capabilities remain disabled.
- The portal assistant still requires a direct user gesture and browser permission before recognition starts; the header does not grant device access by itself.

## 2026-05-27 — Edge header policy synchronization

- `security/http-header-policy.json` is the canonical source for frontend edge security headers and CSP directives.
- `scripts/sync_vercel_security_headers.mjs` converts the enforcement-mode policy into the `headers` block in `vercel.json`.
- `X-Frame-Options: DENY` is included alongside CSP `frame-ancestors 'none'` for older browser and intermediary compatibility.
- After changing header policy, run `npm run qa:vercel-headers` and `npm run test:headers` to verify config sync and policy expectations.
