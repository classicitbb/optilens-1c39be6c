## Release Governance Checklist

- [ ] I appended a date-stamped section in `CHANGELOG.md` with **Plan**, **Release Notes**, and **Technical Changelog**.
- [ ] I regenerated release artifacts via `npm run release-ledger:sync` (updates `docs/release-notes.md` and `major-update-ledger` payload in `src/data/wikiContent.ts`).
- [ ] I ran merge checks (`npm run qa:pr-checks`, `npm run qa:smoke`, and `npm run build`) and attached results.


## If this check fails

Run `npm run release-ledger:sync` before merge to regenerate release artifacts, then commit the updates to:
- `docs/release-notes.md`
- `src/data/wikiContent.ts`

## Summary

<!-- Describe what changed and why. -->

## Testing

<!-- Paste commands + key output. -->
