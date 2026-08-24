# Project Knowledge

- Repository: `classicitbb/optilens-1c39be6c`
- Default branch: `main`
- Last verified: 2026-08-24
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
| Build | `npm run build` |
| Lint | `npm run lint` |
| Test | `npm test` |
| PR checks | `npm run qa:pr-checks` |
| Unit tests | `npm run test:unit` |
| Integration tests | `npm run test:integration` |
| End-to-end tests | `npm run test:e2e` |
| Smoke checks | `npm run qa:smoke` |
| Edge smoke | `npm run qa:edge-smoke` |

Use the more specific validation matrix in `AGENTS.md`.

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

- Privileged routes require the correct guard.
- Viewer/customer paths must not expose product cost.
- Website pricing source changes must be explicit.
- AI cannot invent prices, approve commercial terms, promise delivery, or send unapproved customer messages.
- Keep route declarations, metadata, navigation, authorization, and tests synchronized.
- Maintain one shared wiki renderer.
- Record environment-variable names only; values remain in approved secret stores.
