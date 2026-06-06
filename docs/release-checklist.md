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

#### Completed major migration PRs

- [x] Recharts 3 migration (2026-03-30)
  - [x] Updated `recharts` from 2.15.4 to 3.8.1.
  - [x] Fixed `chart.tsx` — Tooltip and Legend prop types changed; used permissive typing to accommodate recharts 3 internal state restructuring.
  - [x] No app-level chart code changes needed (only shadcn chart wrapper affected).
- [x] Vite 8 migration (2026-03-30, refreshed 2026-05-27)
  - [x] Updated `vite` from 7.3.1 to 8.0.3 (Rolldown/Oxc bundler).
  - [x] Replaced `@vitejs/plugin-react-swc` with `@vitejs/plugin-react` after Vite reported that no SWC-specific plugins are used.
  - [x] Compat layer auto-converts esbuild/rollupOptions config.
  - [x] Excluded integration test files from `tsconfig.app.json` (Node.js types not available in browser tsconfig).
- [x] Vitest 4 / @vitest/coverage-v8 4 migration (2026-03-30)
  - [x] Updated `vitest` from 3.2.4 to 4.1.2 and `@vitest/coverage-v8` from 3.2.4 to 4.1.2.
  - [x] V8 coverage uses more accurate remapping logic; coverage numbers may shift.
  - [x] `coverage.all` removed in v4 (was not used in this project).
- [x] Lucide-react 1.x migration (2026-03-30)
  - [x] Updated `lucide-react` from 0.462.0 to 1.7.0.
  - [x] Replaced removed `Instagram` brand icon with `Camera` in MyLeadsPage.
  - [x] 32.3% package size reduction (ESM/CJS only, UMD removed).

#### Planned dedicated major migration PRs

- [ ] React 19 migration checklist
  - [ ] Update `react`, `react-dom`, and related `@types/*` packages.
  - [ ] Verify concurrent/strict mode behavior in auth/profile/admin routes.
  - [ ] Validate third-party compatibility (Radix, React Query, router integrations).
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
