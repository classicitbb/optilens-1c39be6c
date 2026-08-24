# Fix: Doc Studio blank on www.classicvisions.net

## What's wrong

Doc Studio is a same-origin iframe (`/ds/studio.html`) embedded in `/admin/docs/studio`. The static app, its assets, and the `docstudio-api` backend all respond correctly — the browser is simply refusing to render the frame.

Your console confirms it:

```text
Framing 'https://www.classicvisions.net/' violates the following
Content Security Policy directive: "frame-ancestors 'none'".
```

The site's security header policy sets `frame-ancestors 'none'` and `X-Frame-Options: DENY`, which block **all** framing — including the app framing its own page. Result: a blank white iframe. (The Lovable-hosted copy works because that host doesn't apply these headers.)

Two secondary CSP blocks appear in the same log and are worth fixing in the same pass:
- Google account avatars (`https://lh3.googleusercontent.com`) blocked by `img-src`.
- The Supabase realtime websocket (`wss://...supabase.co`) blocked by `connect-src` — `https://*.supabase.co` does not cover the `wss:` scheme.

## Changes

1. `security/http-header-policy.json` (source of truth, both `reportOnly` and `enforce` blocks):
   - `frame-ancestors`: `'none'` → `'self'`
   - `img-src`: add `https://lh3.googleusercontent.com`
   - `connect-src`: add `wss://*.supabase.co`
   - `headers["X-Frame-Options"]`: `DENY` → `SAMEORIGIN`
2. Regenerate the derived files from the policy: `vercel.json` headers plus `security/edge/cdn-headers.enforce.json` and `cdn-headers.report-only.json`, via `npm run` on the existing sync script (`scripts/sync_vercel_security_headers.mjs`) — no hand-editing.
3. Validate: `npm run qa:vercel-headers`, `npm run test:headers`, then `npm run build`.

## Security note

`frame-ancestors 'self'` + `X-Frame-Options: SAMEORIGIN` still blocks all cross-origin clickjacking; it only permits the app to frame its own pages, which is what Doc Studio requires. No other origin is added to `frame-ancestors`.

## Deploy

These headers ship with the Vercel deployment, so the fix goes live on the next deploy of `www.classicvisions.net` — no backend or database change involved.
