# Security Bug Reports

Track security defects, mitigations, and verification status.

## 2026-05-27 — Frontend edge headers not applied from canonical policy

- Impact: security headers were defined and tested in policy code, but the Vercel deployment config only contained the SPA rewrite.
- Root cause: no automated sync existed between `security/http-header-policy.json` and `vercel.json`.
- Resolution: added Vercel header generation from the canonical policy, enabled CSP/HSTS/frame/content/referrer/permissions headers in `vercel.json`, and added a QA drift check.
- Verification: run `npm run qa:vercel-headers`, `npm run test:headers`, and `npm run build`.
