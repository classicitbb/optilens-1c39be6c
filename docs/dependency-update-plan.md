# Dependency Update Plan (Build Stabilization)

## Phase 1 — Low-risk refresh (completed)

Applied non-breaking dependency updates where `Wanted > Current` and the major version remained unchanged by running `npm update` once from the repository root.

### Prioritized foundational packages refreshed

- `vite`: `5.4.19` → `5.4.21`
- `typescript`: `5.8.3` → `5.9.3`
- `eslint`: `9.32.0` → `9.39.4`
- `typescript-eslint`: `8.38.0` → `8.56.1`
- `@supabase/supabase-js`: `2.89.0` → `2.98.0`
- `react-hook-form`: `7.61.1` → `7.71.2`
- `@tanstack/react-query`: `5.83.0` → `5.90.21`

`@vitejs/plugin-react-swc` remained at `3.11.0` because no newer `3.x` version is currently available in this repo's dependency range.

### Regression checks executed after Phase 1

- `npm run lint` (fails due to pre-existing lint debt unrelated to this update set)
- `npx tsc --noEmit` (pass)
- `npm run build` (pass)
- `npm run qa:smoke` (pass)

## Phase 2 — Planned isolated major upgrades

Major upgrades will be split into isolated PRs with migration notes and focused regression checks.

### Deferred known breaking-major tracks

- React 19 (`react`, `react-dom`, and related typings)
- React Router 7 (`react-router-dom`)
- Tailwind 4 (`tailwindcss`)
- Zod 4 (`zod`)
- Recharts 3 (`recharts`)

### Additional major candidates to schedule separately

- `vite` 7 + `@vitejs/plugin-react-swc` 4 alignment
- `eslint` 10 ecosystem
- `@hookform/resolvers` 5
- `date-fns` 4

For each isolated major-upgrade PR, include:

1. Package-specific migration notes.
2. Compatibility updates in app code/config.
3. Full validation run: `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm run qa:smoke`.
