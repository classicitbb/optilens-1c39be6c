# AGENTS.md

## Start here — orientation sequence

Read these files in order before beginning any task. Fetch only the ones
relevant to your work area — do not load everything upfront.

1. **`STATUS.md`** (root) — always read this first. Current work, known bugs,
   do-not-touch zones. One file, always up to date.
2. **`src/features/<name>/CONTEXT.md`** — read the CONTEXT.md for the specific
   feature you are working in. Each one is ~30 lines.
3. **Deeper docs** — fetch only if the task requires it:

| Need | File |
|---|---|
| Catalog editor full behavior spec | `docs/catalog-editor-current-behavior.md` |
| Routing architecture | `plan.md` |
| Route registry (source of truth) | `src/config/routeRegistry.ts` |
| Design constraints | `classicvisions_design_philosophy.md` |
| AI assistant architecture | `docs/ai-knowledge-assistant-architecture.md` |
| Architecture overview | `docs/architecture/README.md` |
| Module doc index | `docs/ai/module-doc-index.json` |

## Scope discipline

- Only read files in the feature folder you are tasked with.
- Do not preload docs for unrelated features.
- If a task touches multiple features, read both CONTEXT.md files, then stop
  unless you hit a gap.

---


## Environment

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

## Frontend architecture and routing governance

- Treat `src/App.tsx` as the frontend shell entrypoint and keep domain split explicit: public, portal, admin, moonshot, ops.
- Keep route declarations centralized in `src/routes/**` and keep `src/config/routeRegistry.ts` synchronized for metadata + legacy redirects.
- Every page component intended for runtime use must have exactly one canonical route.
- Legacy and alias paths must be redirect-only, not duplicate page implementations.
- Keep privileged areas (`/admin/**`, `/admin/moonshot/**`, `/ops/**`) behind explicit admin authorization guards.
- Keep `src/features/admin/core/config/apps.ts` synchronized with admin route assignments (no dead sidebar links).
- Do not run parallel active route systems for the same runtime surface without a migration plan and deprecation path.
- Keep website content management (`/admin/website/content`) and website product/store operations (`/admin/website/store`) as separate admin surfaces.
- New routes must ship with: route registration, navigation placement, auth decision, and route accessibility tests.
