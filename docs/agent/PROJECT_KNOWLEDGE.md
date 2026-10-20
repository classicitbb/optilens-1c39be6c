# Project Knowledge

## Localhost development data transport — 2026-10-20

`src/lib/supabaseDevTransport.ts` supplies the shared Supabase fetch transport and Doc Studio function base. In Vite development on localhost, 127.0.0.1 or IPv6 loopback it routes configured-project HTTP APIs through `/__supabase`. `scripts/vite-supabase-proxy.ts` fixes the upstream to VITE_SUPABASE_URL, limits paths to Supabase HTTP API families, rejects nonloopback/cross-origin sessions, retains caller auth and verifies TLS using Node plus system roots when available. The real Supabase URL remains the client URL, preserving session storage keys and OAuth configuration. No auth/RLS override. Repro: unauthenticated POST to the local proxy live-data-gateway returns upstream 401, while the original hosted preflight at port 5173 returned Origin not allowed. Focused command: `npx vitest run --coverage=false src/tests/unit/supabaseDevTransport.test.ts src/tests/unit/liveDataGateway.unit.test.ts src/tests/unit/docStudioCloudBridge.test.ts`. Preserve this shared transport when regenerating the extended Supabase client.


## Doc Studio Innovations invoice import — 2026-10-20

`innovationsInvoice.ts` resolves invoice-to-account through statement_lines → statements, or uses the explicitly selected account; customers supplies the current customer name/address. Item details must come from `innovations.customer_invoice` through `requestLiveData`, never statement ledger entries. The native mount exposes the loader to the established studio runtime and aborts on unmount. Import preserves item amounts in BBD, disables additional VAT, resets prior document charges, and labels any source-header/line-total difference as an adjustment without inferring its tax/discount breakdown. Missing line amounts fail without changing the template. `innovationsSourceInvoiceNumber` is saved in content; original invoices retain their source number on explicit save, while quotations keep the existing Doc Studio sequence. No new dependencies, service, env variable, schema or permission. Focused command: `npx vitest run --coverage=false src/tests/unit/docStudioInnovationsInvoice.test.ts`.


## Local dependency recovery — 2026-10-19

If Vite reports a missing import already declared in both package.json and package-lock.json, check `npm ls <package>` before editing source. The stock camera scanner's ZXing packages were absent from node_modules after the camera commit; `npm ci` restored the locked dependencies. On Windows, stop all Vite processes using this checkout (including the standalone stock prototype) before `npm ci`: either can hold the Lightning CSS native module open and cause EPERM unlink. Restore the app with `npm run dev -- --strictPort` and the prototype with `npm exec -- vite --config src/features/rx-order/prototype/vite.config.mjs`. This is local dependency maintenance, with no deployment or schema change.

Stock entry (2026-10-19): AdminRoutes StockOrderEntry redirects fresh /admin/orders/stock-orders visits to /admin/orders/rx/new?type=stock, retaining other query parameters; quote/highlight links keep StockOrderBuilderPage for saved drafts/product tunnels. RxOrderEditPage passes initialOrderType only for new orders and keys by entry mode. ComboBox uses installed Radix Popover portal/anchor, trigger width, collision padding and available-height scrolling. Search/arrow/Enter/Tab/Escape keep input focus. Shared rx-segment styling in index.css supplies explicit light/dark selection. No permission or persistence changes.

## Integrated stock ordering — 2026-10-19

`form/StockServicePanel.tsx` is now the runtime implementation of the approved prototype. It keeps one required patient/order reference (20 chars), optional PO (15), and optional instructions. StockItemBrowser handles both supply and addon/service catalog rows; StockLensBrowser imports actual Rx selectors/catalog logic and the store LensVariantGrid. `useStockLensIdentities` reads existing safe lens identity fields and reference tables/option links; no name-parsed or seeded product selection enters production. Multiple products/diameters sharing a triple need explicit selection; duplicate grid cells fall back to exact-variant lists. Existing stock catalog membership and server pricing govern everything.

`stockOrderModel.ts` maps selling-unit pairs to individual-lens server quantities. Symmetric pairs double quantity; chiral pairs split into right/left items and require both eye OPCs. Single-eye/scanned individual lenses retain their quantities. Pair line limit 49 and individual limit 99 respect the existing server bound. Mixed service items remain ordinary addon items without marking the entire order as a collection request. The Service request menu option is removed while legacy marker helpers remain for compatibility. Account-keyed remounting clears old prices/draft IDs; Rx autosave is suspended in stock mode. No stock autosave is introduced. Review is local; Save draft and Submit explicitly call the existing RPCs. USB/typed scan entry is supported; no camera implementation or hardware proof.

## Isolated stock / supplies prototype — 2026-10-19

Annotation refinement: the default host is the preferred Rx supplies layout with order details directly followed by order lines; the duplicate supplies demonstration card was removed. `prototype/LensPicker.tsx` imports the real Rx `Seg`, `ComboBox`, `comboOptions` and `repairTriple`, plus the store `LensVariantGrid`; no production order hooks are imported. Vision/eyes are segmented controls, the searchable selector works in any order, and the store grid uses its compact descending axes. `LensVariantGrid.addButtonLabel` is an optional presentation prop with the existing store wording as default. Prototype-only Tailwind sources and scoped CSS render these components without the app shell. The prototype imports styles/workspace.css directly for admin tokens, mapped to semantic Rx component colours.

`src/features/rx-order/prototype/` is a standalone Vite root, launched with `npx vite --config src/features/rx-order/prototype/vite.config.mjs`. It has seeded catalogs, one selected layout, customer/admin presentation, shared supplies rendering, gated power matrices, barcode keyboard entry and a simulated slim camera target. No app routes, environment loading, API clients, storage or real order operations are used. The regular app build excludes this entrypoint; standalone build output goes under `node_modules/.cache/stock-order-prototype`. Refresh clears all state. The merged required patient/order reference and per-pair prices are prototype assumptions to review before production integration. See its README for seeded scenarios and limits.

RX stock/supplies ordering shares the existing stock catalog, draft and release hooks with `/admin/orders/stock-orders`; the standalone builder has not been replaced. Runtime pair/eye conversion is described above. `metadata.opc_by_eye` supplies chiral side-specific OPCs. Only item selection and review are modal; identification and lines stay visible.

`useStockOrderCatalog(accountId)` supplies published, account-priced stock lenses, supplies and addon/service products. Patient/name and tracking reference are now merged into one required field; no independent optional patient value is stored in instructions.

Rx sidebar alignment (2026-10-17): AccountLayout uses normal-flow `relative` positioning for the sidebar only on `/profile/rx-order`. The bounded content row is already stationary; inheriting other routes' `sticky top-16` makes its overflow container push the menu down 64px. Other routes keep that sticky offset. Form scrolling remains owned by RxForm.

## Uncut frame supply and Rx introduction — 2026-10-17

`form/types.ts` exports `frameSourceForScope`: uncut jobs use `Uncut`; other scopes preserve a meaningful supplied-by value or default to customer shipping. Default values, job-scope transitions, loaded orders, built orders and folded summaries use that rule. FrameCard renders a disabled Uncut field for uncut jobs and the normal supply selector for full glaze; remote retains its hidden supply field. `PortalRxOrderForm` passes the introduction to RxForm so it scrolls with the form while LensAssistantSection keeps only the fixed page title.

## Portal Rx scroll frame — 2026-10-17

`AccountLayout.tsx` bounds only `/profile/rx-order` to the viewport; `LensAssistantSection.tsx` holds the title above the scrollable RxForm root. Portal toolbar and steps form one sticky group. `form/RxStickyLayout.tsx` uses ResizeObserver for the actual frame/control heights, setting `--rx-controls-height`, `--rx-quote-top`, and `--rx-quote-max-height`. QuotePanel uses those values at `lg` and above, with internal scrolling for long quotes; section jump margins clear the pinned group. Admin falls back to its existing offset and phones retain their fixed total bar. The layout observer never changes form values or initiates saving.

Pricelist education ownership (2026-10-17): `src/data/progressiveProducts.ts` and `photochromicProfiles.ts` are shared by their public guides and `components/account/pricelistEducation.ts`. `PricelistDesignInfo.tsx` owns click/keyboard design popovers with guide links; the assigned grid wraps treatment accordion triggers in tooltips. The pencil is a 10px glyph in a 28px visual button with a 44px pseudo-element hit area; Save/Cancel keep their existing touch sizing. Shared public data stays under `src/data` so the existing search-index generator follows it.

Pricelist tablet/currency ownership (2026-10-17): `RxPricelistCell.tsx` owns compact/tap behavior, `PriceOverrideCell.tsx` increases editor touch targets only with controlsVisible, and `pricelistCurrencies.ts` merges the safe configured-rate RPC with existing indicative EUR/XCD constants. Display conversion uses amount * source BBD-per-unit / target BBD-per-unit; CSV uses numeric converted amounts. Configured rates win, estimates are labelled, transaction currency and business-wide rates remain unchanged.

## My Orders invoice line totals — 2026-10-17

`MyOrdersSection.tsx` uses the same `InvoiceLines` table in lab-order and delivery-invoice dialogs. Total (BBD) adds the displayed line amounts once in integer cents, including credits/zero lines, and shows a dash if any amount is unavailable/non-finite. It is a line sum, not the invoice-header balance. Focused regression command: `npx vitest run --coverage=false src/tests/unit/orderInvoiceLines.test.tsx src/tests/integration/portalMultiAccountAccess.integration.test.ts`.

## Pricelist lens popup and draft handoff — 2026-10-17

The matrix uses `components/account/RxPricelistCell.tsx` for hover/tap/keyboard details, actual Rx picker labels, retail-price editing and a gated Start Rx order action. `pricing/pricelistLenses.ts` resolves each matrix row's selected `lens_id` through confirmed `lens_alias_map` links, preferring its primary alias. It never broadens to other lenses sharing the band. Unresolved or ambiguous mappings remain unavailable; the Rx form's canonical tie-break is retained. The existing catalog hook is queried once for the pricelist, not per cell. `/profile/rx-order?lens=<alias>` seeds a fresh form through `prefill/pricelistLens.ts`; account pricing is loaded normally, never trusted from the link or retail override. Existing saved-order parameters win; absent catalog matches show a notice. The ordinary 1.5-second autosave creates the draft, so browser verification of the live start action needs an approved hosted-draft write.

## Rx/pricelist annotation ownership — 2026-10-17

The active form is `src/features/rx-order/form/RxForm.tsx`. Its portal Print order action mounts `PrintSheet` without explicitly saving; admin Save & print still saves first. Its independent 1.5-second autosave creates a hosted draft from typed live inputs, so use `/admin/orders/rx-test` in Fixtures (no network) mode for synthetic browser checks. `QuotePanel` mounts the client-only gross-margin estimate only when price is visible, ready and fully priced. `AssignedPricelistsSection` owns the teal `secondary` accordion headers and matrix tooltips; the data has no reason code for missing combinations, so tooltip reasons remain conditional.

## Homepage wording ownership — 2026-10-17

`src/components/home/HomePage.tsx` owns section headings and audience-specific introductions. `src/components/home/homeContent.ts` owns `lensExplorer`; `patientLensExplorer` is its first two entries, so category-title edits apply to both homepage views. Keep the existing responsive heading/grid styles for copy edits. Regenerate public search prose with `npm run search:index`, then verify with `npm run qa:search-index`.

## Codex one-click dev preview — 2026-10-13

The project menu action `Dev Preview` is configured in `.codex/environments/environment.toml` to run `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open`. It serves the current worktree, opens the local browser, and does not build or deploy. Port 5173 must be available.

## Atlas standard page width — 2026-10-13

Standard-width Atlas headers and article bodies use `max-w-[920px]` with `sm:px-[5px]`; below `sm`, the existing 24px horizontal inset remains. The authenticated shared-page reader follows the same rule. Full-width page behavior is unchanged. Layout classes are owned by `AtlasWorkspace.tsx`, `components/PageHeader.tsx`, and `components/SharedPageViewer.tsx`.

## Email reply quote — 2026-10-13

`EmailPage.tsx` builds both sanitized HTML and plain-text quotes from the selected message. `ComposeDialog.tsx` previews the HTML in the sandboxed `EmailBody` iframe and `emailHtml.ts` appends it after the response and signature when sending. The current message's embedded prior correspondence survives; separate messages are not fetched as a thread. Inline `cid:` images still lack outgoing attachment rewriting. No bridge API or permission change.
## Email search and ribbon — 2026-10-13

On `/admin/email`, `GlobalSearch.tsx` searches accessible inboxes through the existing authenticated mail bridge `status` / `folders` / `messages?q=` endpoints and places those results ahead of site results. The ribbon's search still targets the selected folder. `EmailPage.tsx` uses a ResizeObserver to keep folder search and Sync on the same ribbon row and expose overflow actions only at narrower widths. No new bridge API, environment variable, permission, or storage path is involved.

## Pricelist readiness email boundary — 2026-10-13

`admin-user-management` invokes `customer-onboarding` to assign the default template pricelist after create/invite. Normal onboarding returns assignment status and never queues the welcome-pricelist email. The template and scoped email-pipeline smoke path remain available, but a customer-facing pricing announcement requires a separate explicit request after the intended list is assigned. The invite email is a distinct Supabase Auth message.

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

## Atlas layout and sharing contract — 2026-10-08 (production release)

Title edits no longer change page identifiers: new UUID slugs, unchanged existing slugs, stable ID fallback for null-slug rows, and separate generated shared-link tokens. AtlasSource owns explicit sharing state and administrator access history. Website route /shared/pages/:token is sign-in-only and read-only; an audited database RPC returns only active published content for an enabled token. Forwarded links work for any registered authenticated account; no recipient assignment or profile listing. Draft, inactive, locked and secret-bearing pages are denied. Existing help_articles policies remain unchanged. The named sharing migration is applied and hosted grants/RLS are verified.

Atlas browser preferences now write synchronously and merge the latest stored snapshot across consumers/tabs. Sidebar keys include user ID and never import ownerless legacy values. Sidebar settings are browser-local; page width uses the prepared nullable full_width column after migration, with browser-local fallback beforehand. Native storage events refresh other tabs. Email confirmation uses getAuthEmailRedirect, which validates same-origin destinations; Auth passes the existing requested route to signUp.

SQL regression command: node scripts/test_atlas_sharing_sql.mjs, using PGlite 0.5.8 installed separately and ATLAS_SQL_TEST_MODULE_PATH for module resolution. It checks actual migration SQL in a minimal isolated PostgreSQL fixture, not the full hosted schema. No new service or credential. The approved Atlas migration/frontend release is complete; target-specific live sharing/signup checks and provider redirect-allowlist verification remain unperformed.


Production release (2026-10-08): Atlas-only commit 7f2b3d0a was built from the previously deployed main commit cab43199 in an isolated release checkout, preserving the original feature branch and its unrelated commits. Vercel preview and production builds reached READY; the custom-domain production alias serves the Atlas release. Only migration 20261008183727_atlas_shared_pages.sql was applied and recorded in migration history. Hosted metadata confirms nullable boolean full_width, RLS on both new tables, fixed-search-path definer functions, authenticated execution only, no anonymous table reads or direct authenticated writes, and unchanged help_articles policies. No Edge Function source/config changed, no all-functions deployment or email smoke was triggered, and no page sharing was enabled. The sharing and access tables remain empty.

Hosted browser checks: the existing signed-in account opens Atlas and a published page; Share loads explicit Enable sharing and an empty Recent access table without a write. An unassigned token returns unavailable without content or an audit row. Sidebar resize from 244 to 260 pixels survives a reload; the original 244-pixel preference was restored. Local release-checkout validation passes 111 focused Atlas/routing/auth tests, 41 isolated PostgreSQL checks, TypeScript, lint (0 errors), build, qa:smoke and qa:pr-checks. Generated-file checks required CRLF normalization with no semantic source diff. The earlier full-suite snapshot has one unrelated unchanged Copilot source-string assertion failure; no full-suite pass is claimed.

## Iris visitor conversations — 2026-10-09 (production release)

Public starter prompts now give contextual frame/coating/policy guidance and a relevant follow-up instead of account counts or weak product matches. Account lookup requires a record-specific intent; sign-in alone does not identify a public visitor as a dispenser. Generated answers are included in subsequent conversation context. The lens guide retains audience and supplies use-specific education, prescription/measurement limits and retailer links without promising an automated prescription match. Search the site uses the existing grounded companion-assistant path; legacy web action types remain compatible but no longer call the retrieval-free, 400-character companion-web-search endpoint. No new service, environment variable, schema or authorization change. User approved publication; main commit 631870c6 reached Vercel READY and the custom-domain production aliases. Live browser confirms contextual starters, guide, site-search scope and a generated frame conversation with a simplified follow-up. Generated replies can still add unrequested product suggestions and citation-number mismatches; the server endpoint was not changed.

## Portal support sends — 2026-10-09 (local source)

CustomerOrdersPanel life-buoy questions use the signed-in staff owner and the selected contact as partner_contact_id; notification now defaults on. Person/company audience rules remain unchanged. Ticket creation writes helpdesk_tickets directly, followed by a timeline event; helpdesk-email handles optional staff-to-contact notifications. A failed event or notification must not turn a persisted ticket into a failed submission or encourage duplicate creation. Notification errors and skipped recipients now warn visibly. Iris retains failed request drafts, exposes submissionError inline and guards concurrent form sends. Both forms use mobile input text and 44px send controls; the admin dialog bounds height with dynamic viewport units and scrolls.

Hosted read-only inspection confirms ticket/event grants and RLS allow existing staff and eligible self-owned portal creation. No schema, authorization, Edge Function or environment-variable change. The exact original production failure remains unconfirmed without a named approved send; frontend release and actual email delivery still require approval.
