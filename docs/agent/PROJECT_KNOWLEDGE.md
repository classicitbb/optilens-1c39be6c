# Project Knowledge

- Repository: `classicitbb/optilens-1c39be6c`
- Default branch: `main`
- Last verified: 2026-09-11
- Role: Active Classic Visions / OptiLens hosted web platform
- Business owner and production approver: Russell Hunte
- Current-work source: `STATUS.md`

## Verified identity and purpose

This repository is the source synchronized to the connected Lovable **Classic Visions** project and is linked to the hosted application on Vercel.

It contains the public wholesale website, store, customer portal, administration, pricing/catalog, CRM, helpdesk, knowledge, document, and copilot surfaces. Customer-safe cloud features may integrate with OptiLens Local through controlled contracts; hosted code must not directly access private on-premise databases.

## Verified stack

Evidence: `package.json`, `.nvmrc`, repository configuration, and project documentation.

- Node 20 or 22; contributor default 22.
- npm 10 and `package-lock.json`.
- React, TypeScript, Vite, React Router.
- Tailwind CSS and shadcn/Radix UI.
- TanStack Query, Zustand, React Hook Form, Zod, Tiptap, Recharts.
- Supabase database/auth/storage/functions.
- Lovable synchronization and Vercel hosting.

## Commands

| Purpose | Command |
|---|---|
| Runtime | `nvm use` |
| Install | `npm ci` |
| Develop | `npm run dev` |
| Double-click local preview | `launch-site.bat` (legacy alias: `launchsite.bat`) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Test | `npm test` |
| PR checks | `npm run qa:pr-checks` |
| Unit tests | `npm run test:unit` |
| Integration tests | `npm run test:integration` |
| End-to-end tests | `npm run test:e2e` |
| Smoke checks | `npm run qa:smoke` |
| Edge smoke | `npm run qa:edge-smoke` |
| Seedance 2.5 example | `npm run higgsfield:seedance` |
| Create a migration | `supabase migration new <descriptive_name>` |

Use the more specific validation matrix in `AGENTS.md`.

The local-preview launcher selects the supported Node 22/npm 10 toolchain,
builds the checkout, and serves a strict local port (8080 by default). Set the
`PORT` environment-variable name before launch only when an alternate local
port is needed.

## Sources of truth

- Work status and unfinished functionality: `STATUS.md`.
- Router: `src/App.tsx`; route modules: `src/routes/**`.
- Route metadata: `src/config/routeRegistry.ts`.
- Admin navigation: `src/features/admin/core/config/apps.ts`.
- Feature context: `src/features/<name>/CONTEXT.md`.
- Database and functions: `supabase/**`.
- Hosting behavior: `vercel.json`.
- Detailed architecture: `docs/architecture/README.md`.

## Current work

Do not duplicate or freeze the active list here. Read and update `STATUS.md`; it currently records partly finished portal copilot, deployment, MCP, and catalog-editor work as well as known catalog/preview defects.

## Durable constraints

- Native ordering direction (plan only): custom prescription lenses enter at
  `/profile/rx-order`; stock lenses and all other catalogued products enter at
  `/store`. The access and customer-ownership work required to make the Rx form
  available to every signed-up customer with an authorized membership is in
  `docs/lablink-to-native-ordering-plan.md`. The current approved-customer gate
  and linked-account requirement remain in force until approved implementation.

- The portal Rx form is owned by `src/features/rx-order/embed/` (markup, CSS,
  engine); `src/components/account/AccountLayout.tsx` owns the portal page's
  outer width. The dev-only `/dev/rx-order` route mounts the same engine with
  fixture catalog data for read-only local UI review. Persisted `cv.rxorder/1`
  Chemistrie clips must be normalized when options change so drafts remain
  editable. Until a priced catalogue and fulfillment contract exist, selected
  Chemistrie clips travel as lab instructions in `delivery.notes` and the
  quote's `notes_customer`; they do not create SKU or quote lines or change the
  live quote total.

- Privileged routes require the correct guard.
- Viewer/customer paths must not expose product cost.
- Website pricing source changes must be explicit.
- AI cannot invent prices, approve commercial terms, promise delivery, or send unapproved customer messages.
- AI spend source uses an admin-only ledger and manual billing snapshots; it
  has no historical request-cost data before migration and Edge deployment.
  Keep Lovable editor credits distinct from Lovable AI gateway charges. See
  `docs/ai-spend-monitoring-plan.md` before adding a balance or forecast.
- Keep route declarations, metadata, navigation, authorization, and tests synchronized.
- Pricing editors are version-scoped: select a version at
  `/admin/pricing/pricelists`, then edit `rx`, `stock`, or `supplies` at
  `/admin/pricing/pricelists/:versionId/:section`. Generic/legacy pricing URLs
  are compatibility redirects to the selection table and must not silently
  choose a version.
- Maintain one shared wiki renderer.
- Record environment-variable names only; values remain in approved secret stores.
- The server-only Higgsfield Seedance example loads `HF_CREDENTIALS` from the
  ignored `.env.local` file. Its execution creates a billable generation and
  must never be moved into browser-delivered code.
- Price overrides declare their owner through `override_source`: operator edits are `manual`; only percentage materialization writes `bulk_adjustment`. Metadata-only pricelist saves must not call materialization.
- Gatekeeper route/polling state is database-controlled and production-only. Only pre-POST Rx failures can return to the Innovations queue; stock or ambiguous post-start failures require review.
- Rx mount payloads use `plastic`, `metal`, `grooved`, or `rimless`. Restore
  compatibility maps historical `full` to `plastic` and `supra` to `grooved`;
  assistant handoffs must emit only the current values.
