# Developer Workflow Help

## PR quality guardrails
Run the PR checks locally before opening a pull request:

```bash
npm run qa:pr-checks
```

## Doc symmetry guard
The doc symmetry guard validates mapped documentation changes for code updates.

### Allowed override
Use only for exceptional cases with mandatory rationale:
- Add a changed file under `docs/bugs/` with filename containing `doc-symmetry-exception` and include:
  - `Doc-Symmetry-Override: true`
  - `Rationale: <required explanation>`
- Or set PR label `docs-exception` and include `Doc-Symmetry-Rationale: ...` in PR body metadata.

## Wiki build-version validator

- The wiki build-version validation step runs inside `npm run qa:pr-checks` via `npm run qa:wiki-build-version`.
- On Windows, the validator must derive its local path from `fileURLToPath(import.meta.url)`; if you see a path like `C:\C:\...`, the script is using URL pathname semantics incorrectly.
- When this check fails, inspect `scripts/validate_wiki_build_versions.mjs` first, then verify `src/data/wikiContent.ts` still contains valid `Build version` metadata for non-draft wiki articles.
