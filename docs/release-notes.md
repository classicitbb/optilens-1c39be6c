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
