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
