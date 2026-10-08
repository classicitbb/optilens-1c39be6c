# Project Knowledge

## Atlas page identity and launcher favorites — 2026-10-07

Title changes own the stored slug; published draft title edits defer the URL until Update. Null legacy slugs remain unfilled. Rename transitions start before refetch. The host registers LauncherFavorite; saved pins use the existing legacy admin wiki URL with articleId as stable identity, and launcher display resolves current page data through AtlasSource. Browser titles and shared ID-bearing links now track the saved page. Old slug-only links lack durable aliases. No new service, environment variable or schema.


CRM follow-up (2026-10-07, local source): contact Places lookups now use Places API (New) searchText and details endpoints, header credentials and explicit field masks. Business-name similarity is scored separately from location search context; ambiguity thresholds stay intact. Manual research combines Google Places listing details with OpenAI cited web sources when configured, records one attempt per provider, and shows unavailable/failed providers alongside successful results. Google errors count as failed enrichment rather than Nothing new found, including responses from older deployments. Scheduled enrichment remains Google-only. crm-enrich-contacts was deployed through the user-authorized Lovable chat; server logs verify version 94 live. Lovable sandbox edge-smoke passed all 47 functions and 3 probes; the local command failed to connect throughout. The authenticated Specs Optical research request reached Places API (New) but returned three equally named matches and HTTP 502 without contact changes. OPENAI_API_KEY is not configured, so no OpenAI call ran. One earlier UI preparation click reached the old legacy endpoint and was denied. No further lookup, Google configuration or credential changes were made. Frontend publication and successful combined-provider verification remain pending.


## Doc Studio established runtime — 2026-10-07

The exact established layout is public/ds/studio.html + precompiled studio-logic.js mounted by DocStudioEmbed, separate from the native v2 gateway. Generic shell div radii affect label children, so square labels must explicitly reset descendants. Signatures use inline email tables, hosted signature-logo.png, dual clipboard formats and dependency-free 3x canvas exports. Publish the new PNG asset with the app before external HTML use; clients may block remote images. No new service/connector/environment variable. Port 8081 serves this checkout. See src/features/admin/doc-studio/CONTEXT.md and docs/doc-studio-signature-compatibility.md.

## CRM editor additions (2026-10-07, local source)

Editable company selection and email-list normalization live in `src/features/admin/crm/CompanyCombobox.tsx` and `src/lib/contactEmails.ts`. Save preserves the editor and persisted ERP links; Save & Close closes after the whole pipeline. `PublicWebResearch.tsx` calls manual `mode: research` on `crm-enrich-contacts`, with server-only `OPENAI_API_KEY` and source suggestions. No automatic person-profile writes occur. Innovations remains one-way; salesperson producer mapping and reverse writes are pending. See `docs/crm-contact-editor-follow-up.md` before release or integration changes.

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

- Admin attention alerts mount once inside `AdminTopBar`, beside `NotificationBell`, for both AdminLayout and AtlasAdminFrame. The compact count opens a right-aligned Radix popover; dismissal only closes local presentation state. Existing alert qualification, polling, sound and persisted Snooze are owned by `useOperatorAttentionAlerts`.

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

- Branch reviews must distinguish merge-base diffs from the actual resulting tree: several October feature heads contain equivalent commits already on main. Preserve newer schema/function configuration when reconciling ancestry. `qa:smoke` reads the modular admin router; its Windows server cleanup must terminate only the spawned process tree.

- Doc Studio's preview toolbar uses inline SVG action icons and shared `public/ds/preview-toolbar.css`, loaded by both `studio.html` and the native mount. Keep labels, status and action groups wrapping; do not restore fixed toolbar height or font ligatures for its icons.

- Profile statements and Admin > Finance > Statement Delivery share
  `StatementPrintDocument` for their statement layout. Keep the admin preview
  bound to the selected statement and its `statement_lines_public` rows; keep
  transaction rows and closing blocks intact across print page breaks.

- Doc Studio mounts natively through `DocStudioEmbed.tsx`. Admin grid styles must not reach its presentation tables. Letter header/footer builders serve preview and Word; `ltRule` and `ltSpacing` belong in Studio and Copilot content keys. Letter typography stays fixed while spacing is selectable. Focused command: `npx vitest run --coverage=false src/tests/unit/docStudioLetterhead.test.ts src/tests/unit/managedEmailPayload.test.ts`.

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

- Doc Studio email-health dismissal is local to a tab session (`docstudio-email-health-dismissed`). Polling continues while hidden; status/latest-attempt/rate-limit changes show the banner again. Only attempt identity is stored, without recipient/error text.

## Iris wiki formatting

Atlas parses generated Markdown with unified / remark-parse / remark-gfm into canonical wiki blocks. Iris replies and proposal previews use WikiArticleRenderer; accepting a selection inserts structured Tiptap content and retains marks. Never flatten accepted proposals into a plain string. Existing malformed drafts require a separate approved hosted edit. On Windows, regenerating platform facts and the public search index can resolve CRLF-only drift without a semantic Git diff.
