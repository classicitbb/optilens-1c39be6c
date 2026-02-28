# Release Checklist

Use this checklist before merging any major feature release PR.

## Required Steps

1. Append a new **date-stamped** section in `CHANGELOG.md` that includes:
   - **Plan**
   - **Release Notes**
   - **Technical Changelog**
2. Append the corresponding entry in `src/data/wikiContent.ts` under the `major-update-ledger` article.
3. Run smoke/build checks before merge:
   - `npm run qa:smoke`
   - `npm run build`

## Completion Standard

- Do not merge until all three required steps above are complete and reflected in the PR checklist.
