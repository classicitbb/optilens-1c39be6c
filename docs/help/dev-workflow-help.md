# Developer Workflow Help

## PR quality guardrails
Run the PR checks locally before opening a pull request:

```bash
npm run qa:pr-checks
```

This includes lockfile policy, documentation symmetry, release-ledger drift, Vercel security-header sync, and wiki build-version validation.

## Lockfile policy

- This repository standardizes on npm.
- Keep `package-lock.json`.
- Do not commit `bun.lock` or `bun.lockb`; `npm run qa:lockfiles` fails when either Bun lockfile exists.

## Vercel header sync

- Run `npm run qa:vercel-headers` to confirm `vercel.json` matches `security/http-header-policy.json`.
- After changing the security header policy, run `node scripts/sync_vercel_security_headers.mjs` to regenerate the Vercel header block.

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
