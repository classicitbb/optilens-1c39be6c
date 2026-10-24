# Fix Email "not connected" for other admin users

Affected: Roy, Randall, Liz, Lisa, Lisa K, Greg. Russell's Email works in preview; the office mail server is online.

## What was checked
- Relay accepts www.classicvisions.net, classicvisions.net and classicvisions.lovable.app.
- Relay **rejects qbo.classicvisions.net** (your custom domain) — anyone opening the app there gets the "not connected" screen.
- A bridge address saved earlier in a user's browser overrides the relay; if it's the old office address, Email fails outside the published site.
- The relay fix may not be on the published site yet if it hasn't been republished since.

## Fixes
1. Allow qbo.classicvisions.net (and any other domain you confirm) through the relay.
2. Ignore an old saved bridge address that points at the office server, so every user goes through the relay automatically — no clearing needed.
3. Confirm each of the six users has an admin/staff role that the office mail server accepts, and report anyone missing one.
4. Run the standard backend health check, then you publish so the published site gets the fix.

## Technical details
- `_shared/http/cors.ts`: add `https://qbo.classicvisions.net`; redeploy `email-bridge` only; `npm run qa:edge-smoke`.
- `src/lib/emailBridge.ts`: drop localStorage override when it equals `mail-bridge.classicvisions.net`.
- Read-only role query for the six users in `user_roles`.
