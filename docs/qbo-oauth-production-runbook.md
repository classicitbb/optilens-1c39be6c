# QBO OAuth production gateway

This feature is deliberately split between the public CV Web gateway and
OptiLens Local. CV Web owns only OAuth transaction state and sanitized status.
OptiLens Local is the only component permitted to retain QBO client credentials,
refresh tokens, access tokens, and the unmasked realm ID.

## Vercel routes

The Vercel project that serves `qbo.classicvisions.net` must expose only:

- `GET /`
- `GET /qbo/connect?transaction=<uuid>`
- `GET /qbo/oauth/callback?code=...&state=...&realmId=...`
- `POST /qbo/disconnect`

All other paths must return `404`; the hostname must not be pointed at the
regular SPA deployment.

## Required Vercel secrets

Configure these in Vercel production only; do not prefix any with `VITE_`.

- `QBO_CLIENT_ID`
- `QBO_CODE_HANDOFF_ENCRYPTION_KEY` (32-byte base64url key)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QBO_GATEWAY_RATE_LIMIT_SECRET`

`QBO_CLIENT_ID` may be shared with the Local service. The client secret is
never configured in Vercel.

## Required Local service configuration

OptiLens Local must use a host-only Windows-protected store for:

- `QBO_CLIENT_ID`
- `QBO_CLIENT_SECRET`
- `QBO_REFRESH_TOKEN`
- `QBO_REALM_ID`
- `QBO_ENVIRONMENT=production`

It must authenticate to the CV Web handoff endpoint with an outbound-only
credential, claim each transaction once, exchange the code with Intuit, then
atomically replace the rotated refresh token. It reports only sanitized status
back to CV Web. `OPTILENS_QBO_PRODUCTION_APPLY_ENABLED` remains unset.

## Deployment order

1. Apply `20260820193539_qbo_oauth_gateway.sql` and run Supabase advisors.
2. Deploy and externally verify the Vercel gateway on a preview domain.
3. Point `qbo.classicvisions.net` DNS/TLS to Vercel and verify HTTPS routes.
4. Deploy the Local outbound worker and host-only token store.
5. Add the Intuit production callback URI exactly as documented.
6. Run an authorization and reconciliation-only test; do not enable apply.
