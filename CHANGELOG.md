# Changelog

All notable major updates to this project are tracked in date-stamped, human-readable format.

## 2026-02-28 — Automated QA Harness + Runtime Logging Hardening

### Plan
- Strengthen smoke coverage for login/auth and high-traffic admin routes.
- Add stricter assertions for runtime error logging wiring across app/page surfaces.
- Enforce stable one-line runtime-error output contract for downstream automation.

### Release Notes
- Added `/auth` to automated smoke route checks.
- Added Auth page checks to ensure login UX strings remain present.
- Added/kept runtime logging checks for app wiring and one-line error format contract.

### Technical Changelog
- Updated `scripts/admin_smoke_and_error_checks.mjs` with additional route and snippet assertions.
- Preserved runtime log format contract checks for `[runtime-error] <timestamp> | <source> | <title> | <detail> | <route>`.
- Added this date-stamped changelog structure for future major updates.
