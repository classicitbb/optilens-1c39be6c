# Release Checklist

Use this checklist before merging any dependency maintenance or major feature release PR.

## Dependency Maintenance Lanes

### Lane A — Patch/Minor Maintenance (default)

Use this lane for routine, low-risk updates where semver remains in the same major range.

- Scope examples:
  - Build/dev tooling updates (Vite `^5`, TypeScript, ESLint, `typescript-eslint`).
  - UI library patch/minor updates (for example Radix primitive patch releases).
  - Non-breaking lockfile refreshes.
- Required checks:
  1. Update dependency ranges in `package.json`.
  2. Regenerate lockfile (`package-lock.json`).
  3. Run:
     - `npm run lint`
     - `npm run build`
  4. Document notable upgrade notes in PR description.

### Lane B — Major Migration (dedicated PR only)

Use this lane for version upgrades that cross major versions or require migration work.

- Rule: one migration concern per PR (no bundling unrelated majors).
- Required checklist for each major migration PR:
  1. Link upstream migration docs in the PR.
  2. Identify breaking API/runtime changes.
  3. Add/update migration notes in this checklist section.
  4. Run targeted regression checks for impacted areas.
  5. Run full verification:
     - `npm run lint`
     - `npm run build`
     - `npm run qa:smoke`

#### Planned dedicated major migration PRs

- [ ] React 19 migration checklist
  - [ ] Update `react`, `react-dom`, and related `@types/*` packages.
  - [ ] Verify concurrent/strict mode behavior in auth/profile/admin routes.
  - [ ] Validate third-party compatibility (Radix, React Query, router integrations).
- [ ] Vite 7 migration checklist
  - [ ] Upgrade `vite` and `@vitejs/plugin-react-swc` together.
  - [ ] Confirm config compatibility and build output integrity.
  - [ ] Re-run CI workflows that depend on Vite CLI behavior.
- [ ] Tailwind 4 migration checklist
  - [ ] Upgrade `tailwindcss`, PostCSS-related packages, and config format.
  - [ ] Validate design token rendering and utility class compatibility.
  - [ ] Regression-check critical pages and shared components.
- [ ] React Router 7 migration checklist
  - [ ] Upgrade `react-router-dom` and route config usage.
  - [ ] Validate auth redirects and nested/admin route behavior.
  - [ ] Verify browser history/deep-link behavior.
- [ ] Zod 4 migration checklist
  - [ ] Upgrade `zod` and validate resolver/schema usage.
  - [ ] Re-test all form validation flows.
  - [ ] Ensure inferred TypeScript types remain correct.

## Release Steps

1. Append a new **date-stamped** section in `CHANGELOG.md` that includes:
   - **Plan**
   - **Release Notes**
   - **Technical Changelog**
2. Before merge, run `npm run release-ledger:sync` to regenerate:
   - `docs/release-notes.md`
   - `src/data/wikiContent.ts` under the `major-update-ledger` article payload.
3. Run PR and smoke/build checks before merge:
   - `npm run qa:pr-checks`
   - `npm run qa:smoke`
   - `npm run build`

## Completion Standard

- Do not merge until all required steps above are complete and reflected in the PR checklist.
