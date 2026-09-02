# Fix: Doc Studio blocked by CSP on published site (Material Symbols font)

Doc Studio fails to load on the published site with "Failed to load https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined…". Root cause (verified): the production Content-Security-Policy in `vercel.json` and `security/http-header-policy.json` allows only `style-src 'self' 'unsafe-inline'` and `font-src 'self' data:` — the Google Fonts stylesheet is blocked, and `DocStudioEmbed.tsx` treats any stylesheet load failure as fatal. The Vite preview doesn't enforce CSP, so it works in preview but breaks in production.

## Changes

1. **CSP: allow Google Fonts**
   - `vercel.json`: add `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src` in the Content-Security-Policy header.
   - `security/http-header-policy.json`: mirror the same additions in both `style-src` entries and the `font-src` entries so the policy stays in sync (repo rule: these two files must match).
   - Run `npm run qa:vercel-headers` and `npm run test:headers` to confirm the header sync checks pass.

2. **Harden the loader so a blocked/failed font can never brick Doc Studio again**
   - `src/features/admin/doc-studio/DocStudioEmbed.tsx`: make `loadStylesheet()` resolve (with a console warning) instead of rejecting on error. Scripts remain strict — a missing script genuinely breaks the studio, but a missing icon stylesheet only degrades icons.

## Verification

- Build clean; check `/tmp/observability/build-errors.log`.
- Header-policy sync checks pass (`qa:vercel-headers`, `test:headers`).
- Playwright on `/admin/docs/studio` with CSP enforced (or published URL): studio boots, no error screen, Material Symbols stylesheet loads (200, no CSP violation in console).
- Deliberately block the fonts URL in a test to confirm the studio still loads with degraded icons instead of the error screen.
