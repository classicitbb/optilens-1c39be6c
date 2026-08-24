# QBO OAuth gateway

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

## Environment isolation

Deploy a sandbox gateway separately from the production gateway. Each gateway
has exactly one immutable `QBO_GATEWAY_ENVIRONMENT` value (`sandbox` or
`production`) and uses the matching Intuit client ID. CV Web chooses the state
row it displays with the matching non-secret build setting
`VITE_QBO_ENVIRONMENT`. Do not point a sandbox CV Web build at a production
gateway, or vice versa. The sandbox callback is
`https://qbo-sandbox.classicvisions.net/qbo/oauth/callback`; production keeps
`https://qbo.classicvisions.net/qbo/oauth/callback`.

## Required Vercel secrets

Configure these in Vercel production only; do not prefix any with `VITE_`.

- `QBO_CLIENT_ID` (the client ID for this gateway's environment)
- `QBO_GATEWAY_ENVIRONMENT` (`sandbox` for the pilot; `production` only for the production gateway)
- `QBO_REDIRECT_URI` (the exact callback URI for this gateway's environment)
- `QBO_CODE_HANDOFF_ENCRYPTION_KEY` (32-byte base64url key)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QBO_GATEWAY_RATE_LIMIT_SECRET`
- `QBO_LOCAL_HANDOFF_TOKEN`
- `QBO_ADMIN_ORIGIN` (the exact HTTPS origin hosting CV Web admin)
- `QBO_ADMIN_SUCCESS_URL` (the exact HTTPS CV Web integrations-page URL)

`QBO_CLIENT_ID` may be shared with the matching Local store. The client secret
is never configured in Vercel.

The CV Web frontend needs the non-secret build variables
`VITE_QBO_GATEWAY_URL=https://qbo-sandbox.classicvisions.net` and
`VITE_QBO_ENVIRONMENT=sandbox` for the pilot. Neither may contain a credential.
The Vercel CORS allow-list is deliberately restricted to `QBO_ADMIN_ORIGIN`.

## Required Local service configuration

OptiLens Local must use a host-only Windows-protected store for:

- `QBO_CLIENT_ID`
- `QBO_CLIENT_SECRET`
- `QBO_REFRESH_TOKEN`
- `QBO_REALM_ID`
- `OPTILENS_QBO_ENVIRONMENT=production`

For the sandbox pilot, Local instead uses its separate Windows-protected sandbox
store and `OPTILENS_QBO_ENVIRONMENT=sandbox`. It must authenticate to the CV Web handoff endpoint with an outbound-only
credential, claim each transaction once, exchange the code with Intuit, then
atomically replace the rotated refresh token. It reports only sanitized status
back to CV Web. `OPTILENS_QBO_PRODUCTION_APPLY_ENABLED` remains unset.

## Deployment order

1. Apply `20260820193539_qbo_oauth_gateway.sql`,
   `20260821045024_qbo_command_queue.sql`, and
   `20260821131231_qbo_gateway_rate_limit.sql`, and
   `20260823120000_qbo_sandbox_environment.sql`; then run Supabase advisors.
2. Deploy and externally verify the sandbox gateway on
   `qbo-sandbox.classicvisions.net`.
3. Keep `qbo.classicvisions.net` unchanged during the sandbox pilot.
4. Deploy the Local outbound worker and host-only token store.
5. Add the Intuit sandbox callback URI exactly as documented.
6. Run an authorization and reconciliation-only test; do not enable apply.
