# Edge Function deployment and health monitoring

`.github/workflows/edge-function-release.yml` is the production control loop:

1. A push to `main` that changes `supabase/functions/**` or `supabase/config.toml` redeploys every function folder except `_shared`.
2. The release stays unmarked until `npm run qa:edge-smoke` completes. The smoke script uses non-destructive CORS/readiness probes for every discovered function and records the result through `record_edge_function_health`.
3. GitHub Actions repeats the same probe every five minutes. A failure is persisted, shown at `/admin/settings/edge-functions`, and creates an admin notification. A recovery creates a separate recovery notification.

Configure these repository secrets before enabling the workflow:

| Secret | Purpose |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI deploy credential with Function deploy access. |
| `SUPABASE_PROJECT_REF` | Production Supabase project reference. |
| `SUPABASE_URL` | Production Supabase URL used for the readiness probes. |
| `SUPABASE_SERVICE_ROLE_KEY` | Records monitor results through the service-role-only health RPC. |

The migration `20260715120000_edge_function_health_monitoring.sql` must be applied before the workflow can record a healthy release. The status page is deliberately admin-only; function details and failures are not exposed on the public website.
