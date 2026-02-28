# Release Notes

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
