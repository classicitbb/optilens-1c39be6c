# Automation Bug Reports

Track issues and exceptions related to QA automation and PR checks.

## Entry format
- Date (UTC)
- Script(s)
- Impact
- Root cause
- Resolution
- Follow-up actions

## 2026-04-13
- Script(s): `scripts/validate_wiki_build_versions.mjs`
- Impact: `npm run qa:pr-checks` failed during `qa:wiki-build-version` on Windows before it could validate wiki article metadata.
- Root cause: the script built `wikiContent.ts` from `new URL(import.meta.url).pathname`, which duplicated the drive prefix on Windows and produced an invalid file path.
- Resolution: switched the script to `fileURLToPath(import.meta.url)` before joining the repo-relative path.
- Follow-up actions: keep path resolution for Node ESM scripts Windows-safe and rerun `npm run qa:pr-checks` after any validator changes.
