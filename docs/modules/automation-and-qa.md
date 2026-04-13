# Automation and QA Module Docs

## Purpose
This module covers repository automation scripts in `scripts/**`, including PR checks and quality gates.

## Documentation update requirements
When changing automation behavior, update:
- `CHANGELOG.md`
- `docs/release-notes.md`
- `docs/help/dev-workflow-help.md`
- `docs/bugs/automation-bug-reports.md`

## Guard reference
- `scripts/check_doc_symmetry.mjs`
- `docs/ai/module-doc-index.json`

## 2026-04-13 — Wiki build-version validator Windows path fix

- `scripts/validate_wiki_build_versions.mjs` must resolve its own script directory through `fileURLToPath(import.meta.url)` rather than `new URL(import.meta.url).pathname`.
- On Windows, using `.pathname` can duplicate the drive prefix and produce invalid paths such as `C:\C:\...`, which breaks `qa:wiki-build-version`.
- Expected behavior: `npm run qa:pr-checks` should validate wiki build metadata successfully on Windows and POSIX environments without path normalization workarounds.
