# React Router v7 Migration Plan

## Current State

- **Package:** `react-router-dom` v6.30.1
- **Pattern:** JSX-based `<Routes>/<Route>` declarations across 6 route files
- **Total routes:** ~180 route declarations
- **Status:** Deferred from dependency update plan (see `docs/dependency-update-plan.md`)

---

## What Changes in v7

| v6 Pattern | v7 Equivalent | Notes |
|---|---|---|
| `<BrowserRouter>` | `createBrowserRouter()` + `<RouterProvider>` | Top-level wiring change |
| `<Routes>/<Route>` | Route config objects | JSX `<Route>` still works in v7 but deprecated |
| `React.lazy` + `<Suspense>` per route | `lazy()` in route config | v7 has built-in lazy loading per route |
| `<Navigate>` for redirects | `redirect()` in loader or `{ path, redirect }` | More explicit |
| `useLoaderData()` | Unchanged | New data pattern available |
| `<Outlet>` | Unchanged | Nested routes identical |

---

## Route Files to Migrate

| File | Domain | Route Count |
|---|---|---|
| `src/App.tsx` | Root router + shells | ~15 top-level routes |
| `src/routes/public/PublicRoutes.tsx` | Public marketing | ~35 routes |
| `src/routes/admin/AdminRoutes.tsx` | Admin console | ~90 routes |
| `src/routes/moonshot/MoonshotRoutes.tsx` | Moonshot app | ~20 routes |
| `src/routes/portal/PortalRoutes.tsx` | Customer portal | ~10 routes |
| `src/routes/ops/OpsRoutes.tsx` | Ops shell | ~1 redirect |

---

## Key Risk Areas

### 1. `AdminProtectedRoute` wrapper pattern
Currently wraps entire shells:
```tsx
<Route path="/admin/*" element={<AdminProtectedRoute><AdminRoutes /></AdminProtectedRoute>} />
```
In v7, protection should move to a loader or a parent route component. The `AdminProtectedRoute` logic needs extracting to a shared auth check function.

### 2. Shell providers (CustomerShell, AdminRoleProvider)
Shells are currently `<Outlet>` wrappers. In v7 these become parent route `element` values — same concept, just wired differently.

### 3. Lazy + Suspense boundaries
v6 uses `React.lazy()` with `<Suspense fallback={<RouteLoadingFallback />}>` at the shell level. v7's per-route `lazy()` moves this into the route config itself — the global Suspense boundary in `App.tsx` can be removed.

### 4. Legacy `<Navigate>` redirects
There are 20+ `<Navigate replace>` routes in `AdminRoutes.tsx`. In v7 these become `{ path: "old-path", redirect: "/new-path" }` entries in the route config — cleaner and tree-shakeable.

### 5. `src/config/routeRegistry.ts` metadata
The route registry uses typed metadata (`RouteDomain`, `RouteAudience`, `AuthMode`, etc.). In v7 this can be integrated directly into route `handle` objects, making metadata co-located with route definitions.

---

## Recommended Migration Approach

### Phase 1 — Prerequisite (no breaking changes)
1. Upgrade `react-router-dom` to v7 in a dedicated PR
2. Enable `v7_startTransition`, `v7_relativeSplatPath`, and other v6→v7 future flags
3. Fix any deprecation warnings surfaced by the flags
4. Run full test suite + smoke checks

### Phase 2 — Convert root router (App.tsx)
1. Replace `<BrowserRouter>` with `createBrowserRouter` + `<RouterProvider>`
2. Convert top-level shell routes to route config objects
3. Keep shell provider wrappers as parent route `element` values
4. Run build + smoke

### Phase 3 — Migrate one shell at a time (low-to-high risk order)
1. **OpsRoutes** (1 redirect — trivial)
2. **PortalRoutes** (10 routes — low complexity)
3. **PublicRoutes** (35 routes — moderate, many static content pages)
4. **MoonshotRoutes** (20 routes — self-contained)
5. **AdminRoutes** (90 routes — highest complexity, most legacy redirects)

### Phase 4 — Data loaders (optional, phased separately)
For Supabase queries currently in `useQuery` hooks, v7 data loaders are optional. Migrate only where it improves performance (e.g., prefetching catalog data on `/admin/pricing/catalog` load). Do not migrate all queries — `@tanstack/react-query` coexists well with v7.

### Phase 5 — Clean up
1. Remove the `<Suspense>` shell wrappers from `App.tsx` (per-route lazy replaces them)
2. Move legacy `<Navigate>` redirects to `{ redirect }` route config entries
3. Integrate route metadata into `handle` objects
4. Update `src/config/routeRegistry.ts` to serve as the single source of truth for route config

---

## Estimated Scope

| Category | Effort |
|---|---|
| Phase 1 (upgrade + flags) | Small — 1 PR, ~2h |
| Phase 2 (root router) | Medium — 1 PR, ~4h |
| Phase 3 (shells, per-shell PRs) | Large — 5 PRs, ~2h each |
| Phase 4 (loaders, optional) | Large — ongoing, can skip |
| Phase 5 (cleanup) | Small — 1 PR, ~2h |

**Total minimum (Phases 1–3 + 5):** ~16h across 8 PRs

---

## Acceptance Criteria per Phase
- `npm run lint` passes
- `npx tsc --noEmit` passes
- `npm run build` passes
- `npm run qa:smoke` passes
- All legacy redirect URLs continue to redirect correctly (verify with browser)
- Auth guards correctly block unauthenticated access to `/admin/*` and `/profile/*`
