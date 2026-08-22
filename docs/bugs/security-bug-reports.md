# Security Bug Reports

Track security defects, mitigations, and verification status.

## 2026-08-22 — Portal dictation blocked by Permissions-Policy

- Impact: the assistant microphone control could not access speech input even when the UI and browser supported recognition.
- Root cause: the canonical edge policy set `microphone=()`, which disables capture for every origin.
- Resolution: allow microphone only for the Classic Visions origin with `microphone=(self)`; all other unused device capabilities remain denied.
- Verification: run header synchronization/tests and exercise the actual permission + dictation flow in external Chrome or Edge.

## 2026-05-27 — Frontend edge headers not applied from canonical policy

- Impact: security headers were defined and tested in policy code, but the Vercel deployment config only contained the SPA rewrite.
- Root cause: no automated sync existed between `security/http-header-policy.json` and `vercel.json`.
- Resolution: added Vercel header generation from the canonical policy, enabled CSP/HSTS/frame/content/referrer/permissions headers in `vercel.json`, and added a QA drift check.
- Verification: run `npm run qa:vercel-headers`, `npm run test:headers`, and `npm run build`.
