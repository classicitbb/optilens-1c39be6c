# Security Operations Help

Runbook snippets for security operations and incident response.

## Public view RLS enforcement

- Apply `20260822202731_enforce_store_product_variants_public_invoker.sql` to every environment that ran the earlier store-variant view migration.
- Verify migration source with `node scripts/audit_customer_data_access.mjs`; verify the live view options and underlying RLS before treating deployment as complete.
- Never expose a `public` view to `anon` or `authenticated` with `security_invoker=false`.

## Edge Function release credentials

- The workflow derives `SUPABASE_PROJECT_REF` and `VITE_SUPABASE_URL` from `supabase/config.toml`; do not duplicate either value as a repository secret.
- Configure `SUPABASE_ACCESS_TOKEN` to authorize function deployment and `SUPABASE_SERVICE_ROLE_KEY` to verify email-pipeline database side effects. `SUPABASE_PUBLISHABLE_KEY` is also required for gateway-authenticated probes.
- `DOCSTUDIO_HEALTH_API_KEY` and `CUSTOMER_ONBOARDING_SMOKE_API_KEY` are optional scoped probes; when absent, only their corresponding checks are skipped.

## Portal assistant microphone

- Confirm the deployed `Permissions-Policy` contains `microphone=(self)` and no third-party origin.
- Test the microphone in a real Chrome or Edge session because embedded/browser automation environments may not expose permission prompts or Web Speech recognition.
- If dictation remains unavailable, inspect the browser permission for the site and verify the response header before changing recognition code.

## Frontend edge headers

- Canonical policy: `security/http-header-policy.json`.
- Deployed Vercel config: `vercel.json`.
- Drift check: `npm run qa:vercel-headers`.
- Policy test: `npm run test:headers`.

When changing CSP or security headers, update the canonical policy first, regenerate Vercel config with `node scripts/sync_vercel_security_headers.mjs`, then run both checks before release.
