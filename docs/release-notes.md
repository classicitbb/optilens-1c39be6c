# Release Notes

## 2026-02-28 — Smoke Harness Reliability + Credentialed Login Validation

### Highlights
- Smoke harness now fails if dev server logs transform/startup diagnostics.
- Auth/login checks are included in smoke coverage.
- Runtime error one-line format contract remains enforced.

### Operational Notes
- Protected admin knowledge/wiki access redirects to auth for unauthenticated sessions.
- Changelog and wiki release ledger are expected to stay in sync for major updates.

## 2026-02-28 — Automated QA Harness + Runtime Logging Hardening

### Highlights
- Added route smoke checks for admin core routes.
- Added wiring assertions for runtime logging surfaces.
- Added runtime error formatting contract checks.
Summarized release outcomes for each major date-stamped update.

## 2026-02-28 — Smoke Harness Reliability + Credentialed Login Validation

### Release Notes
- Smoke harness now fails when dev server emits pre-transform/syntax/startup errors.
- Verified login interaction on `/auth` with provided credentials and submit flow automation.
- Verified protected wiki route `/admin/knowledge/wiki` redirects to auth when not already authenticated in browser session.

## 2026-02-28 — Automated QA Harness + Runtime Logging Hardening

### Release Notes
- Added `/auth` to automated smoke route checks.
- Added Auth page checks to ensure login UX strings remain present.
- Added/kept runtime logging checks for app wiring and one-line error format contract.
