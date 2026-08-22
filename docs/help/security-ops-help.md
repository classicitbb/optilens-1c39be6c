# Security Operations Help

Runbook snippets for security operations and incident response.

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
