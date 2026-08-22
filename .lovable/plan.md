# TanStack Start migration assessment + utilisation report

Two deliverables: (1) a phased, hand-driven migration plan for moving OptiLens from Vite + React Router v7 to TanStack Start, and (2) a repeatable utilisation audit whose output lands as a helpdesk ticket in the admin Helpdesk module.

## Part 1 — Why the one-shot automated migration is not usable here

The built-in migration is designed for a stock Lovable Classic app. This project has diverged far past that:

- ~218 route declarations across `src/App.tsx` and four route files (`public`, `portal`, `admin`, `ops`), with `src/config/routeRegistry.ts` as a governed source of truth and accessibility tests per route.
- npm-only policy with `package-lock.json`, a runtime guard script, and 30+ custom npm scripts (QA, release ledger, header sync, RLS audits, edge deploys). The automated path switches to bun and overwrites the scripts block.
- Vercel hosting with `vercel.json` + `security/http-header-policy.json` sync checks. TanStack Start builds through Nitro — the header pipeline and deploy target both change.
- Tailwind v3 (`tailwind.config.ts`, `postcss.config.js`) with a large custom token set and a strict 0px-radius design system; the automated path force-writes a Tailwind v4 stylesheet.
- Browser-only libraries imported at module scope (`pdfjs-dist`, `jspdf`, Tiptap) that break under SSR module evaluation.
- 37 edge functions, MCP server generation, and a generated `mcp` function that assumes the current build layout.

Conclusion: migrate by hand, in phases, keeping npm, Vercel, the route registry, and CI intact at every step.

## Part 2 — Phased migration plan (no code changes until you approve a phase)

**Phase 0 — Baseline and freeze (no framework change)**
- Green `npm run lint`, `npm run test`, `npm run build`, `npm run qa:pr-checks`.
- Write `docs/architecture/tanstack-migration.md` recording: route inventory by surface, provider nesting around `<Routes>`, every `useSearchParams`/`useNavigate`/`useParams` call site, module-scope browser-global usage, and the Tailwind token set to carry forward.
- Add an SSR-safety lint rule list (no module-scope `window`/`document`/pdf libs).

**Phase 1 — Make the app SSR-safe while still on React Router**
- Convert module-scope browser-global access into `useEffect`/lazy `import()` at point of use (PDF viewer, jsPDF exports, Tiptap editors, analytics init in `main.tsx`).
- This phase alone is valuable even if the migration stops here.

**Phase 2 — Tailwind v3 → v4**
- Port `tailwind.config.ts` tokens to CSS `@theme`, sweep v4 breaking patterns (`shadow`/`rounded`/`blur` scale renames, bare `ring`, `outline-none`, arbitrary `[--var]` values, default border colour), keep the 0px-radius rule enforced.
- Ship independently and verify visually across admin, portal, store, marketing.

**Phase 3 — TypeScript strict mode**
- Flip `strict`/`strictNullChecks` and clear the error wave in batches by feature folder. TanStack Router cannot compile without this, and doing it early keeps the framework swap small.

**Phase 4 — Framework swap on a branch**
- Add TanStack Start + Router alongside, generate `src/routes/__root.tsx` with the existing provider stack and the current `index.html` head content (meta, analytics, favicon, canonical).
- Translate route files surface by surface in this order: `public` → `portal` → `ops` → `admin`. Each surface keeps its guard (`AdminProtectedRoute`) as a `beforeLoad`/wrapper equivalent; the route registry stays the source of truth and gains a generator check that every registry entry has exactly one route file.
- Keep a compat shim so `useSearchParams` call sites (25+ files) work unchanged; idiomatic `validateSearch` is a later cleanup.

**Phase 5 — Build, hosting, CI**
- Nitro/Vercel preset, re-point `vercel.json` and the header sync script, rewire `qa:smoke`, route accessibility tests, and vitest config to the new entry points. npm stays the package manager.

**Phase 6 — Cutover**
- Preview deploy, edge-function smoke (`qa:edge-smoke`), MCP + copilot regression, then flip production. Rollback = revert the branch.

Edge functions, SQL, and RLS are untouched by all of this.

## Part 3 — Utilisation report → helpdesk ticket

New script `scripts/utilisation_audit.mjs` (npm script `qa:utilisation`) producing one report covering:

- **Edge functions** — all 37 listed with last-invocation and 7/30-day call counts from function logs; flagged `dormant` (0 calls in 30d) or `never invoked`.
- **Routes/pages** — every entry in `routeRegistry.ts` cross-checked against: a real page component, a navigation entry (`apps.ts`, headers, sidebars), and analytics pageviews. Flags orphan routes, unlinked pages, and placeholder-only pages.
- **Database** — public tables and RPCs with row counts and last-write timestamps; flags empty/stale tables and RPCs with no reference anywhere in `src/` or `supabase/functions/`.
- **Dead code** — exported components/hooks/utils in `src/` with zero import sites.

Output: a markdown summary plus a JSON artifact under `docs/reports/`. The script then upserts a **helpdesk ticket** (team: internal/ops, subject `Platform utilisation audit — <date>`) with the summary as the ticket body and the full findings as ticket comments grouped by category, so the report is triaged like any other work item. Re-running updates the same ticket rather than creating duplicates.

### Technical notes
- Ticket creation goes through the existing `helpdesk_tickets` tables using the service role from the script; no schema change unless we want a `source = 'automation'` tag — that would be one small migration.
- The audit is read-only against production data.
- Analytics-derived route usage depends on the existing Vercel analytics proxy; if it returns no data the route section degrades to static link analysis only.

### Suggested order
Part 3 first (it is small, self-contained, and tells us which routes/functions do not need migrating at all), then Phase 0–1 of the migration.
