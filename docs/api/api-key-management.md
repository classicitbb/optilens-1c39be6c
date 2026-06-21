# API Key Management Runbook

Operator-facing runbook for `api-v1` API keys. Pair this with the
[External Sync Guide](./external-sync-guide.md) (consumer-facing).

---

## Who can mint keys

Admins only. Admin → **Settings → API Keys** in this app.
Keys are stored hashed (`api_keys.key_hash`, SHA-256). The raw token is shown
**once** at creation — copy it then.

## Naming convention

`<consumer>-<env>` — e.g. `replica-frontend-prod`, `product-importer-staging`,
`bi-readonly-prod`. The name shows up in `api_audit_log` so make it grepable.

## Scopes — minimum necessary

Grant the smallest set that lets the consumer do its job. Each scope unlocks
one verb on one resource group. See the [scope table](./external-sync-guide.md#2-auth--scopes).

Common bundles:

| Consumer | Scopes |
|---|---|
| External product-management app (read + edit lenses/supplies/addons) | `catalog:read`, `products:read`, `products:write`, `reference:read` |
| External app that also creates new suppliers/materials | + `reference:write` |
| Read-only BI / reporting | `catalog:read`, `products:read`, `reference:read`, `contacts:read`, `customers:read`, `orders:read` |
| Catalog draft-publisher integration | `catalog:read`, `catalog:write` |

Never grant `*:write` to a key that lives in a browser. Browser keys = `*:read`
only, and even then prefer a server proxy.

## Rotation

- **Cadence:** every 90 days, or sooner if you suspect exposure.
- Mint the new key with the same scopes, deploy it to the consumer, confirm
  traffic on the new key in `api_audit_log`, **then revoke the old one**.
- Never reuse a token across consumers — that defeats audit attribution.

## Revocation

In Admin → Settings → API Keys, set `revoked_at`. `verify_api_key` returns
nothing for revoked rows, so the next request 401s. Effect is immediate.

If a token leaks: revoke first, ask questions second.

## Expiry

Optional `expires_at` on each key. Use it for time-boxed integrations
(contractors, demos) so the key dies on its own.

## Audit log

Every request is logged to `public.api_audit_log`:

| column | meaning |
|---|---|
| `api_key_id` | which key |
| `method`, `resource`, `resource_id` | what was called |
| `status` | HTTP status returned |
| `request_summary` | path + query |
| `response_summary` | `{ok:true}` on 2xx, error envelope on 4xx/5xx |
| `ip` | `x-forwarded-for` value, may be a chain |
| `created_at` | when |

Query patterns:

```sql
-- Recent failures for one key
select created_at, method, resource, status, response_summary
from public.api_audit_log
where api_key_id = '<uuid>' and status >= 400
order by created_at desc limit 50;

-- Traffic by consumer in the last 24h
select k.name, count(*) filter (where l.status < 400) as ok,
       count(*) filter (where l.status >= 400) as err
from public.api_audit_log l
join public.api_keys k on k.id = l.api_key_id
where l.created_at > now() - interval '24 hours'
group by k.name order by ok desc;
```

## Incident playbook

1. **Suspected leak.** Revoke the key. Pull `api_audit_log` for that key for
   the last 30 days, look for unfamiliar IPs or scopes being exercised.
2. **Mass write you didn't authorize.** Revoke. The system has no undo —
   restore from point-in-time backup via Lovable support if needed.
3. **Consumer reports 401 after rotation.** They're still on the old key —
   make sure their deploy picked up the new secret.
4. **Consumer reports 403.** Their scopes are wrong for the route they're
   hitting; the error names the missing scope.

## Do / don't

- **Do** create one key per consumer + environment.
- **Do** store keys in the consumer's own secret manager (Vercel env, Supabase
  function secrets, GitHub Actions secrets, etc.) — never in source control.
- **Don't** share a key across two consumers "just for testing".
- **Don't** put a write-scoped key in a public/browser bundle.
- **Don't** edit `api_keys` rows by hand to change scopes — re-mint instead, so
  there's a clean audit trail.
