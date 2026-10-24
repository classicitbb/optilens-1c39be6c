# ChatGPT MCP install — findings (read-only, nothing changed)

## Canonical endpoint
- URL: `https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/mcp`
- Transport: Streamable HTTP (POST JSON-RPC, `Accept: application/json, text/event-stream`)
- DNS resolves from the Lovable sandbox (104.18.38.10, 172.64.149.246) — the local failure is a resolver/network issue on your side, not a missing deployment.
- `https://classicvisions.lovable.app/mcp` is NOT an MCP endpoint: 200 `text/html` (website fallback). Use the backend URL above.

## Live probes
| Request | Status | Result |
|---|---|---|
| OPTIONS /mcp (Origin chatgpt.com) | 204 | preflight OK |
| POST initialize, no token | 401 | `WWW-Authenticate: Bearer realm="mcp", resource_metadata=".../functions/v1/mcp/.well-known/oauth-protected-resource"` |
| GET /mcp/.well-known/oauth-protected-resource | 200 | resource = canonical URL; authorization_servers = [`.../auth/v1`]; bearer_methods = header |
| GET root `/.well-known/oauth-protected-resource/functions/v1/mcp` | 401 | gateway "No API key" — use the path-suffixed form above |
| GET `/auth/v1/.well-known/oauth-authorization-server` | 200 | full metadata (below) |
| GET registration_endpoint | 405 | exists, POST-only (not called, to avoid creating a client) |
| GET consent page `/.lovable/oauth/consent` | 200 | present |

## Authorization server
- Issuer: `https://xstmeirxhfbiyayrrsob.supabase.co/auth/v1`
- authorize: `/auth/v1/oauth/authorize`; token: `/auth/v1/oauth/token`; JWKS: `/auth/v1/.well-known/jwks.json`
- Registration: **DCR** at `/auth/v1/oauth/clients/register`. No CIMD advertised. No pre-provisioned client needed.
- Token auth methods: `none` (public client + PKCE), `client_secret_basic`, `client_secret_post`
- PKCE: S256; grants: authorization_code, refresh_token
- Scopes: openid profile email phone offline_access. Server requires none (no requiredScopes); audience `authenticated`; token must carry `client_id` (copied session tokens rejected).

## Live vs source
- Source/manifest: classic-visions-mcp v0.4.0, 27 tools, SDK 0.26.2, OAuth issuer matches live metadata.
- Live auth layer confirmed deployed. The live tool list cannot be confirmed without an OAuth token (tools/list returns 401), so "27 tools live" is unverified; the MCP function only updates on app publish.

## ChatGPT registration
Add connector → URL above → Authentication: OAuth (auto-discovery / DCR). Sign in with a Classic Visions account and approve on the consent page. Prerequisite: ChatGPT's redirect URI is registered automatically via DCR; nothing else to provision.
