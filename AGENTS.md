# AGENTS.md

## Environment
- Use Node 20
- Install dependencies with `npm ci` when `package-lock.json` exists
- Do not switch package managers
- Assume the repo must work from a clean checkout

## Validation
- Run `npm run lint`
- Run `npm run test -- --runInBand`
- Run `npm run build`

## Rules
- Fix dependency and environment issues before changing app code
- Do not bypass failing checks by removing scripts
- Report exact failing command and root cause

# Repository agent rules

- Preserve the existing wiki reader shell unless explicitly instructed otherwise.
- All wiki article rendering must go through one shared renderer.
- Preview and published views must use the same renderer.
- Never render article body through a generic plain text component.
- Publishing must be blocked if render validation fails.
- Preserve navigation hierarchy and article URLs during migration.
- Prefer maintainable refactors over parallel legacy systems.

## Admin architecture and routing governance

- Treat `src/routes/admin/AdminRoutes.tsx` as the canonical runtime route map for the `/admin` shell.
- Keep `src/features/admin/core/config/apps.ts` synchronized with canonical route assignments (no dead sidebar links).
- Every admin page must have exactly one canonical route; legacy URLs must be redirect-only.
- Do not introduce parallel active routing systems for the same admin runtime without an explicit migration plan.
- For Moonshot pages, prefer the canonical `/admin/moonshot/**` route namespace and keep shell parity with other admin apps.
- New admin views must include: route registration, nav placement, authz decision, and tests for route accessibility.
- Keep website content management and website product/store operations as separate admin surfaces.
