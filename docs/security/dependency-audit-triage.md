# Dependency Audit Triage (2026-03-27)

This triage is based on `npm audit --json` run on March 27, 2026 before remediation.

## Runtime production impact

- `brace-expansion` (GHSA-f886-m6hf-6m8v, moderate): present in production dependency path via `exceljs -> archiver -> readdir-glob -> minimatch -> brace-expansion@2.0.2`. Impact was potential process hang/memory exhaustion when processing malicious glob input.

## Dev-only tooling impact

- `picomatch` (GHSA-c2c7-rcm5-vvqj high, GHSA-3v7f-55p6-f55p moderate): present only in development tooling (`vite`, `typescript-eslint`, `vitest` tree at audit time).
- `flatted` (GHSA-25h7-pfq9-p65f high, GHSA-rf6f-7fwh-wjgh high): present in ESLint cache path (`eslint -> file-entry-cache -> flat-cache -> flatted`).
- Additional `brace-expansion` copies from tooling-only trees (`eslint`, `typescript-eslint`).

## Remediation summary

- Removed unused `lovable-tagger` dev dependency to eliminate stale transitive `picomatch@2.3.1`.
- Added `overrides` to force patched transitive versions:
  - `brace-expansion` to `1.1.13`, `2.0.3`, and `5.0.5` by semver lane.
  - `picomatch@^4.0.3` to `4.0.4`.
  - `flatted` to `3.4.2`.
- After remediation, `npm audit` reports zero vulnerabilities.
