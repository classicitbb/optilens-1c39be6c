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
- For explicit repo-wide repair, dependency cleanup, build stabilization, or
  app-wide smoke/debug requests, agents may inspect and edit across feature
  boundaries as needed. Still start with `STATUS.md`, avoid unrelated refactors,
  and preserve the protected wiki/routing rules below unless the task directly
  requires coordinated changes there.

---


## Environment

- Install dependencies with `npm ci` when `package-lock.json` exists
- Use the repo's supported runtime matrix: Node `20.x` or `22.x`, npm `10.x`
- Default to `nvm use` (`.nvmrc` currently pins Node `22`) before install/build commands
- Respect the preinstall runtime guard in `scripts/check-runtime.mjs`; fix Node/npm version drift before changing app code
- When dependency fixes are required, keep npm as the package manager and update
  `package.json`/`package-lock.json` together through npm commands.
- If npm emits the deprecated `http-proxy` env warning in container/CI environments, prefer `./scripts/npm-clean.sh <npm-args>`
- Do not switch package managers
- Assume the repo must work from a clean checkout

## Validation

- Run `npm run qa:pr-checks` (or `npm run ci:pr-checks`) when your change can affect lockfile policy, doc symmetry, release-ledger state, Vercel headers, wiki build-version validation, or product-cost RLS audit coverage
- Run `npm run lint`
- Run `npm run test -- --runInBand`
- Run `npm run build`
- Run `npm run qa:vercel-headers` and `npm run test:headers` when touching `security/http-header-policy.json`, `vercel.json`, or the header sync scripts/tests
- Run `npm run qa:smoke` when touching admin routing, legacy redirects, or runtime error logging wiring
- Run `npm run security:product-cost-rls-audit` when touching product-cost RLS migrations or the audit script; include service-role credentials before shared-environment database-security applies

## Rules

- Fix dependency and environment issues before changing app code
- Do not bypass failing checks by removing scripts
- If `qa:pr-checks` fails on release-ledger drift, run `npm run release-ledger:sync`, review the generated changes, then rerun the checks
- If `qa:wiki-build-version` fails on Windows path handling, inspect `scripts/validate_wiki_build_versions.mjs` and keep `fileURLToPath(import.meta.url)`-based path resolution intact
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
