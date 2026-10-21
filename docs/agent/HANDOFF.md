## 2026-10-20 - Alert bell, stock refresh and portal loading

Status: Source complete - comparative timing and audible multi-tab verification pending.

Implemented shared two-note ding dong, six-second cross-tab cooldown and bounded event receipts (Web Locks/storage election fallback), gesture audio unlock, mute/test controls, new-notification detection and batched attention sounds. Stock checks run every eight hours while mounted plus mount/focus/reconnect. Portal list overlaps independent reads, caches for one minute and defers order/address/payment reads until account selection. No deployment, hosted data, access rule or credential change. Existing local documentation edits were preserved.

Affected: NotificationBell.tsx; notifications/alertSound.ts and useOperatorAttentionAlerts.ts; helpdesk useHelpdeskTicketAlerts.ts compatibility export; useAdminUsers/useProductVariants/useOrders/useCustomerAddresses/useCustomerPaymentMethods hooks; WebsitePortalsPage.tsx; five new test files; continuity docs.

Validation: portalLoadingPerformance test failed before parallelization and passes after it. Final focused verification: 20 tests across seven files pass, including delayed duplicate notification delivery across independent tab instances. Application TypeScript (`npx tsc --noEmit -p tsconfig.app.json`), build and scoped ESLint pass. Full `npm run test -- --runInBand`: 264 passed / 3 failed files, 1700 passed / 12 failed tests: ten Rx workspace QueryClientProvider cases, emailRecipientInput CRM options and OAuth rewrite. Full lint retains one existing RxOrdersWorkspace.tsx:89 preserve-caught-error error. PR checks pass lockfile policy and documentation symmetry, then stop on pre-existing generated Copilot platform facts drift. Logs: ignored `.codex-alert-*.log`.

Browser: the exact annotated ZenVue product grid renders with real data and quantity cells; no cart/save action. Initial admin page hung then redirected to /profile; a subsequent existing-session tab rendered the admin list with Approved 135 / Active 88 / All 145. Opened the bell popover and exercised Test ding dong; controls render correctly and a preview is saved in the task visualization folder. No 5-10x timing or actual audible cross-tab claim is made. Independent tab module/lock/storage behavior and eight-hour refresh are tested synthetically. Closed browsers cannot run schedules; timers can throttle.

Approval required only for future production publishing under AGENTS.md. Exact executable next action: `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` (reuse the existing server when already running), then compare first-load/revisit timing against a recorded baseline and verify audible Test ding dong across two tabs. Do not change authentication or hosted records for verification.

## 2026-10-20 — Local build and dev recovery

Status: Complete — no active handoff

Reproduced `npm run build` failing to resolve `@zxing/browser` from StockCameraScanner.tsx. `npm ls @zxing/browser @zxing/library --depth=0` confirmed both declared, locked packages were missing from node_modules. No Vite process held this checkout open. Selected installed Node 22.23.2/npm 10.9.8 with session-local PATH precedence, avoiding the roaming npm 12 shim; the runtime check passes. `npm ci --no-audit --no-fund` restored 822 packages with no manifest/lockfile delta. Application source was not changed. Updated only STATUS.md, PROJECT_KNOWLEDGE.md and this handoff.

Production build passes. Dev remains running at http://127.0.0.1:5173/ via `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`. Homepage and scanner-module HTTP checks return 200. The in-app browser is unavailable; connected Edge rendered the public homepage and captured no console errors. No authenticated transaction, hosted configuration, publication or deployment was attempted.

Full test command completed: 260 passed / 3 failed files; 1,691 passed / 12 failed tests. Remaining failures are the existing ten Rx workspace QueryClientProvider cases, one Chemistrie prefill timeout, and OAuth rewrite assertion. PR checks pass lockfile policy/documentation symmetry then stop at pre-existing generated Copilot facts drift. Build retains non-fatal native-config/chunk-size warnings. Full lint completed with one pre-existing RxOrdersWorkspace.tsx:89 preserve-caught-error error and 2,438 warnings. Validation logs are ignored `.codex-build-*.log` files. No approval or continuation is required for the requested local build/dev recovery; preserve other tasks' pending approval entries below.

## Portal operations controls — 2026-10-20

Status: Source complete; new-account default migration and rendered verification pending.

User authorized commit and push and selected new accounts only for disabled defaults. Affected: WebsitePortalsPage.tsx, portalFeatureToggleValue.ts, portalFeatureToggleValue.test.ts, 20261020214927_new_portal_features_disabled.sql, STATUS.md, PROJECT_KNOWLEDGE.md, INTEGRATIONS.md and this handoff. Existing accounts are untouched. Production migration apply needs explicit approval under AGENTS.md; no hosted setting or schema was written. Browser getState timed out, so no rendered verification or live toggles were attempted. Validation: production build, TypeScript, scoped lint (0 errors), 21 focused tests and qa:pr-checks pass. Full lint has the pre-existing RxOrdersWorkspace.tsx:89 preserve-caught-error failure (1 error, 2433 warnings). Full npm run test -- --runInBand completed: 257 passed / 4 failed files, 1664 passed / 14 failed tests. Failures are untouched rxFormChemistrie (2 timeouts), rxOrdersWorkspace (10 cases), emailRecipientInput (missing CRM option), and vercelOAuth (existing rewrite contract). Focused new tests pass separately. New trigger SQL has not been executed against a database. Approval required: apply only the named new-profile default migration; no automatic migration apply or Edge Function release is part of this push. Next executable read-only action: git show --stat HEAD

## Finished ZenVue progressive — stock export pricelist (2026-10-20)

Status: Incomplete — browser connection blocked.

User requests adding the finished ZenVue progressive to the export pricelist, specifically its Stock Lens Prices list. No source or hosted price/catalogue records changed. Source inspection confirms StockLensPricesPage uses ListCatalogTab with catalogType=stock and lensFilter=wspl; stock exports use that catalogue. Browser getTab and getState both timed out before returning any UI. No lens identity, target version, or existing selling price was verified; do not invent prices. Tests: none (no implementation change). Approval: prepare the exact row and price for review before the production data save, per project rules. Next executable action: await cua.getState(); then inspect the export version Stock Lens Prices / WSPL Stock List and locate the existing finished ZenVue progressive entry.

## 2026-10-20 — Doc Studio dashboard shortcuts and square surfaces

Status: Complete — no active handoff

Dashboard Doc Studio now shows four direct section links in that signed-in user's browser-local recent order, with the existing more link for the remaining tools. The tile title also opens the last-used section. navigation.ts owns the allowlisted tab/billType URLs on /admin/docs/studio; no new routes or permission changes. The established runtime consumes section queries without autosaving a billing type conversion over the current saved file; billingDocument/staffInvite handoffs take precedence. A mount-scoped navigation listener updates the query and per-user module recency, with cleanup at unmount. No document data is stored in the recency key.

All annotated Studio outer surfaces use border-radius:0 through semantic template classes and scoped native CSS, including the tab bar, left controls/container, preview toolbar/canvas, page/banner wrappers and workspace frames. The selected shared admin top bar is square everywhere AdminTopBar is used. No new breakpoint; these structural overrides apply across viewport sizes. Inputs/buttons/paper content retain existing styling; a browser check confirmed the input radius remains 8px while visible outer panels are 0px. The global admin radius token remains 4px.

Affected implementation: AdminDashboardHomePage.tsx, feature navigation.ts, DocStudioEmbed.tsx, DocStudioPage.tsx, AdminTopBar.tsx, src/index.css, public/ds/studio.html and studio-logic.js. Added docStudioNavigation.test.ts. Documentation symmetry and release-ledger synchronization generated version 0.17.0; package/package-lock were synchronized without dependency changes.

Verification: 26 focused tests across five Doc Studio files pass; scoped ESLint has zero errors/three warnings. TypeScript passed for the implementation. Production build, PR checks and route smoke passed. Full lint retains the unrelated RxOrdersWorkspace.tsx:89 preserve-caught-error error (one error total). Full npm run test -- --runInBand reported failures in rxOrdersWorkspace plus Rx Chemistrie, shape and domain suites, then stopped progressing; it was interrupted without changing those unrelated features. See ignored .codex-studio-full-tests.log for the observed failing cases, not a complete suite verdict.

Authenticated browser at 1320x900: dashboard Invoice and Letterhead buttons opened their exact views, section query state was visible in the URL, and computed styles confirmed square outer containers. Review ran in a separate tab to preserve the user's active Studio work. The health banner was dismissed in the active session, so its square wrapper was checked through source ownership rather than changing that preference. Screenshots are saved in the task visualization folder. Verification navigated sections only and invoked no Save, Send, order, production publication, schema or credential/access operation.

No local continuation is required. Existing loopback server remains on port 5173. Production publication still requires approval under AGENTS.md.

## 2026-10-20 — Iris take-message webhook

Status: Awaiting approval — production deploy and secret

- Files: `supabase/functions/iris-take-message/index.ts`, `supabase/config.toml`, `scripts/edge_functions_smoke.mjs`.
- Tests run: none in this session (no deno available). The originating session reported `deno check` clean and local 405/401/400 probes. No hosted call or ticket created. `supabase/functions/deno.lock` from that patch was not carried over.
- Approval required: production Edge Function deploy (merging to main triggers the all-functions deploy and email smoke) and setting the `IRIS_WEBHOOK_SECRET` Supabase secret.
- Next action: after approval, set `IRIS_WEBHOOK_SECRET`, deploy, run `npm run qa:edge-smoke`, then point the Telnyx `take-message` tool at `/functions/v1/iris-take-message` with header `X-Iris-Secret`.
## 2026-10-20 — Doc Studio invoice import and localhost data access

Status: Complete — no active handoff

Invoice and Quotation import by Innovations invoice number through the existing account-scoped live gateway. Statement references resolve the customer automatically when available; otherwise select the customer. Missing item amounts and invoice/account mismatches preserve the current template. Source amounts are imported without double VAT; any header/line difference is explicitly labelled without guessing its tax breakdown. Import fills a separate local draft and cancels pending billing autosave. Source provenance persists; explicit invoice saves retain the Innovations number, while quotations keep the existing sequence.

Localhost transport root cause and repair: hosted gateway OPTIONS from http://127.0.0.1:5173 returned 403 Origin not allowed; the already-listed localhost:8081 origin returned 200. Node also lacked the installed system CA by default. Vite now offers a fixed-upstream, loopback-only same-origin Supabase HTTP proxy, with normal TLS verification using trusted Node/system roots and unchanged bearer/apikey forwarding. The real Supabase URL/session keys, hosted JWT/roles/RLS and account restrictions are unchanged. Shared HTTP queries, auth/storage/functions and Doc Studio use the proxy in development on localhost/127.0.0.1/IPv6 loopback at any port. Realtime remains direct. Production builds retain direct transport. No new environment variable, privileged credential, hosted function/auth/schema change or production deployment.

Affected implementation: public/ds/studio.html, studio-logic.js and cloud-bridge.js; DocStudioEmbed.tsx and new innovationsInvoice.ts; shared Supabase client plus new supabaseDevTransport.ts; vite.config.ts plus scripts/vite-supabase-proxy.ts. Focused regression tests cover mapping, source totals/credits, missing prices, concurrent edits, read-only files, source-number saves, account resolution, proxy host/origin restrictions, HTTP semantics and token/cancellation retention. Required documentation/release-ledger updates generated version 0.16.0; package-lock version was synchronized without dependency changes.

Validation: 35 focused tests across eight files pass; TypeScript app and Node configs pass; scoped ESLint has zero errors and one existing ref warning. Original full lint has one unrelated RxOrdersWorkspace.tsx:89 preserve-caught-error error; full npm run test -- --runInBand reported ten Rx Orders workspace failures and stopped progressing, so was interrupted. Focused reproduction confirms all ten fail with No QueryClient set, use QueryClientProvider to set one from useReleaseStockOrder. No unrelated Rx repair was made. Final production build and PR checks passed; live database audits were skipped without service credentials.

Authenticated local browser: live invoice 81799 imported into both Invoice and Quotation with all five private item lines, current customer address, date and source notes; its authoritative zero total was preserved. Another invoice/customer mismatch returned Invoice was not found for this customer and left the template intact. The signed-in customer/files reads work through the development transport. Unauthenticated proxy requests from both localhost and 127.0.0.1 return the upstream 401, proving authentication remains required. No explicit document Save, invoice writeback, email, order submission, credential/access change or production publication was performed. The imported quotation remains locally editable for review; the development server remains on port 5173. A live-data gateway request uses its normal transient queue/audit records, not an invoice/customer financial write.

No continuation is required for local use. Production publication remains a separate approval under AGENTS.md. Review action: npm run dev -- --host 127.0.0.1 --port 5173, then /admin/docs/studio (reuse the running server rather than starting a duplicate).

## 2026-10-19 - Stock entry and selector visibility

Status: Complete — no active handoff

Fresh stock-orders links redirect to the canonical Rx form in stock mode. Saved quote/product-highlight links retain the existing stock editor. Shared ComboBox now uses the existing Radix portal/anchor with collision handling and available-height scrolling. Shared Seg has distinct selected fills in both themes. No permission or persistence changes.

Authenticated local browser verified material/design/colour narrowing, power grid, and one 0.00/0.00 pair added locally then removed. Both themes, multifocal/right-eye toggles and menus extending beyond the modal scroller were checked. Original dark theme restored. No reference entered, hosted draft/order saved/submitted or production deployment. This supersedes the old stock/supplies visual-verification continuation below.

Validation: 27 focused tests, full lint (0 errors / 2,423 warnings), build and route smoke passed. Final full suite: 1,620 tests pass across 253 files; TypeScript and final build pass. Repeated focused suite: 27 pass. Route smoke passes. Final diff whitespace check passes. PR checks pass after documentation symmetry and generated release-ledger synchronization. The ledger generated version 0.15.0; npm synchronized package.json/package-lock.json with no dependency changes. Live database audit was skipped without credentials.

## 2026-10-19 — Runtime stock / supplies integration

Status: Complete — no active handoff

The user approved replacing the admin new-Rx page's stock panel. StockServicePanel now implements the selected compact form using the account catalog/save/release hooks; new StockItemBrowser and StockLensBrowser supply the category and Rx-style lens dialogs. Services are catalog addon items, not a separate menu choice or global collection marker. Account-key remount resets local lines/submission ID; switching to stock mode cancels parent Rx autosave. New stockOrderModel converts pair selling units to individual server lens quantities, splitting chiral pairs to right/left. Both eye codes are required; symmetric pairs double quantity. Limits match the existing server contract. No price is accepted from the browser by the save RPC.

Existing safe lens identities/reference names/linked options drive the selectors; duplicate product triples/diameters require a further choice and duplicate grid cells fall back to exact variant lists. No hard-coded lens parsing or seed data enters runtime. Barcode entry supports USB/typed SKU/OPC; ambiguous chiral generic codes require the lens browser/eye-specific code. Camera remains unimplemented. Supply category IDs resolve through the existing reference reader. No auth, migration, service or environment changes.

Browser on the existing authenticated admin page verified the replacement, only two menu options, real Retail material/design/option choices, grid and one local pair line at the account estimate. The local test line was removed without entering a reference or clicking Save/Submit. Supplies loaded from the real account catalog. No production deployment or hosted order/draft write was performed. Initial 13 focused tests passed; final TypeScript/lint/full-suite/build results follow after checks. Actual save/release is covered by mocks, not a real lab transaction.

Final validation: TypeScript passes. Full lint passes with zero errors / 2,423 warnings; scoped edited-source lint passes with existing warnings only. Final 15 focused tests pass (stock selling-unit conversion, service item flow, reference/review persistence boundaries, failed save preventing release, account-catalog scan refusal, ambiguous chiral scan refusal, and shared grid). Full suite: 1,618 pass / 1 fails, the untouched emailRecipientInput multi-address suggestion test missing role=option; isolated rerun passes all five email tests. No email source was changed. Final app build and diff whitespace checks pass. PR checks pass with normal documentation symmetry (the temporary prototype exception file was removed). Release notes/manifest were regenerated and reviewed for the local-source entry; the generated version is 0.14.0 and npm updated package.json/package-lock.json together, with no dependency changes. No wiki reader source or navigation changed; generated wiki validation passes. Hosted DB audit remains skipped without credentials. Camera and physical scanner hardware remain unverified; USB/typed entry is implemented. No live save/release transaction or production publication occurred. Existing standalone StockOrderBuilderPage edits from before this task remain intact.

## 2026-10-19 — Isolated stock / supplies prototype

Header-removal follow-up: removed the whole branding/demo-controls header and complete account/title/subtitle/badge row from main.js. Only the prototype banner precedes the compact identification fields. The seeded full-catalog account remains the default; account/view selection is no longer exposed in the form. Browser confirms the requested removals and unchanged order-line controls. JavaScript syntax and standalone build pass. No live form, order or deployment change. Status: Complete — no active handoff.

Selected-layout/token follow-up supersedes the layout-variant descriptions below: only the chosen Rx supplies preview layout remains. main.js deletes alternate layout renderers/state, preview tabs, step controls, switcher and arrow handling; old variant parameters are cleaned from the URL. Identification now contains only labelled reference/PO/instructions fields, on one row at desktop widths and wrapping below 900/600px. shared-ui.css imports the actual styles/workspace.css; body uses ws-admin/admin-tool and semantic Rx component colours resolve to workspace tokens. style.css and refinements.css use those tokens for surfaces, borders, focus, typography and controls. Font assets come from existing installed Plus Jakarta Sans and JetBrains Mono packages. No new dependencies, production routes, API clients or data operations. README/current context descriptions updated. Status: Complete — no active handoff.

Selected-layout validation: full lint passes with zero errors / 2,425 warnings; all 1,611 tests across 251 files pass. App build, final standalone build, JavaScript syntax, scoped lint, diff whitespace and PR checks pass. The documented local-prototype doc-symmetry exception remains in use; no live database audit ran. Browser verified no identification heading or layout controls, 90px desktop identification height, 36px Rx control height, imported admin font/background tokens, barcode addition and themed lens dialog. At an emulated 390px width, fields form one column and document scrollWidth equals 390px (no page overflow). Emulation was restored and only the temporary check tab was closed; the user's existing prototype tabs remain. Final screenshot is chat-local. No deployment or live order action.

Annotation follow-up: preferred Rx-preview host is default; duplicate demonstration card removed. Actual Rx Seg/ComboBox and comboOptions/repairTriple are reused in `prototype/LensPicker.tsx`. Actual store LensVariantGrid provides compact descending axes, rounded cells, quantity selection and Clear grid; the new optional addButtonLabel prop only changes prototype wording. Source alias/Tailwind configuration is standalone; environment loading remains disabled and seeded add callbacks remain in memory. Production imports in the browser bundle exclude Supabase clients. The earlier no-application-import description means no shell/services; these shared UI/pure imports are intentional. README and frontend continuity docs updated.

Browser follow-up verified toggles, colour-first narrowing to 1.56 Resin, design-first progressive selection, gated matrix, compact grid styling, Clear grid, and right-eye power additions mapping to the correct base/ADD order lines. The retained supplies browser was rechecked. No camera, live pricing, cart or order action occurred. Final validation: TypeScript and scoped lint pass; full lint passes with zero errors (2,426 warnings before splitting the prototype mount helper; final scoped lint clears the new Fast Refresh warning). App and standalone builds, all 1,611 existing tests, five focused grid/catalog tests, PR checks and diff whitespace checks pass. The same documented local-prototype doc-symmetry exception is used; hosted database audit remains skipped. Final source also adds `prototype/lensPickerMount.ts`, `shared-ui.css` and `refinements.css`; no dependency or lockfile changes.

Status: Complete — no active handoff

Deliverable: `src/features/rx-order/prototype/` contains a separate Vite entrypoint, seeded data/UI, styles, local font/license and README. Run `npx vite --config src/features/rx-order/prototype/vite.config.mjs` from the repo root. No application route or production form was changed by this task; preserve the pre-existing edits in StockServicePanel.tsx and StockOrderBuilderPage.tsx. No API, environment file, persistence or production release hooks enter the prototype. The selected Rx supplies layout uses one in-memory state and the shared supplies browser; earlier A/B/C alternatives and host tabs have been removed.

Browser verified: supplies addition, delayed lens-grid appearance after all three selectors, two pairs at 25.20/lens = 100.80, mixed-order total 107.24, required reference blocking review, review payload and simulated sync, slim simulated scanner, supplies-only button visibility, no-catalog state, alternate layouts, customer presentation and Rx supplies preview. Refresh clears state. Camera capture and hardware scanning are not implemented or hardware-tested. Prices and account assignments are illustrative; production integration must validate real variant availability, selling units, pair/eye mapping and account pricing using the existing server contract. The optional price-to-empty-line-reference behavior is simulated payload-only and off by default.

Validation: JavaScript syntax and scoped ESLint pass; standalone prototype build and regular application build pass. Full lint passes with 0 errors / 2,425 warnings. `npm run test -- --runInBand` passes all 1,611 tests across 251 files. No throwaway-code tests added. No production, customer-data, authorization, credential, connector or order action occurred. The user selected the Rx supplies layout. Production integration remains future scope, outside this local prototype delivery.

Final PR checks pass. Documentation symmetry uses the documented local-prototype exception in `docs/bugs/stock-prototype-doc-symmetry-exception.md` to avoid creating a production release entry for this unpublished study; the other frontend and continuity docs are updated. The release-ledger sync was run and reviewed: no manifest, wiki or generated release-note delta remains. Hosted database audit was skipped by the existing check without credentials. Final browser also verified the progressive base-curve/ADD matrix with Right only: two lenses at 45.00 = 90.00, and barcode keyboard entry added the seeded cleaner. The baseline A tab is left open with a sample customer order. Camera permission was never requested.

## 2026-10-17 — Rx sidebar alignment

Status: Complete — no active handoff

Source change: AccountLayout.tsx makes the sidebar `relative` only on `/profile/rx-order`, retaining `sticky top-16` elsewhere. The bounded Rx content row was the sticky containing block, so the inherited top offset pushed the menu down 64px. The form retains its independent scroll container; no frame size, sticky form control, data, authorization, or persistence change.

Browser compared the existing Saved Drafts page with a temporary blank Rx tab at 2099x1260. Both menus begin at the same usual height beneath the account header. The blank form retained Order dash and empty values, with no field entry or save. Saved a chat-local screenshot and closed only the temporary tab; the original user tab was left open. No draft creation, order submission, or deployment was performed. This check verifies menu placement; the blank form had insufficient content for a long-scroll test.

Validation: build and diff whitespace checks pass. Full lint: 0 errors / 2,424 existing warnings. `npm run test -- --runInBand`: 1,609 passed / 2 failed tests (249 passed / 2 failed files), retaining the unrelated adminResourceColumns KNOWN_BROKEN mismatch and Atlas 720px versus 920px assertion. PR checks pass lockfile policy and doc symmetry, then stop at the existing generated Copilot facts drift; later gates did not run. No new test was added for the single route-specific positioning class.

## 2026-10-17 — Uncut frame supply and scrolling introduction

Status: Complete — no active handoff

Affected: form/{types,useRxOrderForm,model,Summary,RxForm}.ts(x), cards/PatientFrameCards.tsx, PortalRxOrderForm.tsx, LensAssistantSection.tsx, rxFormReact.integration.test.tsx and frontend/continuity docs. Uncut jobs use a disabled Uncut source display and normalize default/load/save/summary source through frameSourceForScope. Scope changes restore the standard source for Full glaze; existing non-Uncut selections remain. Remote retains its previous hidden-field behavior. The introduction is now a host prop rendered inside the form scroller, while the page title remains fixed.

Verification: two new regression cases were red before repair. Final focused observer/form/portal suite: 29 tests pass; TypeScript, final build and diff whitespace checks pass. Full lint: 0 errors / 2,424 existing warnings. Full tests before the final summary-display refinement: 1,609 passed / 2 failed tests (249 passed / 2 failed files), retaining only adminResourceColumns' stale description KNOWN_BROKEN entry and Atlas's expected 720px versus current 920px assertion. The summary refinement then passed the focused suite/build.

Browser: the no-write /dev/rx-order fixture verified disabled Uncut, editable Full glaze, and switching back to Uncut; synthetic PREVIEW ONLY names stayed in the fixture. Closed that temporary tab. On the existing portal tab, scrolling verified introduction visible at the top and absent after scroll while the title stays fixed. The user changed the live draft during the session; no synthetic live input, save/submit click, or production deployment was performed by this change. Existing autosave remains independent. Screenshots are chat-local artifacts.

PR checks pass lockfile policy and doc symmetry, then stop on the existing stale generated Copilot facts; later gates did not run. Final scoped lint: 0 errors / 8 existing warnings.

## 2026-10-17 — Portal Rx scroll frame

Status: Complete — no active handoff

Affected: AccountLayout.tsx, sections/LensAssistantSection.tsx, form/{RxForm,RxStickyLayout,QuotePanel,ui}.tsx, rxStickyLayout.test.tsx, portal/Rx CONTEXT and frontend/continuity docs. Only the portal Rx route becomes a viewport-bounded flex frame. The page title is outside the form scroller; the existing form root scrolls. Toolbar and steps pin as one group. ResizeObserver measures wrapping controls/frame size and sets quote top/max-height plus jump offsets. Desktop quote overflow scrolls internally; its height subtracts bottom padding to prevent upward displacement near the form end. The existing phone total/submit bar and admin scroll host remain.

Browser: inspected the existing live form at 2099x1260, scrolled to its bottom and checked the pinned title/toolbar/steps and fully visible quote. No synthetic field input, retail Save, submit, or deployment. Existing draft autosave activity was visible during live hot refresh, so this does not establish zero existing-draft writes. No new order was submitted. Scroll proof is a chat-local screenshot. Mobile viewport and admin host were not visually checked in this turn.

Validation: 27 focused observer/form/portal tests pass, including control wrapping/frame resizing, bottom-padding clearance, height clamping and observer cleanup. TypeScript, build and diff whitespace checks pass. Full lint: 0 errors / 2,424 existing warnings. `npm run test -- --runInBand`: 1,607 passed / 2 failed tests (249 passed / 2 failed files); untouched failures are the adminResourceColumns description KNOWN_BROKEN mismatch and Atlas expected 720px versus current 920px. PR checks pass lockfile policy and doc symmetry, then stop at the existing stale generated Copilot facts; later gates did not run.

## 2026-10-17 - Pricelist education annotations

Status: Complete — no active handoff

Local source: retail pencil glyph is 10px in a 28px visible button with a 44px pseudo-element hit area; Save/Cancel retain their existing sizing. Design names open keyboard-accessible popovers with distinctions and links to existing public guides. Treatment accordion headings have hover/focus tooltips. Progressive and photochromic definitions moved without dropping content into `src/data/progressiveProducts.ts` and `photochromicProfiles.ts`, shared with their public pages and `components/account/pricelistEducation.ts`. The XTRActive Polarized summary is plain English in both places. Other categories use concise summaries and existing guide links; unknown keys retain plain labels. Public search prose regenerated and checked.

Affected source: PriceOverrideCell.tsx, AssignedPricelistsSection.tsx, new PricelistDesignInfo.tsx/pricelistEducation.ts, the two public guide pages/shared data files, generated public index, new pricelistEducation.test.tsx and frontend/continuity docs. Existing parent-thread edits preserved. No pricing, account setting, retail Save, order/draft, backend, authorization or publication action.

Verification: separate side-chat browser tab inspected the Progressive - Best popover/guide link, visible XTRActive Polarized tooltip on keyboard focus, and smaller pencil. Screenshots saved as side-chat artifacts. No main-thread tab was controlled. Focused tests: 15 passed, including open/Escape, guide link, shared source and existing Rx popup tests. TypeScript, final build, search-index and diff whitespace checks pass. Full lint: 0 errors / 2,424 existing warnings; scoped lint: 0 errors / 10 existing warnings. Full-suite snapshot before final small data-location/pencil refinements and the new education tests: 1,603 passed / 2 failed (247 passed / 2 failed files), retaining the untouched adminResourceColumns KNOWN_BROKEN mismatch and Atlas 720px/920px expectation. Final focused tests and build pass after refinements. PR checks pass lockfile policy/doc symmetry, then stop at existing Copilot facts drift; later gates did not run.

## 2026-10-17 - Compact tablet popup and display currencies

Status: Complete — no active handoff

Explicit annotation request in the side conversation: reduce popup size, support touch/tablet interaction, add EUR and Eastern Caribbean dollar (XCD) display. Local changes are limited to RxPricelistCell, PriceOverrideCell, AssignedPricelistsSection, new pricelistCurrencies helper, focused tests and continuity/frontend docs. Existing selected-lens resolution and concurrent work are preserved.

Popup: 320px maximum width with the existing 16px viewport gutter, compact two-column lens details, shorter copy, 44px targets, explicit Close, mouse-only hover, and pinned tap behavior (second tap/outside/Escape/Close dismiss). Currency picker/options use 44px targets and toolbar wraps. Hardware touch was not exercised; pointer/tap behavior is regression-tested.

Currency: configured RPC rates remain authoritative. Existing Rx indicative EUR/XCD constants fill missing display options and are labelled as estimates in picker/page/popup. Retail overrides convert from their stored currency into the selected display currency; missing source rates do not invent a conversion. Euro and EC-dollar symbols are formatted correctly; CSV values remain numeric. No backend/migration/global FX write, checkout/transaction currency change or live rate feed. Browser used a separate temporary tab, preserving the user's tab; its existing XCD preference rendered correctly, and all four menu choices were inspected without saving a currency preference, retail price or Rx draft.

Validation: 26 focused currency/popup/Rx-currency tests pass. TypeScript and final build pass. Full lint: 0 errors / 2,424 existing warnings; scoped lint: 0 errors / 10 existing warnings. Full suite before final small display/export refinements: 1,603 passed / 2 failed (247 passed / 2 failed files), retaining only the existing adminResourceColumns KNOWN_BROKEN mismatch and Atlas 720px/920px assertion. Final focused checks and build were repeated after those refinements. Browser at 1280x720 shows the compact popup and BBD/USD/EUR/XCD choices. Screenshots are side-chat artifacts. No publication performed.

PR checks pass lockfile policy and documentation symmetry, then stop at the pre-existing stale Copilot platform facts file; later gates did not run. Final diff whitespace check passes. No unrelated generated file was changed.

## 2026-10-17 — Pricelist selected-lens correction

Status: Complete — no active handoff

Supersedes the earlier multi-choice price-band popup behavior below. The cause was grouping all catalog aliases by treatment/category/index while ignoring the editor's selected `lens_id`; colour-only classification also admitted polarized/photochromic material names into Clear. Resolution now starts from the assigned matrix row and its confirmed `lens_alias_map` primary, or a sole unambiguous confirmed selection. No broad price-band fallback. Stale/missing/ambiguous links cannot start a guessed lens. The existing Rx form canonical alias tie-break and price calculation are unchanged.

Affected: AssignedPricelistsSection.tsx, useInnovationsCatalog.ts, pricing/pricelistLenses.ts, pricelistLenses.unit.test.ts, Rx CONTEXT and frontend/continuity docs. The new read is limited to confirmed mappings for IDs returned by the assigned matrix RPC, with bounded batches/pagination and existing RLS. No migration, permission change, data write, draft creation, order submission, retail Save or deployment.

Evidence: a failing focused regression initially reproduced extraneous polarized/photochromic choices in a Clear cell. Read-only connected SQL confirmed the editor-selected Clear / Progressive - Best / 1.50 lens has one confirmed primary alias. The authenticated local browser now shows Plastic 1.50 / Progressive - Endless Steady / SRCoated alone, no selector, and an enabled Start Rx order control; the control was not clicked. Screenshot saved as a chat-local artifact.

Validation: 21 focused mapping/popup tests, TypeScript, final build and diff whitespace checks pass. Final full `npm run test -- --runInBand`: 1,597 passed / 2 failed tests (246 passed / 2 failed files), retaining only the unrelated adminResourceColumns KNOWN_BROKEN mismatch and Atlas 720px versus 920px assertion. PR checks pass lockfile/doc symmetry, then stop on pre-existing generated Copilot facts drift. Later gates did not run. An intermediate missing closing brace was corrected before final TypeScript/build/browser/full-test verification; no intermediate failing check is claimed as a pass.

Final lint: 0 errors / 2,424 existing warnings; scoped mapping/hook/section/test lint: 0 errors / 14 existing warnings. No temporary debug instrumentation or fixture page remains.

## 2026-10-17 — My Orders invoice line totals

Status: Complete — no active handoff

Affected: `src/components/account/sections/MyOrdersSection.tsx`, `src/tests/unit/orderInvoiceLines.test.tsx`, portal context and frontend/continuity docs. Both lab-order and delivery-invoice dialogs share a Total (BBD) table footer. It sums displayed two-decimal extended line amounts once in cents, including credits/zero lines; any unavailable/non-finite amount leaves the total unavailable. Empty/loading/error states retain their existing behavior. No new connector, fetch, schema, data write, permission, or deployment.

Browser: the authenticated local My Orders page shows the annotated Rx example's $900.00 total and invoice #92651's $280.00 total; screenshots inspected and saved as chat-local artifacts. Only existing invoice reads were performed. Existing responsive container and table classes remain unchanged.

Validation: final focused invoice/multi-account suite passes 17 tests; final scoped ESLint has 0 errors/warnings; final build and diff whitespace checks pass. Full lint has 0 errors / 2,424 warnings. The full `npm run test -- --runInBand` run passes 1,592 tests with 2 unrelated failures (246 passed / 2 failed files): adminResourceColumns retains a fixed description column in KNOWN_BROKEN; atlasSharedPageViewer expects 720px instead of the current 920px. The final displayed-rounding refinement was then verified by the focused suite/build. Production publication is not performed.

PR checks: lockfile policy and documentation symmetry pass; `npm run qa:pr-checks` then stops on the pre-existing stale `supabase/functions/_shared/copilot/platformFacts.generated.ts`. Later PR gates did not run; no unrelated generated file was changed.

## 2026-10-17 — Pricelist lens popup and Rx draft handoff

Status: Complete — no active handoff

The matrix now uses `RxPricelistCell` to combine the actual form's Material / index, Lens design / type and Lens colour option labels, retail override editing, and Start Rx order. `pricing/pricelistLenses.ts` maps canonical aliases into price bands; multiple matches require selection. Existing inquiry fallback and staff read-only views remain. The handoff uses `/profile/rx-order?lens=<alias>` and `prefill/pricelistLens.ts`; only the lens and vision type are seeded. Prices reload from the locked account, and patient/prescription/frame remain empty. Draft/edit/reorder wins over a lens link; Start another clears the link. Removed aliases show an explanation instead of a substitute. Existing 1.5-second autosave handles the new incomplete draft. No authorization, schema, pricing algorithm or deployment change.

Affected: `components/account/{RxPricelistCell,PriceOverrideCell}.tsx`, `sections/AssignedPricelistsSection.tsx`, `features/rx-order/{PortalRxOrderForm.tsx,form/RxForm.tsx,hooks/useInnovationsCatalog.ts,pricing/pricelistLenses.ts,prefill/pricelistLens.ts}`, two new unit test files, portal/Rx form integration tests and continuity docs. Earlier print, margin and teal-header changes were preserved.

Browser: authenticated local pricelist shows seven actual selections for Clear / Progressive - Good / Poly; choosing SRCoated displays the exact form labels and enables Start Rx order. Retail editor opens inside the same popup and was cancelled without saving. Checked at 1053×735 and 390×844; phone popup bounds are approximately x=16..374 within a 390px viewport. Escape dismisses. Temporary viewport restored. No Start Rx order, quote request, retail Save, cart submit or other production write was triggered in this follow-up. The live draft handoff remains covered by mocked catalog/persistence integration tests rather than a hosted write.

Validation: final 69 focused tests across six files pass, including canonical alias mapping, explicit selection, permission-dependent actions, retail edits, keyboard focus/Escape, stale aliases, fresh account-priced incomplete autosave, and existing portal/matrix pricing checks. TypeScript, build and full lint pass (0 errors / 2,424 warnings); final scoped lint has 0 errors / 47 existing warnings. Earlier full `npm run test -- --runInBand` snapshot: 1,582 passed / 3 failed (244 passed / 3 failed files), before the final keyboard-focus check was added. Untouched failures: adminResourceColumns description KNOWN_BROKEN mismatch, Atlas reader expected 720px versus current 920px, and emailRecipientInput missing CRM contact option in the broad run. PR checks pass lockfile policy/documentation symmetry, then stop at the unchanged stale `supabase/functions/_shared/copilot/platformFacts.generated.ts`; later PR gates did not run. No unrelated repair was attempted.

## 2026-10-17 — Rx/pricelist annotation feedback

Status: Complete — no active handoff

Local source: restored portal Print order beside Save as draft, reusing the existing print sheet without an explicit save; admin Save & print retains save-first behavior. `AssignedPricelistsSection` uses existing secondary/foreground teal tokens and focus/hover tooltips with design, material and colour/treatment. Missing cells explain possible supplier unavailability or deliberately unoffered low-demand options; exact reasons are not present in the current data. QuotePanel shows an optional, local-only BBD selling-price estimate once the visible quote is ready and fully priced. Gross profit is sale minus quote total; gross margin divides by sale, and zero sale has no percentage. Selling price never enters saved/printed/cart payloads. Frames and other costs are excluded; compare like tax bases.

Affected source: `src/components/account/sections/AssignedPricelistsSection.tsx`, `src/features/rx-order/form/{RxForm,QuotePanel,GrossMarginEstimate}.tsx`, `form/marginEstimate.ts`, focused tests and continuity/module docs. No schema, pricing rule, authorization, integration or deployment change.

Browser: live portal print control present; light-mode pricelist teal and both keyboard-focus tooltips checked at 1053×735, dark-mode tooltip also checked. Temporary theme/viewport restored. No-network fixture bench verified BBD 278.25 cost with 150 sale = -128.25 / -85.5%, and 400 sale = 121.75 / 30.4%. Native print output was not sent to a printer; integration tests exercise sheet mounting, print invocation and cleanup.

Verification incident: synthetic PREVIEW ONLY data typed into the live portal form triggered its existing 1.5-second autosave, creating a hosted quote/draft. User explicitly chose to leave it for review; no cleanup was performed, and further synthetic input used Fixtures (no network). No cart addition, submission or lab release occurred. Do not claim this session made no production data writes.

Validation: 27 focused checks pass across Rx form, print sheet, margin and portal lab-access tests. Full suite: 1,563 passed / 2 failed; failures are untouched stale expectations in adminResourceColumns (description removed from live columns but remains KNOWN_BROKEN) and atlasSharedPageViewer (720px expected versus current 920px). Final build and TypeScript pass after the component rename; full lint has 0 errors / 2,424 warnings, final scoped lint has 0 errors / 35 warnings. Diff whitespace check passes. `npm run qa:pr-checks` passes lockfile policy and documentation symmetry, then stops at existing `platformFacts.generated.ts` drift; later gates did not run. Production publication was not requested.

## 2026-10-17 — Homepage wording annotations

Status: Complete — no active handoff

Applied all requested copy changes in `src/components/home/HomePage.tsx` and `homeContent.ts`; Comment 2 uses "Find the right lenses and coatings for your customers." Comment 7 supplies the final FAQ introduction, superseding Comment 6. Expanded category labels are shared by both audiences. No breakpoint, container, or token changes. Regenerated `src/lib/generated/publicContentIndex.ts`.

Verification: local in-app browser confirms the trade headings and patient explanation/category labels/FAQ copy; screenshots inspected at approximately 1400px wide. Build, generated search-index check and diff whitespace check pass. Full lint: 0 errors / 2,424 warnings. `npm run test -- --runInBand`: 1,557 passed / 2 failed (242 passed / 2 failed files). Untouched failures: `atlasSharedPageViewer.test.tsx` expects 720px while the current shared reader uses 920px; `adminResourceColumns.unit.test.ts` still includes description in the lens KNOWN_BROKEN list although it no longer references that column. No production publication or data action performed.

PR checks: `npm run qa:pr-checks` passes lockfile policy and documentation symmetry, then stops because `supabase/functions/_shared/copilot/platformFacts.generated.ts` is stale. A read-only generator comparison with CR characters removed still reports drift, so this is not solely Windows line endings. The generated Copilot file and its admin source inputs were untouched by this copy change. Later PR gates did not run.

## 2026-10-13 — Pricelist readiness message

Status: Complete — no active handoff

Affected files: `supabase/functions/admin-user-management/index.ts`, `supabase/functions/customer-onboarding/index.ts`, `src/pages/admin/UsersPage.tsx`, `src/hooks/useAdminUsers.ts`, `src/features/admin/security/adminFunctionPolicy.ts`, focused tests, and continuity docs. Admin create/invite still assigns default template pricing, but cannot send the "Your Classic Visions pricelist is ready" message. The create-user immediate-send control is removed. The separate invite email remains opt-in. The welcome template and scoped email-pipeline smoke path remain for explicit test recipients.

Verification: focused onboarding/policy tests 20 passed; TypeScript and build passed; lint completed with 0 errors and 2,416 warnings. `npm run test -- --runInBand` ran without a final result and was stopped after the focused tests passed. Main commit `8ed3c5e9` reached READY on Vercel production and GitHub Pages deployment passed. After the GitHub Edge Function workflow failed before deployment because its `SUPABASE_ACCESS_TOKEN` secret was empty, Lovable deployed only `admin-user-management` and `customer-onboarding` from that commit. Its post-deploy `npm run qa:edge-smoke` passed 47 functions and 3 probes; the Doc Studio email probe was skipped because its setup was not configured. No customer account, pricelist, or email was changed during verification. A real named invite was not submitted, so the no-email result is established by source and deployment checks rather than a live invite transaction.

## 2026-10-09 — Iris visitor conversation quality

Status: Complete — no active handoff

User approved frontend publication. Iris fix ac97b542 was preview-built successfully, integrated with concurrent attachment-release documentation, and published from main commit 631870c6. Vercel production reached READY and its classicvisions.net / www.classicvisions.net aliases point to that release. The scoped delta contains only assistant frontend/tests and documentation; no Edge Function/config, migration, credential, access or request-form submission occurred.

Production browser verified signed-in public frame, coating and policy starters; Myself → Computer & screens → Not yet / not sure guide; renamed Search the site and its honest search scope. Generated follow-up about an existing full-rim frame answered frame integrity, fit and material checks; a second request simplified the same thread into three questions. Screenshot evidence is in this chat's artifacts. One browser typing timeout left a partial draft; it was completed and submitted once, with no duplicate request.

Known limitation: generated replies can still add unrequested product suggestions and their displayed citation numbering can disagree with inline references. These are existing server generation/citation behaviors; this frontend publication does not certify every generated answer or change the server endpoint. The old companion-web-search backend remains deployed but is unused by this frontend.

Validation: 31 focused tests, final TypeScript, build, PR checks and git diff --check pass. Full lint: 0 errors / 2431 warnings; focused lint: 0 errors / 20 warnings. Full test command finished 225 passed / 3 failed files, 1496 passed / 3 failed tests. Untouched failures: adminPortalCopilot.integration credential source-string expectation, rxFormChemistrie.integration clip timeout, rxFormShape.integration trace upload assertion. No broad-suite success claimed.

# Work Handoff

## Codex one-click dev preview — 2026-10-13

Status: Complete — no active handoff

Updated `.codex/environments/environment.toml` so the project action menu's Dev Preview action runs Vite against the current working tree at `http://127.0.0.1:5173`, opens the browser, and fails clearly if that port is occupied. This is a local development server, separate from the existing build-and-preview batch launcher and hosted preview/production. No credentials, environment files, application source, deployment or data were changed.

Verification: checked the package's existing `dev` script and reviewed the action configuration. The Codex app action was not launched in this turn.

## Atlas standard page width — 2026-10-13

Status: Complete — no active handoff

Atlas standard-width page headers and article bodies now use a 770px maximum width, reflecting the requested additional 50px over the annotated 720px article width. At the existing `sm` breakpoint and above, the page gutters are 5px; mobile retains the existing 24px gutters. The same standard width and responsive gutters apply to authenticated shared-page reading. Full-width pages remain full-width. Local source only; no deployment or data change.

Verification: source/diff inspection only; no tests or browser verification run.

Follow-ups: browser annotations requested an additional 50px and then 100px for both the page header and article body; standard width is now 920px across the editor and shared reader, with existing gutters and full-width behavior retained.

## Atlas layout and authenticated shared pages — 2026-10-08

Status: Complete — no active handoff

Supersedes the October 7 title-derived slug behavior: new pages use generated UUID slugs, stored existing slugs stay unchanged on title edits, and legacy null-slug pages use their ID without backfill. The current title-derived legacy URL is accepted as an alias; ID-bearing links remain supported. Previously renamed old slug-only bookmarks still have no historical aliases. New read-only shared links use a separate server-generated UUID token that never changes with the title. Manual staff slug edits remain explicit.

Layout repair uses the established browser preference store, with synchronous writes, current-snapshot merges, same-tab notifications and native storage-event refresh. Independent consumers previously overwrote each other's full-width settings. Sidebar width/collapse are now scoped by signed-in user ID, with bounded finite widths and immediate account-switch reads. Unowned legacy sidebar values are deliberately not imported. Sidebar preferences, icons and covers remain browser-local. The prepared nullable full_width column persists page width through the single editor/source path after migration; Update carries the selected width, and the shared reader restores it. Before migration, width uses browser-local fallback. The reported direct Update-only width reset was not reproduced; Update/reopen already passed before repair. Four regression checks failed on the old preference hook and pass after repair.

Sharing is explicit per page through AtlasSource. Administrators open Share, enable sharing, copy /shared/pages/:token, and may disable it later. Any non-anonymous authenticated website account holding a forwarded link can read the published active page, without assignment, admin privileges or profile-list changes. Existing registration preserves the viewer destination, including initial and resent email-confirmation redirects. Administrator-only Recent access lists the latest 100 account/page/version/time entries; account identity is not verified individual identity. Reads and audit inserts are one database transaction, so audit failure withholds content. Disabling, archiving, inactivity, or a password/secret blocks subsequent reads; existing downloaded copies cannot be recalled.

Applied migration: supabase/migrations/20261008183727_atlas_shared_pages.sql. New atlas_page_shares/atlas_page_accesses tables have RLS and no direct authenticated writes. atlas_set_page_sharing and atlas_open_shared_page have fixed search paths, actor checks and explicit grants. The projection excludes draft fields and staff/account data; help_articles policies are unchanged. Atlas remains admin-guarded, and its website reader mounts only the shared renderer. The security-definer projection is required to read staff-only published rows and append audit entries retained after page removal without granting ordinary users table access.

Validation: isolated PostgreSQL WASM (PGlite 0.5.8) executes the actual migration with minimal auth/table/policy fixtures; 41 checks cover access matrix, forwarded links, rename stability, draft/archived/inactive/null-state/secret/lock denial, administrator audit visibility, immutable auditing and revocation. This is not validation against the full hosted schema. 104 focused Atlas/route tests passed; the final reader/saved-width/signup rerun passed 12 tests including one additional full-width assertion (105 distinct focused checks total). The existing AuthPage/authFlow suite also passes 9 tests, including signup and resend destinations for both /store and the shared reader. TypeScript and lint pass (0 errors; existing warnings); production build, qa:smoke and qa:pr-checks pass. Release metadata is synchronized at 0.12.0 locally; this is not deployment evidence. An earlier full-suite snapshot finished with 1465 passes and one unrelated unchanged adminPortalCopilot source-string failure: it expects a hardcoded anthropic RPC argument, while the provider-neutral credential helper passes its provider parameter. That validation was captured before the approved release. Local browser fixture measured standard 720px, full 1248px in editor and viewer, full after Update/reload, and standard after reload; all data mutations used an in-memory adapter. That local preparation did not perform hosted actions.

Production release (2026-10-08): Atlas-only commit 7f2b3d0a was built from the previously deployed main commit cab43199 in an isolated release checkout, preserving the original feature branch and its unrelated commits. Vercel preview and production builds reached READY; the custom-domain production alias serves the Atlas release. Only migration 20261008183727_atlas_shared_pages.sql was applied and recorded in migration history. Hosted metadata confirms nullable boolean full_width, RLS on both new tables, fixed-search-path definer functions, authenticated execution only, no anonymous table reads or direct authenticated writes, and unchanged help_articles policies. No Edge Function source/config changed, no all-functions deployment or email smoke was triggered, and no page sharing was enabled. The sharing and access tables remain empty.

Hosted browser checks: the existing signed-in account opens Atlas and a published page; Share loads explicit Enable sharing and an empty Recent access table without a write. An unassigned token returns unavailable without content or an audit row. Sidebar resize from 244 to 260 pixels survives a reload; the original 244-pixel preference was restored. Local release-checkout validation passes 111 focused Atlas/routing/auth tests, 41 isolated PostgreSQL checks, TypeScript, lint (0 errors), build, qa:smoke and qa:pr-checks. Generated-file checks required CRLF normalization with no semantic source diff. The earlier full-suite snapshot has one unrelated unchanged Copilot source-string assertion failure; no full-suite pass is claimed.

Verification limits: no production page edit, Update, rename, share enable/disable, successful shared-content read/audit, signup, email send or new account was exercised. Those flows require an exact approved non-sensitive test page and existing test-account targets, with any signup/email action approved separately. The provider redirect allowlist could not be read through the available connector, so email-confirmation destination behavior remains unit-tested rather than hosted proof; no provider settings were changed. Preview browser access required a separate Vercel login and was left protected. The bare custom domain redirects to the signed-in primary domain, so that attempt does not prove a signed-out gate. Sidebar account isolation and saved page width retain local regression evidence; no cross-account hosted switch was performed.

No active continuation for the approved deployment. Optional local regression command: `npx.cmd vitest run --coverage=false src/tests/unit/atlas src/tests/integration/atlasRouteAccessibility.integration.test.ts`. Keep any target-specific live test separately approval-gated.

Outstanding design (not implemented): spaces should be addable/removable; SOP creation belongs in Operations Manual, not the reference wiki. ClickUp work is deferred. Prioritize doc/subpage hierarchy/order, heading levels, all text, table-cell relationships, attachments/images, rewritten internal links and contents anchors, with ID/count/content reconciliation rather than pixel styling. Current ClickUp adapter reads JSON exports and plans only; no bulk write path or verified connector. Its actual Markdown parser supports headings 1–4, simple text/inline links and flat lists, but tables are paragraphs, image URLs are links and depth/checklist/divider preservation warnings are too optimistic. Native Atlas table/image nodes do not imply import support. The older connected-MCP assertion is stale; no current ClickUp tool was verified.

## 2026-10-07 — Atlas title slugs and launcher favorites

Status: Complete — no active handoff

Local source complete: full page and peek regenerate unique stored slugs on draft title autosave and published Update; sidebar renames update title/slug together. Legacy null slugs stay unfilled while derived URLs follow the new title. Refetch merges saved slugs without undoing sidebar changes; rename transitions retain selection by ID. Browser titles show the saved page name. Sidebar navigation, shared links and launcher favorites carry articleId, so they resolve current titles and slugs after another rename. Existing external slug-only bookmarks lack durable redirect history and may break after a rename.

Launcher page actions use the host-owned AtlasLauncherFavorite with the existing user_launcher_pins table/policies and /admin/knowledge/wiki?articleId=... redirect. Pins sync through the existing account preference storage; query keys include user ID. Launcher resolves through AtlasSource plus readable space capabilities, hides deleted/inaccessible pages, and allows right-click unpin. Read-only peek users can favorite without gaining edit actions. No schema, authorization or credential change.

Affected files: AtlasWorkspace, usePageEditor, PageHeader, PagePeek, DatabaseSpace, helpArticlesSource, host/config registration, AtlasLauncherFavorite, atlasLauncherPins, useLauncherPins, useAtlasLauncherItems, AppLauncher, Atlas/launcher tests and continuity docs. Other ongoing Lead Finder/CRM changes were preserved.

Validation: 92 tests across 16 Atlas/launcher/route files passed, plus the final title/derived-URL and account-isolation regression rerun; TypeScript, full lint (0 errors; warnings), production build, qa:smoke and qa:pr-checks passed. PR checks initially found release-ledger drift from the existing Lead Finder changelog; release-ledger:sync plus npm package-lock-only synchronization aligned source metadata to 0.11.0. This is not publication proof. The full test suite reported untouched CRM unsafe-match, Rx trace-drop and Chemistrie toggle failures, and was stopped without a pass.

Authenticated local browser read confirmed the saved page title in the browser tab and an enabled Add to launcher favorites action after the pin preference read. Initial hot-refresh hook-order errors cleared on full reload. No hosted title edit, pin write, Publish/Update or deployment was performed. Supabase connector harmless list_projects succeeded but did not expose this application's managed project, so no connector database query was attempted.

Approval required only for production publication or hosted verification writes if requested later. Exact executable review action: `git diff -- src/features/atlas src/features/admin/core/hooks/useLauncherPins.ts src/components/admin/AppLauncher.tsx src/config/atlasHost.ts`. New untracked files must also be included when committing. Focused verification command: `npx.cmd vitest run --coverage=false src/tests/unit/atlas src/tests/unit/launcherPins.test.tsx src/tests/unit/launcherPinIsolation.test.tsx src/tests/integration/atlasRouteAccessibility.integration.test.ts`.


## 2026-10-07 — CRM research provider replacement

Status: Function deployment complete; successful combined-provider lookup blocked by missing server configuration and an ambiguous business match.

The user approved deploying only crm-enrich-contacts and one billable live lookup, then explicitly authorized sending a Lovable chat. The five prepared backend source files were supplied to Lovable; it reports deno check and deployment success with existing config.toml and custom authorization preserved. Server logs verify deployed version 94 served the authenticated research request. No migration, credential or permission change, email or frontend publication occurred. Supabase connector access and local CLI transport failures were bypassed using the authorized Lovable workflow.

Live result: the new Google Places search accepted the request but returned three equally named Specs Optical listings. The auditable manual Google attempt records an ambiguous-match error; research returned HTTP 502 and changed no contact fields. OPENAI_API_KEY is absent, so no OpenAI call ran. An earlier preparation click immediately triggered a request against old version 91 and received the legacy Google REQUEST_DENIED; the initial assumption that no provider call occurred was corrected after log inspection. Do not run any additional lookup without fresh authorization.

Verification: Lovable reports deno check and qa:edge-smoke passed all 47 functions and 3 probes. The local npm run qa:edge-smoke failed throughout with fetch failed, so it supplies no local reachability proof. Twelve focused mocked tests, TypeScript, focused/full lint (warnings only), build, PR checks and git diff --check previously passed. The broad suite was stopped after unrelated Rx integration failures/timeouts and did not pass. Source release metadata is 0.10.0. The approved phone/email/address-source note was separately saved and read back earlier.

Affected files: crm-enrich-contacts/index.ts; shared enrichment publicWebResearch.ts, googlePlaceDetails.ts, contactEnrichment.ts and combinedResearch.ts; PublicWebResearch.tsx, useContactEnrichment.ts and three focused tests; continuity and release docs. Places API (New) uses header credentials, explicit masks and unchanged ambiguity thresholds. Manual research independently audits configured Places/OpenAI providers and preserves successful results if another fails; each provider consumes a daily attempt, and failed cap reads stop requests. Scheduled enrichment remains Google-only. The OpenAI Responses web_search path uses server-only OPENAI_API_KEY and optional CRM_RESEARCH_OPENAI_MODEL (default gpt-5.5), citation metadata and reviewable suggestions rather than automatic writes.

Remaining: the user must configure OPENAI_API_KEY securely in the existing project's secret editor to enable OpenAI research. Do not collect the value in chat or tracked files. A saved city/country could also disambiguate Specs Optical, but address-field changes were not made. Frontend publication and any credential changes require separate authorization. Lovable also reports CRM_ENRICH_SCHEDULER_SECRET absent; scheduled authentication is therefore not verified. Exact next executable local action: `npx vitest run --coverage=false src/tests/unit/publicWebResearch.test.ts src/tests/unit/googlePlaceDetails.test.ts src/tests/unit/contactEnrichmentFailure.test.tsx`. After secure provider configuration and fresh lookup approval, verify one authenticated mode:research request without saving suggestions.

## 2026-10-07 — Doc Studio recipient picker, signatures and labels

Status: Local implementation complete; production publication and actual email-client verification pending.

Affected files: public/ds/studio-logic.js, studio.html, assets/signature-logo.png, Doc Studio CONTEXT, docStudioRecipientSignatureLabel tests, docs/doc-studio-signature-compatibility.md and frontend release/continuity documents. The established runtime remains active; generated support.js and native v2 are untouched. New shiplabel mode/headings preserve legacy defaults. Existing Save / Save person / Share flows remain in place.

Validation: full `npm run test -- --runInBand` passed 210 files / 1388 tests. Final focused Doc Studio suite passed 3 files / 12 tests. `npm run lint` passed with 0 errors / 2416 warnings; production build passed. PR checks passed after required release-ledger sync and lockfile root-version alignment to 0.9.0. Version is source metadata, not deployment evidence. Other concurrent Atlas/blog and CRM changes were preserved.

Browser: authenticated port 8081 verified name/email filtering, checkbox selection into To, outside-click/focus-loss/Escape dismissal with To retained and send dialog preserved; customer label mode renders without sender/courier fields. Captured square-label preview after explicitly resetting inherited descendant radii. Signature HTML tile renders with the local PNG and live telephone/email/web links; Copy signature reported success. Automation's clipboard bridge returned no OS clipboard data, so cross-client paste is not verified. Waiting for the PNG download caused a browser/CDP timeout; no download completion was claimed. The exact signaturePngBlob method was rendered with a local canvas runtime into a 1260px PNG and visually inspected. Temporary sample recipient name was cleared in the browser; no server-side Save or Send was clicked.

Blocker/approval: new hosted PNG must be published with the app before external HTML signatures can load it. Real Outlook/Gmail/Apple Mail received-message and dark-mode behavior remain unverified. Production deployment/public publishing require user approval under AGENTS.md. No email, hosted data write, sharing change, push or deployment occurred.

Exact next executable action: `git diff -- public/ds/studio-logic.js public/ds/studio.html package.json package-lock.json docs/releases/manifest/current.json`. Review with `docs/doc-studio-signature-compatibility.md`, obtain production publication approval if requested, and verify an authorized received test email in the target clients. Browser screenshots and local signature export are under this chat's visualization artifact directory.

## 2026-10-07 — CRM contact editor comments

Status: Local editor/research implementation validated; Innovations salesperson mapping/writeback and deployment incomplete.

Affected files: ContactsPage, CompanyCombobox, PublicWebResearch, contactEmails, useContactEnrichment, crm-enrich-contacts, publicWebResearch shared helper, innovations-sync receiver allowlist, three focused test files, CRM CONTEXT and `docs/crm-contact-editor-follow-up.md`. Save stays open; Save & Close closes after the full pipeline. Newly inserted IDs and persisted account links survive subsequent edits. Email lists use the existing text column. Public-web results suggest candidate emails and expose sources, never automatically modify contacts.

Validation: initial TypeScript/build and lint (0 errors, 2411 warnings) passed; full suite passed 205 files / 1356 tests; subsequent focused suite passed 8 tests. Real Edge typing in an isolated local fixture verified filtering `vision` to Beta Vision and Enter selecting `beta`; fixture files were removed. The user identified port 8081 as the current checkout. The authenticated real contact dialog there shows Email addresses, Research public web, Save and Save & Close; typing `20/20 Opt` filters to one result and Enter selects 20/20 Optical. Port 8080 serves a different checkout. No hosted save or billable provider call occurred. The checkout was concurrently committed at `2de1aea3` and merged at `0bc38cdd` by another process; this chat did not commit, push or deploy. The follow-up account-link correction passes TypeScript, focused component lint, final production build and PR checks. Required release-ledger sync generated version 0.8.0 and npm lockfile metadata was synchronized; this is source metadata, not deployment proof. Other ongoing Atlas/blog edits in the shared checkout were preserved.

Blockers: actual Innovations salesperson metadata/sample must be verified; address writeback needs an office-owned durable, idempotent, revision-checked worker. Existing outbound email consumers require a recipient-list audit before release. Existing office address mapping already sends the requested fields; blank rows need a mapped dry-run and preservation-trigger investigation, not guessed SQL.

Approval required: production publishing/function deployment, billable live research if requested, production migration/writeback/scheduling. Exact next executable action: `git diff -- src/pages/admin/erp/ContactsPage.tsx src/features/admin/crm/hooks/useContactEnrichment.ts STATUS.md docs/agent/HANDOFF.md docs/agent/PROJECT_KNOWLEDGE.md`. Review current deltas and `docs/crm-contact-editor-follow-up.md` before planning the office implementation; do not deploy as complete bidirectional sync.

## 2026-10-07 — Admin attention dropdown

Status: Complete — no active handoff

Affected files: `OperatorAttentionAlert.tsx`, `AdminTopBar.tsx`, `AdminLayout.tsx`, `AtlasAdminFrame.tsx`, attention unit tests, admin CONTEXT, STATUS and PROJECT_KNOWLEDGE. Shared header owns the single alert beside the bell. Its 320px right-aligned vertical popover starts closed; X, Escape and outside click close presentation without altering work or Snooze. All items scroll vertically and navigation closes the panel.

Validation: `npx tsc --noEmit --pretty false`, `npm run lint` (warnings only), `npm run build`, and 8 focused attention tests pass. An isolated local browser fixture with 9 sample items confirmed vertical placement, X, Escape and outside-click dismissal. Temporary fixture files were removed and the normal Vite app restarted on port 5178. Full `npm run test -- --runInBand` encountered a 120-second timeout in `rxOrderDomain.integration.test.ts` seeded scenarios; the broad run was stopped, not passed. Full authenticated local-dashboard inspection was rejected by the browser URL security policy; no workaround was attempted. Dependency installation initially failed with Windows ENOTEMPTY; preserving the old dependency directory outside the checkout and a clean `npm ci` restored the locked toolchain without manifest edits.

The user explicitly authorized committing and pushing this frontend change to main on 2026-10-07. Source implementation is complete; deployment completion and authenticated production behavior have not been verified. No hosted data write or Edge Function change is included. The full-suite Rx timeout remains a validation limitation.

## 2026-10-05 — Iris wiki formatting

Status: Local implementation complete; production publication pending approval.

Affected files: Atlas Iris panel/converter, AtlasWorkspace selection acceptance, Iris regression tests, npm dependencies, Atlas CONTEXT and frontend release/continuity docs. Replies, proposal previews and editor insertions preserve rich content. The existing hosted article draft remains unchanged. Browser proof used an isolated local fixture with the real IrisPanel, BlockEditor and a mock assistant; no live assistant generation, hosted save or publishing was performed.

Validation: TypeScript, 12 Iris tests, lint (warnings only), build and local browser formatting check pass. All 1,318 tests and PR checks pass. Regenerating platform facts/search index resolved Windows line-ending-only drift without semantic source changes. Release ledger is synchronized.

Approval required: production frontend publication and any repair to the already-stored hosted draft. Exact next executable action: `git diff -- src/features/atlas/AtlasWorkspace.tsx src/features/atlas/iris/irisBlocks.ts src/features/atlas/iris/IrisPanel.tsx`. Review that concrete change before approving publication; do not auto-rewrite stored articles.

## 2026-10-05 — Open branch integration review

Status: Complete — no active handoff

`codex/review-open-branches` contains the reviewed non-excluded heads and current main. Smart Customer Journey is excluded. Affected source: statement-job types, direct Rx shipping-address migration, two CRLF test helpers and the repaired smoke script. Review and continuity docs record conflict resolutions and existing security/rollout findings. All 1,316 tests, lint, TypeScript, build, PR checks and smoke pass; the local built Atlas deep link redirects to sign-in correctly. No hosted write, migration, function deploy, order or email occurred.

The user approved frontend publication. Integration `566077c5` was pushed to main without force after a remote refresh. PR #607/#608/#609 are merged; GitHub validation passed on Node 20 and Node 22, and Pages plus both Vercel deployments succeeded. The production sign-in page returned HTTP 200. No Edge Function or function configuration changed. Full evidence and existing findings: `docs/agent/OPEN_BRANCH_REVIEW.md`. No continuation action remains for this branch integration.

## 2026-10-02 — Direct Rx submission shipping address

Status: The corrected function is live and verified. The user authorized a test
submission, but the active `classicvisions.net` Rx form is a production order
path and an on-account submission creates a real order/credit obligation.
Browser policy requires the user to perform that final consequential action.

The live draft page displayed the exact error “A shipping address is required
to place an order.” The CVO profile showed a complete default shipping address.
The actual Rx submit path is `RxForm.tsx` → `place_rx_order_direct` →
`place_customer_order`. Unlike cart checkout, `place_rx_order_direct` passed no
shipping address, which caused the shared order function to reject it. The
Migration `20261002180000_rx_direct_submission_shipping_address.sql`
updates `place_rx_order_direct` to load the authenticated user's default saved
address, fall back to `profiles.shipping_address`, and pass it to the shared
order function; its existing line1/country validation remains in force. The
previous checkout-wrapper diagnosis was incorrect and its un-applied migration
was removed. Applying the function also exposed an explicit `anon` execute
grant, so the migration explicitly revokes that grant and retains
`authenticated` execution.

Affected files: `supabase/migrations/20261002180000_rx_direct_submission_shipping_address.sql`,
`STATUS.md`, and this handoff. The migration SQL was applied using the connected
Lovable database MCP. A read-back confirmed that the function loads and passes
the saved address, authenticated execution is enabled, and anonymous execution
is disabled. The Supabase MCP connection could not access this project, so the
migration was not recorded in Supabase migration history. No order was
submitted. Tests and builds were not run.

Exact next action: the user clicks **Place order now** on the open Rx draft,
then verifies the order appears with its shipping address before any lab
release. Record the already-applied migration in the canonical migration
history when the project’s Supabase MCP access is restored.

## 2026-10-02 — Statement delivery all-customer view

Status: Frontend published through Lovable from main; no migration, Edge
Function, schedule, secret, or email action occurred.

`src/pages/admin/StatementDeliveryPreviewPage.tsx` now reads every non-void
`statement_document_jobs` row in paged batches, resolves statement/customer
and synchronized contact email, and shows all customer accounts rather than
Retail fixtures. Missing-email statements produce a page warning, a filter,
an Open Contacts link, and a row-level blocked-email label. They remain
previewable/printable and are excluded from approval selection. The query is
compatible with the current pre-website-storage local schema; stored PDF
download needs the already-staged website-storage migration and redeployed
functions.

Verified: the Lovable published preview showed 63 September rows and 17
missing-email warnings. The local authenticated browser previously showed
1,000 initial rows including non-Retail customers and 275 missing-email rows;
pagination was then added to remove the Supabase 1,000-row cap. `npx tsc
--noEmit --pretty false`, `npm run build`, and `git diff --check` pass. The
local build has not sent an email or changed source data. Lovable reported and
fixed a typecheck issue in the page before publishing. Next action: deploy the
website-storage migration and updated functions only after explicit approval,
then run hosted schema/function verification.

Local source follow-up: the Finance PDF preview now renders the shared
`StatementPrintDocument` used by Profile > Statements, using the selected
statement's own summary and `statement_lines_public` rows. Print styling no
longer clips overflow from variable-height statement content, avoids breaking
rows and summary blocks, and repeats the transaction table heading on print
continuation pages. The admin preview reads statement data only; it does not
write financial data or send mail. Updated files: `src/pages/admin/StatementDeliveryPreviewPage.tsx`,
`src/components/account/sections/StatementPrintDocument.tsx`, and `STATUS.md`.
No tests or builds have been run for this follow-up. The existing operational
approval requirements above remain. Exact next action: `npx tsc --noEmit --pretty false`.

## 2026-10-02 — Automatic Innovations statement documents

Status: Source implementation updated to remove OneDrive/Graph and prioritize oldest statement periods; the hosted project still runs the previous storage version until the new migration/functions are deployed.

The Innovations receiver now creates one idempotent `statement_document_jobs` row for each newly discovered, non-void statement after the activation baseline. In the controlled rollout, the protected worker renders the Letter PDF, stores it in private website-managed Supabase Storage, and holds the existing canonical statement email at `awaiting_approval`; a protected staff approval function changes it to `approved` for the worker. The customer endpoint re-checks the authenticated user's CRM customer ownership before streaming the stored PDF, and admin/operator users may download it for manual filing. The worker includes a vector Classic Visions mark, records template version `statement-print-v2`, uses the shared statement data mapping and page-break capacities, follows the profile print document's account-summary, aging, transaction-detail, totals, terms, and payment-instruction structure, and prioritizes the oldest statement periods first. It also handles an unlinked customer without crashing during email rendering. A local Finance → Statement Delivery preview demonstrates the lifecycle with safe fixtures and never sends email; it includes per-row PDF preview, row selection, select-all, and bulk approval/queue controls.

Affected files: `supabase/functions/statement-document-worker/index.ts`, `supabase/functions/statement-document-approve/index.ts`, `supabase/functions/statement-document-prepare-period/index.ts`, `supabase/functions/_shared/statements/statementDocumentModel.ts`, `supabase/migrations/20260818120000_statement_document_automation.sql`, `supabase/migrations/20261002153000_statement_website_storage.sql`, `src/pages/admin/StatementDeliveryPreviewPage.tsx`, admin routing/navigation, and the existing statement receiver, endpoint, email template/queue, portal section, config, and runbook. OneDrive/Graph is no longer part of this delivery. No source Innovations data was changed and no customer email was sent. The rehearsal function defaults to `dry_run:true`.

Verified: `npx tsc --noEmit --pretty false`, focused statement print test (1/1), `npm run build`, targeted ESLint (0 errors; existing explicit-`any` warnings), `git diff --check`, and authenticated local browser verification of the Finance preview, PDF preview, select-all, and bulk approval state transition. Browser/API production, Edge Function, private storage, attachment-provider, scheduled-worker, and authenticated live Retail checks remain unverified. The jsPDF worker is structurally aligned with the profile print document but is not the same browser DOM renderer, so final pixel-level/page-layout comparison still requires a rendered hosted PDF review.

Approval required: review and apply the website-storage migration through Lovable, deploy the updated Edge Functions/frontend, set the worker secret, configure the protected worker schedule, and send an approved named-recipient Retail test. The migration removes the retired OneDrive columns and creates the private `statement-pdfs` bucket, so do not apply it without confirming the hosted backup/rollback plan. For the rehearsal, the exact next action after deployment approval is the dry-run request documented in `docs/statement-document-automation-runbook.md`; do not run `dry_run:false` or any live send without explicit approval. Then run `npm run qa:edge-smoke` after Edge Function deployment and execute the Retail sequence with `STATEMENT_EMAIL_MODE=approval` and the worker schedule disabled until the first successful approval test.

## 2026-09-30 — Email status banner dismissal

Status: Complete — no active handoff.

Doc Studio's email status bar has an accessible close button. Dismissal uses the tab-session `docstudio-email-health-dismissed` key, storing only status/attempt identity. It survives reloads, keeps health polling active, and shows a changed status or latest attempt again. The detailed health page is unchanged. No production release or email send occurred. Verified authenticated local dismissal and persistence after reload, production build and diff checks. Full tests: 949 passed, four existing failures (three CRLF source checks plus the existing customer-data security audit), one expected failure. PR checks stop at existing publicContentIndex.ts drift. Lint results are recorded in STATUS.md.


## 2026-09-30 — Preview toolbar follow-up

Status: Complete — no active handoff for local toolbar work.

Final full-suite result: 949 passed, four unrelated failures, one expected failure. Browser checks at 1513px, 900px, 760px and 640px confirm letterhead labels/actions fit; email/billing at 640px have no toolbar overflow or font-ligature icons. Final build, lint and diff checks pass. PR checks retain the existing public-search-index drift.

`studio.html` uses inline SVGs for Save, Save as, Rename, Share, Delete and dropdown chevrons. `preview-toolbar.css` is shared with the native mount; the toolbar/action groups and text buttons wrap and grow rather than clipping. Status text wraps and has a live-region role. No action, authorization or persistence contract changed. Browser checks cover desktop and narrower letterhead/email/billing layouts; build and lint pass. The full-suite and PR-check baseline failures are recorded in the earlier handoff below. No deployment was made; production release still needs approval.

## 2026-09-30 — Doc Studio letterhead and email

Status: Source complete; production release and send verification pending approval.

Final focused run: 22/22 tests across letterhead, managed-email payload and document-content tests pass. PR checks pass lockfile, the documented source-only symmetry exception and Copilot facts, then stop at pre-existing `publicContentIndex.ts` drift (`npm run qa:search-index`). Final build and diff checks pass. The three legacy CRLF failures and unrelated security-audit failure remain outside this change.

Affected files: `public/ds/studio-{logic.js,html}`, `DocStudioEmbed.tsx`, shared managed email and Copilot document-content keys, two regression tests, review and continuity docs. Presentation tables no longer inherit admin borders/padding/hover fills. Rule and spacing choices share preview/Word builders and saved content; legacy letters default to Gold/Comfortable. Long letters retain readable typography. Image-only email receives nonblank fallback text.

Verified: authenticated local browser controls, focused tests, TypeScript, full lint (warnings only), and build. Full suite: 948 passed, four failed, one expected failure. Unrelated failures: two assistant-memory CRLF checks, one walk-in-payment CRLF check, and the customer-data audit of `20260929190000_customer_rx_pricing_read.sql`. No production write, send, push or deploy occurred. Supabase denied deployed-code inspection; Lovable source already has the older HTML-to-text fallback, so the historical send's exact trigger remains unverified.

Approval required: frontend/affected Edge Function release; separately one named-recipient test email. Exact executable next action: `npx vitest run --coverage=false src/tests/unit/docStudioLetterhead.test.ts src/tests/unit/managedEmailPayload.test.ts`. After release approval, identify the actual raw-email caller, deploy the affected functions, run `npm run qa:edge-smoke`, and verify an authorized test send. Preserve the other handoffs below.

- Repository: `classicitbb/optilens-1c39be6c`
- Status: Document AI source integration ready — Google IAM configuration blocked
- Last synchronized: 2026-09-27

## Homepage hero browser feedback

Status: Complete — no active handoff.

The promoted homepage now uses `src/assets/classic-visions-caribbean-team-v2.webp`,
a generated conceptual portrait of Caribbean optical professionals with frames
and a lens, without machinery. The original hero image remains in the asset
folder for comparison. The hero eyebrow reads "Professional Optical laboratory"
and the image caption reads "Made in Barbados". `HomePage.tsx` keeps its
existing 16:9 responsive frame; the generated search index was refreshed.
The portrait is illustrative and should not be represented as a photograph of
actual Classic Visions staff.

Verification: local in-app browser desktop review, focused ESLint, public
search-index check, production build, and `git diff --check` pass. The full test
suite remains at 935/938 because of the three existing CRLF-sensitive tests in
assistant memory and walk-in payments. Full lint has one unrelated existing
`@ts-nocheck` error in the transactional-email template. No hosted release was
made; a production deployment still requires approval. `qa:pr-checks` passes
lockfile policy and the documented source-only symmetry exception, then stops
at pre-existing Copilot platform-facts drift; that generated file was left
untouched because this hero change has no Copilot dependency.
## Native website ordering plan

Status: Planning complete; implementation not started.

Affected file: `docs/lablink-to-native-ordering-plan.md`, plus continuity docs.
The plan maps custom lenses to the profile Rx Order Form and other products to
the Store. It records the existing `approved_customer` route gate and the
server-authorized customer-account requirement, so copy and navigation updates
alone cannot fulfill the requested access. No tests were run for this
documentation-only change. No production data, code path, or deployment changed.
Approval required before an authentication/authorization change or production
release. Exact next action: inspect the plan, approve the customer-access
contract, then implement its first work package by updating the ordering CTA
map and the corresponding route/navigation tests.

## AI spend monitoring

Status: Source implementation complete; migration and release pending.

Affected files: `src/pages/admin/settings/{AiSpendCard,IntegrationsPage}.tsx`,
`supabase/functions/_shared/aiSpend.ts`, the Anthropic/Lovable/Document AI call
sites, `supabase/migrations/20260926193102_ai_spend_monitoring.sql`,
`docs/ai-spend-monitoring-plan.md`, and continuity docs. The dashboard shows an
accordion for each provider, links to existing configuration or provider
billing, 30-day request averages, manually reconciled balance/spend, fill level,
and a freshness-limited top-up forecast. It does not invent provider charges.
The connected Lovable workspace read returned no credit balance.

Verification: TypeScript, full lint (warnings only), build, and authenticated
local browser review pass; the provider configuration button opens AI Agents.
The full test run is 933/936 with the three previously recorded CRLF-sensitive
failures in assistant memory and walk-in payments. `npm run qa:pr-checks`
passes lockfile, documentation exception, Copilot facts, and public search
checks, then stops on the pre-existing unreleased release-ledger drift. Local
Supabase status cannot reach Docker Desktop's Linux engine, so the new
migration/RLS is unverified in a database. No production write or deployment
was made. Concurrent Rx edits are untouched.

Approval required: production migration, Edge Function and frontend release;
separately, any provider billing credential or permission change. Next action:
after release approval, apply `20260926193102_ai_spend_monitoring.sql`, verify
admin/non-admin RLS, deploy the changed functions and frontend, run
`npm run qa:edge-smoke`, and inspect one real usage event without sending a
billable test request.

## Rx order browser feedback

Status: Complete — no active handoff

The 2026-09-26 Rx form changes were implemented in
`src/features/rx-order/embed/{rx-order-engine.js,rx-order-markup.html,rx-order.css}`
and the Rx route width in `src/components/account/AccountLayout.tsx`.
The related Rx integration tests were updated and extended. Local browser
review confirmed the Enter chain and panel handoff, and found and resolved a
cramped frame grid. Focused Rx tests passed 71/71; TypeScript, lint (warnings
only), build, PR checks, and `git diff --check` passed. The PR gate uses
`docs/bugs/doc-symmetry-exception-rx-order-unreleased.md` to avoid generating
a production release/version for a source-only change. Search index generation
also repaired a pre-existing two-line public-content drift. The full suite still reports the
three existing CRLF-sensitive failures in assistant memory and walk-in-payment
source-string tests. No production deployment or production order write was
performed. The account-header branding comment remains a design suggestion.
A normal frontend release requires explicit deployment approval.

The later frame-summary feedback is complete locally in `rx-order-engine.js`
and `rx-order.css`: `Supplied by` sits beside the frame outline, thin rules
separate labels from values, and collapsed frame bodies take zero height.
The focused Rx integration file (23/23), lint (warnings only), and production
build pass; local browser review confirmed desktop and narrow layouts. No
hosted release was made.

The subsequent Rx browser feedback is complete locally. Frame and lens summary
headings align at the top, and the all-treatments drawer closes when the user
moves outside the popular choices area and drawer. Chemistrie clip choices remain
in the payload and lab instructions, while the provisional quote charges are
removed; no Chemistrie SKU or quote item is created. The focused Rx integration
file (25/25), outbound order mapping tests (28/28), full lint (warnings only),
and production build pass. The full test sweep passes 935/938; its three
failures are the previously recorded CRLF-sensitive assistant-memory and
walk-in-payment assertions. No hosted release or production order was made.

## Higgsfield Seedance 2.5 example

Status: Source setup complete; live generation verification blocked by local TLS
certificate validation.

`examples/higgsfield/index.ts` uses the official server-only TypeScript SDK's
`subscribe` call for `bytedance/seedance-2.5/text-to-video`, with the requested
sunset prompt, 5-second duration, 720p resolution, and 16:9 aspect ratio. It
loads the ignored `.env.local` runtime variable `HF_CREDENTIALS`, handles
failed, canceled, and moderated outcomes as failures, and prints only a
completed video's URL. `npm run higgsfield:seedance` is the billable command.

The 2026-09-19 execution reached the local TLS handshake but failed with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` before a video URL was returned. Do not use
an insecure TLS bypass. Repair the workstation certificate chain or configure
Node with the organization-approved CA certificate, rotate the credential used
for the failed attempt, then run `npm run higgsfield:seedance` once and record
the returned URL/status.

## Current continuation

The portal order-history search refinement is complete locally and awaits the
normal paired frontend/private-gateway release. The existing `Search patient,
Rx or order #` control now filters both live lab-order and delivery results;
a single matching delivery opens and flashes. The private
`innovations.customer_orders` response now includes the already
customer-authorized order ID so the status list can match it without a second
read. Changed files are `src/components/account/sections/MyOrdersSection.tsx`,
`src/tests/integration/portalMultiAccountAccess.integration.test.ts`, and the
paired Local gateway files recorded in that repository's handoff. Focused
Vitest (7/7), affected-file ESLint, TypeScript, the CV Web production build, and
the Local full suite (189/189) pass. The CV Web full suite currently has three
unrelated CRLF-sensitive source-string assertions: two assistant-memory checks
and one customer-device walk-in-payment grant check. No frontend deployment, Local service
restart, or live customer-data read occurred. Next action: after explicit
release approval, deploy the frontend and the paired Local gateway, then in an
authenticated external Edge or Chrome session type a known patient, Rx, and
order ID to confirm both lists filter and a single matching shipment opens and
flashes.

The next costing iteration is implemented locally but has not yet been
deployed. Changed files include `src/components/pdf/PdfViewer.tsx`,
`src/pages/admin/costings/ShipmentEvidencePanel.tsx`,
`src/pages/admin/costings/ShipmentDetailPage.tsx`, new
`src/pages/admin/costings/ShipmentCostingCoverSheet.tsx`,
`src/pages/admin/settings/DocumentAiIntegrationCard.tsx`,
`supabase/functions/document-ai/index.ts`, and migration
`supabase/migrations/20260915141611_shipment_document_ai_intake.sql`.
PDF previews use a fixed, single-page mode with Previous/Next controls instead
of expanding to every page. The evidence panel defaults to the printable
costing-sheet front page and the export tab exposes the existing
`shipment-binder` function only while a shipment is reviewed.

Google Cloud is signed in under the `classic-visions` project. The Document AI
API is enabled and the US `Classic Visions Shipment OCR` processor exists.
Google Console rejected service-account creation with tracking
`c489999731242316`; no service-account key exists, so no credential has been
saved and no source document has been sent to Google. The new database design
stores an encrypted service-account credential, draft-only extractions, and
human-approved document-layout templates. The Edge function validates the
caller, verifies the configured processor, creates extraction drafts only, and
has no shipment, charge, line, review, or lock write path. Iris has read-only
resources for document metadata, extraction drafts, and templates, and must
ask for approval before using any extracted values.

Passed: `npx tsc --noEmit --pretty false`; focused evidence-panel Vitest
(3/3); `npm run lint`; `npm run build`; and `git diff --check`. An authenticated
local Codex-browser review confirmed the costing-sheet default surface, source
list, unlink affordances, and unchanged shipment data. The direct migration
application through Lovable was not available from the exposed browser
controls; do not substitute an unverified database path. Next action: an
administrator must grant the Google account permission to create the service
account and key (or create it with Document AI API User), then apply the named
migration through the approved Lovable integration, deploy `document-ai`,
paste the JSON key in Settings > Integrations, and run its configuration test.

Shipment costing workbench repair is complete in source and not deployed. The
document review surface renders signed PDFs through the bundled `PdfViewer`,
shows its existing retry/open/download fallback if a document cannot render,
and uses a plain `PDF reader` label: automated OCR/extraction is deliberately
not implemented. Operators can unlink an approved evidence mapping without
deleting the source object or changing shipment/cost data. The landed-charge
grid now applies the supplier's most common complete historical profile from
the latest 30 shipments (minimum two uses; recency resolves a tie), including
VAT reclaimability and notes; its chip explains that source. Enter advances
through Type, Amount, VAT, Duty, VAT Reclaimable, and Notes, then focuses the
next row or creates a new final row. The three-column panel no longer fixes
document review to 410px; documents grow the page and the Landed Cost Story
collapses vertically. At sub-`xl` desktop widths the shipment fields stack in
one column; document review has an accessible minimize/expand control that
retains its selected source; and DHL shipments visibly show the established 10%
insurance-and-freight charity contribution in both the workbench story and
printable costing sheet without changing total landed cost or multiplier. No
migration was created because the work reuses the existing evidence
tables/storage bucket. `supabase migration list --linked` could not report
remote state because the installed CLI times out while shutting down PostHog; do
not apply an unknown migration through another route without first resolving
that read-only verification.

Passed: `npx tsc --noEmit --pretty false`; focused Vitest (including 9 current
assertions for document minimization, DHL/non-DHL cover-sheet rows, and import
totals); affected-file ESLint with no errors; `npm run build`; `git diff --check`;
and authenticated local external-Edge review at desktop and 900px desktop
viewport widths. The review confirmed one-column compact header fields, the
reversible minimized document-review header, and a DHL shipment's same charity
amount and current total in both summary surfaces. No charge was typed, added,
unlinked, or saved during browser QA, so no live data changed. Next action:
publish the normal frontend release after explicit deployment approval, then
repeat the document/keyboard checks on the hosted domain without changing a
shipment.

The responsive workbench follow-up is also complete in source and not deployed.
`ShipmentDetailPage.tsx` uses a sticky, wrapping shipment action bar and moves
the three-column layout to the wide-desktop (`2xl`) breakpoint. At that width,
the invoice-items, landed-charges, and export tabs span the shipment-header and
Document-Review columns, while the landed-cost story remains independently
readable on the right. At narrower desktop widths, the shipment header and
landed-cost story form the context area, followed by the full-width Document
Review and work tabs. `ShipmentEvidencePanel.tsx` now exposes its
expanded state to that parent, so collapsing it removes the former 410px blank
space without losing the selected source. The header and story span the wide
desktop workbench rows, so their tall content cannot hold the tabs beneath the
collapsed review's former fixed-height footprint. Passed: focused costing Vitest (7/7),
affected-file ESLint with existing warnings only, `npx tsc --noEmit --pretty
false`, `npm run build`, `git diff --check`, and authenticated local external
Edge review at 1024px, 1280px, 1440px, and 1600px. The 1024px page had no
horizontal overflow; the sticky toolbar stayed visible; and at 1600px the tabs
spanned the 1,124px Shipment Header plus Document Review work surface with no
horizontal overflow. No shipment field, document,
charge, line, status, or export was changed. Next action: after explicit
frontend-release approval, publish normally and repeat the same no-write
hosted-domain check.

The Pricelists navigation refactor is complete in source and not deployed.
Pricing navigation now enters through `/admin/pricing/pricelists`; users choose
a version before opening the RX, Stock, or Supplies section at
`/admin/pricing/pricelists/:versionId/:section`. The editor shell retains each
visited section so local drafts survive tab changes, aggregates dirty state,
and guards Back, other route exits, and browser unloads. Invalid version IDs
show a returnable not-found state and never fall back to the first version.
Legacy pricing URLs and Product Catalog price links tunnel through the version
table. Existing hooks, price calculations, saves, previews, exports, and
adjustment-materialization confirmation are unchanged; no migration or policy
change is part of this work.

Passed locally: focused Vitest coverage for navigation/save safety/materialized
adjustments, affected-file ESLint with no errors, `npm run build`, and
`git diff --check`. Authenticated external Edge QA on the local Vite build
confirmed the one-link sidebar, table search through real sequential typing,
name-to-RX default, all three version-scoped sections, legacy product intent
redirect, invalid-ID state, collapsed editor shell, stock draft retention across
section changes, and the unsaved-exit confirmation. The test draft was
discarded and no price was saved. Browser-unload registration is covered by the
focused source test; no production deployment or live price write occurred.

Next action: publish the normal frontend release after explicit deployment
approval, then repeat the route and dirty-state smoke checks on the hosted
domain without saving a price.

The 2026-09-11 repair is implemented locally across pricelist saves,
Gatekeeper polling/dispatch, shipment supplier defaults, and assistant-created
ticket attachments. Migrations
`20260911201657_pricelist_override_provenance_and_safe_materialization.sql`
and `20260911201702_gatekeeper_status_backoff_and_rx_fallback.sql` are deployed,
along with the changed `gatekeeper-orders` Edge Function and frontend.

Before implementation, the live `pricelist_line_overrides` table had 481 rows
and three duplicate logical-key groups. An exact off-repository snapshot was
captured; the migration intentionally does not deduplicate those groups or
attempt to recreate previously deleted prices. The live Gatekeeper connection
was staging; outbound delivery, status polling, and cron job 233 were disabled
without changing its credential.

Focused validation passes: 22 Vitest tests across six files, full quiet ESLint,
PR checks, and the production build. The full Vitest sweep has two known
unrelated CRLF-sensitive failures in
`assistantUserMemory.integration.test.ts`. Live catalog verification confirms
271 manual plus 210 generated overrides and the production-only route guard.
`npm run qa:edge-smoke` was attempted after deployment, but all 40 probes failed
before HTTP because this workstation cannot complete certificate revocation
checking; the Lovable deployment completed. External Edge browser QA on the
published custom domain confirmed that a typed percentage change opens the
default `Preserve manual prices` action beside the separately destructive
`Replace all line prices` action, then exited without saving. It also confirmed
that choosing supplier BPI, which has no earlier shipment, preserves the typed
`Stock Lens` Type and `Browser QA commodity` Commodity values; no shipment was
created. The Integration screen shows the staging connection and outbound and
automatic polling controls disabled. Required next action: keep polling
disabled until an administrator supplies a fresh production Gatekeeper PIN and
a read-only authentication/contract/status pull succeeds. A real fallback order
requires separate approval and authoritative OptiLens Local proof.

HA Optical's production stock-order catalog is live and orderable. The live
database repair corrected `get_stock_order_catalog`, converts stock-lens pair
prices to per-lens order prices, fixes the three incorrect Innova family links,
and adds the missing SKU variants. The corresponding source migration is
`supabase/migrations/20260909203000_fix_ha_stock_order_catalog.sql`.

Order `DC30B7E3` was released to Innovations on 2026-09-09 with reference
`H A STOCK ORDER`, 17 lines, 36 pieces, and an authoritative $1,403.00 total.
The local source also removes `setStaged(null)` from stock-order line edits so
autosave updates one draft instead of creating a new draft for every edit.
That frontend fix is tested but not deployed. Passed: `npm run build` and
`npx vitest run --coverage=false src/tests/integration/adminStockOrdersRouteAccessibility.integration.test.ts`
(7 tests). Next action: publish the normal website frontend release containing
`src/pages/admin/StockOrderBuilderPage.tsx`, then verify that two consecutive
SKU scans retain one draft id.

The previously active Scotia continuation remains below.

The approved Scotia card-payment work is implemented in source: statement
amounts no longer wrap; `/admin/settings/payment-activity` is an admin-only,
minimal confirmation ledger; and the statement dialog requests saved-card
tokenization before the hosted Scotia redirect. The new migration
`20260904170609_card_payment_activity_and_statement_token_save.sql` creates a
security-invoker activity projection, clears existing raw Scotia request and
response parameter bags, and persists a provider token only after a signed
approved statement callback. Scotia event logging now retains only scalar
reconciliation fields. `supabase/functions/scotia-return/index.ts` adds the
safe saved-card confirmation flag.

- Passed: `npm run lint`; focused
  `adminPaymentActivityRouteAccessibility.integration.test.ts` (4 tests);
  `npm run build`; and `npm run qa:pr-checks`. A local browser visit to the
  admin route redirected an unauthenticated user to sign-in, confirming the
  route guard.
- Known baseline test failure: `npm run test -- --runInBand` stops at three
  existing admin-route tests that still assert the superseded `lazy(() =>
  import(...))` loader rather than the repository-wide `lazyWithRetry` loader
  now used in `AdminRoutes.tsx`. The new payment-route test uses the current
  loader contract and passes.
- Blocker: local Supabase Docker engine is unavailable, so generated types and
  local database/RLS tests could not run; the Deno CLI is also absent, so the
  Edge Function unit test cannot run locally. The local UI shows its expected
  unavailable-data state until the migration is deployed.
- Approval required: apply the migration and deploy `scotia-return` before any
  shared-environment verification or safe test transaction.
- Next action: after approval, deploy the migration and `scotia-return`, run
  `npm run qa:edge-smoke`, then complete one approved non-production Scotia
  statement payment with and without the save-card option.

## Completed work

Iris's authorized internal operations prompt now recognizes the approved
employee shorthand: Roy, Randall, Russell, Lily, Tia, Kevin, Greg, and
Gregory are unique first-name references; Lisa must be specified as Lisa J or
Lisa K. The roster rule is documented in `docs/ai-assistant-identity.md` and
is intentionally excluded from the public assistant context.

The staff-only walk-in payment flow is staged at
`/admin/settings/walk-in-payments`. A staff member creates a server-side,
exact-amount `walk_in_payments` intent, then reaches the existing full-page
Scotia/Fiserv hosted card flow. Both signed callback paths settle that same
intent idempotently and the page shows/prints only the stored receipt fields
and masked card information. The website has no card entry controls. The
future QR/payment-link decision is documented in
`docs/scotia-ecom-hosted-payment-integration.md`: do not turn a Direct Sale
form post into a public link; first confirm that the merchant account supports
a hosted pay-by-link API, then bind a one-time opaque expiry token to the
server-stored amount.

External Edge verification completed on 2026-09-02 with an existing staff
session: the route rendered, amount/customer/order/reason controls accepted
real sequential keyboard input, controls were enabled and not readonly, and no
card-number/CVV/expiry fields were present. The Take payment button was not
submitted, so no payment intent or gateway transaction was created.

The public Companion Assistant now displays an in-progress state while its AI
generation request runs. Its deterministic high-confidence match is displayed
only when that request fails, making the grounded AI answer the visitor's first
answer. `supabase/functions/_shared/aiIdentity.ts` and
`docs/ai-assistant-identity.md` define Iris's public customer-experience and
authorized business-operations fronts, including her proactive operating
posture and hard authority boundaries. The staged portrait in the public
assistant header now opens an in-page Iris profile with the approved title,
bio, fictional-avatar/AI disclosure, and explicit separation between public
guidance and the separately authorized operations workspace. Her shared prompt
uses she/her pronouns and a poised, warm, feminine, capable voice while
retaining the existing anti-impersonation and authority limits. Quote/support
launch compatibility now stays on the current page rather than opening or
redirecting to a standalone assistant window.

`public/images/iris/iris-ai-operations-partner.png` is a staged fictional AI
portrait. No external account, email identity, LinkedIn profile, Supabase
authorization change, or Edge Function deployment has
been performed; those actions require explicit approval.

The business owner approved actor-scoped Iris access, with a customer portal
user limited to their ERP-linked account, financial data reduced for users
without that capability, and a future admin-only controlled SQL gateway using
fresh single-use authorization. The complete contract is
`docs/iris-data-access-contract.md`. The staged migration
`20260830140634_iris_financial_data_capability.sql` exposes a server-side
admin-only capability, and `portal-copilot` now passes that resolved value into
the financial-marked typed resources. `admin_*` typed tools remain the only
Admin Copilot data path; the direct SQL gateway has not been implemented.

## Verification

- Rx mount compatibility repair (2026-09-07): assistant handoffs now emit
  `plastic`/`grooved`, and restored drafts normalize historical `full`/`supra`
  before validation, pricing, summaries, or printing. The focused mount
  regression assertions pass. The broader prefill test file retains its known
  unrelated `#ftemple` assertion failure because that control is absent from
  the current markup.

- Passed: `npx vitest run --coverage=false src/tests/unit/CompanionAssistant.test.tsx src/tests/unit/embeddedRxOrderDraft.unit.test.ts` (9 tests), including the public profile/disclosure and in-page launch regression.
- Passed: `npm run build` after the public profile, persona, quote-launch, and saved-Rx changes.
- Passed: focused ESLint with 0 errors (existing warnings remain in the edited legacy files).
- Pending rendered screenshot evidence: the local Vite server started successfully, but Playwright's Chromium binary is absent and its download is blocked by `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Re-run the local desktop/mobile browser check after the workstation trust chain is repaired or a browser binary is installed.
- Passed: `npx vitest run --coverage=false src/tests/unit/CompanionAssistant.test.tsx src/tests/unit/companionAssistantEngine.unit.test.ts` (10 tests).
- Passed: `npx eslint src/components/assistant/CompanionAssistant.tsx src/features/assistant/companionAssistantEngine.ts src/tests/unit/CompanionAssistant.test.tsx src/tests/unit/companionAssistantEngine.unit.test.ts` (three existing warnings in `CompanionAssistant.tsx`; no errors).
- Passed: `npm run build`.
- After deploying the changed `companion-assistant` function, run `npm run qa:edge-smoke`.

## Pending deployment

- Do not deploy `20260902154434_staff_walk_in_payments.sql` or the changed
  `scotia-payment`, `scotia-return`, and `scotia-notify` functions without
  explicit approval. After a non-production deployment, sign in as an
  admin/operator, type a test amount and customer name in an external Edge or
  Chrome session, complete Scotia's approved test-card flow, and verify the
  settled receipt plus masked card output. The existing gateway configuration
  must be confirmed first; no production payment or credential was used here.

- Do not deploy the financial capability migration or the updated
  `portal-copilot` function without explicit production approval.
- Customer statement and balance access retains the existing account-level
  feature/tag gate; do not broaden it merely because a user is ERP-linked.

## Lead Finder CRM matching and follow-up (2026-10-07, local source)

- Changed: `supabase/functions/lead-intelligence/{crmMatching.ts,index.ts}`, migration `20261007150000_lead_finder_crm_matching.sql`, `src/features/admin/leads/{types.ts,hooks/useLeadFinder.ts,hooks/useLeadActions.ts,components/*}`, `src/pages/admin/leads/LeadFinderPage.tsx`, tests `src/tests/unit/leadFinderCrm*.test.ts(x)`. Behaviour and rules: `src/features/admin/leads/CONTEXT.md`.
- Passed: 43 focused tests, `npx tsc -p tsconfig.app.json --noEmit`, eslint (0 errors).
- NOT done / needs approval: applying the migration, redeploying `lead-intelligence` (then `npm run qa:edge-smoke`), frontend publication, any live write. No database was available locally, so the RPC transaction, concurrent-save and rollback behaviour are covered only by static SQL contract tests. Before release run on a database: repeat save (no duplicates), concurrent save, `name_conflict` rollback, link-to-customer exclusion on the next search, clear link/mark.
- Known edges: `contacts.country` is unreliable (see CRM data-quality notes) so country alone never auto-matches; city is required. Un-checking Needs follow-up later does not cancel an existing task.

## Public Contact us / Get support attachments — 2026-10-09

Status: Complete — no active handoff

Implemented, committed, pushed and deployed with the user's explicit authorization through Lovable MCP. Contact us and Get support now share document/image/audio browse, paste and drop controls; Iris chat files carry into the request. The constrained-height form scrolls without overlapping its fields or file rows. Admin ticket creation already uses the shared picker.

Release source, migration/function deployment, publication verification, test results and remaining verification limits are recorded in docs/agent/PUBLIC_SUPPORT_ATTACHMENT_RELEASE.md. No real support request or email was sent. Employee-name mention/routing remains outside this attachment change. Other concurrent visitor-conversation edits were preserved and excluded from this release.

## Portal support sends — 2026-10-09

Status: Source repair complete; repository delivery authorized. Frontend publication and named live send remain pending.

Affected: CustomerOrdersPanel.tsx, CompanionAssistant.tsx, CompanionAssistantContext.tsx/shared.ts, useCreateHelpdeskTicket.ts; CompanionAssistant.test.tsx, helpdeskTicketCreation.test.tsx, CustomerOrdersPanel.test.tsx and continuity docs.

Reproduced in tests: a failed creation rejects without visible feedback; a failed post-insert timeline write makes an existing ticket look failed and prevents its notification; email failures/skipped recipients are silent. Admin notification default was false. Fixes preserve the existing actor/contact audience contract, expose send errors, retain drafts, warn for secondary failures and prevent concurrent sends. No migration/function/auth changes. Hosted metadata was read only; no ticket or email was submitted.

Checks: 22 focused tests pass, including duplicate confirmation. Build passes; full lint 0 errors / 2431 warnings, focused lint 0 errors / 28 warnings. PR checks pass after release-ledger synchronization. Full tests: 225 passed / 4 failed files, 1500 passed / 4 failed tests; untouched failures are adminPortalCopilot credential-source contract, rxFormChemistrie clip timeout, rxOrderDomain seeded-scenario timeout and rxOrderShape outline A assertion. Final TypeScript check passes after correcting the test fixture customer ID to the existing numeric contract.

Browser opened the real local admin contact order dialog: notification checked, selected contact/staff copy, confirm control. At 390x844 the 358px dialog fits; at 320x568 it is 288x536 with a 633px scrolling body and 16px inputs. Cancel works. Local profile support form at 390x844 is 332x560 with a 605px scroll body, 16px inputs and 44px send button. No financial/order/send button clicked. Temporary viewport overrides restored; profile preview tab closed. No new ticket or email submitted. Review screenshot is a chat-local artifact.

Approval required: frontend publication and one explicitly named account/contact plus exact test-message content for a production ticket/email check. Real mobile keyboard and recipient inbox delivery remain unverified. Repository delivery (2026-10-09): user authorized committing and pushing all changes and redeploying Edge Functions only if needed. No Edge Function or config delta exists in the working tree or unpushed branch commits; no function redeploy is needed. No live ticket/email test is authorized. Next executable read-only release review: git show --stat HEAD

Ticket title follow-up (2026-10-09, local): portal Helpdesk list rows and their text flex child now allow shrinking. The title uses one-line ellipsis with a full-title hover attribute; stored text and ticket navigation stay unchanged. Status/date can wrap on narrow screens. This ships with the pending portal send repair.
Truncation browser proof: existing 433-character ticket titles have ellipsis inside their rows; document scroll width equals viewport width at 1287px and 390px. Stored titles are untouched. Scoped ESLint: 0 errors / 2 existing warnings.

## Email viewport spacing — 2026-10-13

Reply HTML follow-up (2026-10-13): Source repair complete, rendered verification pending. `EmailPage.tsx`, `format.ts`, `ComposeDialog.tsx`, `EmailBody.tsx`, `emailHtml.ts`, and `emailHtml.test.ts` now preserve the selected message's HTML in an expanded sandboxed quote preview and the outgoing HTML, with a plain-text alternative. Five focused tests, scoped lint, TypeScript and build passed. Local bridge requests currently fail with “Can't reach the mail bridge,” so the annotated message could not be reopened for visual proof. No message was sent. Approval required before production frontend publication. Next exact read-only action: once the bridge is reachable, open `http://localhost:8080/admin/email?account=russell-classicvisions-net&folder=23&message=2494`, click Reply, and inspect the expanded HTML quote without sending.

Status: Complete — no active handoff.

The Email route uses 5px admin-content padding on every side; its page fills the available shell height instead of subtracting a fixed amount from the viewport. At the local 1483x900 browser viewport, the reading pane ends at y=895, leaving the intended 5px bottom inset. This is a local source change only; no deployment or mail action occurred.

Follow-up annotations complete in local source: the mailbox and message-list borders resize from `md` upward, while the CRM border resizes from `xl` upward; all three separators also accept arrow keys. The CRM panel can be hidden and restored. Unread rows have a tinted background, and the dark toolbar/article borders use #294366 with a 1px article border. Browser checks confirmed drag on all three separators, keyboard resizing, CRM hide/restore, and computed dark border values. Scoped ESLint, TypeScript, and build passed. No email was sent or production release performed.

Additional local source follow-up: split New mail control and grouped ribbon menu, stronger selected-message shade, 2px visible resize separators with an 8px hover target, per-folder collapse controls (including Inbox when it has children), and bounded previews for image, PDF, text, and CSV attachments. The CSV parser has focused tests. Local browser verification for this additional follow-up was blocked by the browser URL policy after the previously open localhost tab became an error page; do not treat source checks as rendered proof. No mail or CRM action was submitted.

Search/ribbon follow-up (2026-10-13, local source): app-wide search on Email now puts accessible Inbox hits before existing site results; the ribbon keeps folder search and Sync pinned to its right edge and moves actions into More by available width. Browser layout checks at 1138px and 1864px passed; no live search result or mail action was submitted. TypeScript and build passed; scoped lint has zero errors. The bridge currently supports folder-scoped search only, so global mail search covers accessible inboxes rather than all mail folders. Production publication still needs approval.
Search/ribbon status: Source complete; authenticated search result verification pending. Affected files: `src/components/admin/GlobalSearch.tsx`, `src/pages/admin/email/EmailPage.tsx`, `src/features/admin/email/CONTEXT.md`, `STATUS.md`, `docs/agent/PROJECT_KNOWLEDGE.md`, and this handoff. Approval required: production publication. Next exact read-only action: in an authenticated external Chrome or Edge session, open `http://localhost:8080/admin/email`, type a known Inbox subject into the top search box, and confirm an Email inbox result opens the matching message while site results remain below it.

Status for the additional follow-up: Source complete; rendered browser verification pending. Affected files are EmailPage.tsx, csvPreview.ts, emailCsvPreview.test.ts, Email CONTEXT.md, and this handoff. Focused CSV tests, scoped ESLint, TypeScript, build, and `git diff --check` passed. The blocker is the Codex browser URL policy, not a source error. Production deployment requires explicit approval. Next exact action when the local URL becomes allowed: open the Email page in the Codex in-app browser and check the New menu, unselected and selected ribbon, CSV/image/PDF preview, selected-row shade, folder collapse, and 2px dividers without sending or moving a message.
## 2026-10-19 — RX stock/supplies order UX

Follow-up refinements: patient, reference, PO, and compact special-instructions fields remain visible in the main form; patient is optional, order reference is required and max 20 characters, PO is max 15. Only item selection is in a compact modal with treatment-dialog framing; its description identifies account-priced published stock lenses and supplies. The existing account-scoped stock catalog remains the source. Validation for this follow-up is recorded below after completion.

Status: Complete — no active handoff. Visual verification superseded by the stock entry/selector check above; no deployment or order submission.

Affected files: `src/features/rx-order/form/StockServicePanel.tsx`, `src/pages/admin/StockOrderBuilderPage.tsx`, `STATUS.md`, `docs/agent/PROJECT_KNOWLEDGE.md`, and `docs/agent/INTEGRATIONS.md`. The RX stock/service item picker and order metadata now open in a modal. Instructions read “Special instructions (optional).” Order reference is marked required and blocks draft persistence/release in the RX panel; the standalone Stock Order Builder also marks it required and blocks release without it. Chiral lens variants (only) have Pair (default), Left, and Right selection; pair maps to the existing `either` side code.

Validation: scoped ESLint completed with 0 errors and existing warnings; `npm run build` passed; `git diff --check` passed. Full `npm run lint -- --no-warn-ignored` ran for over 30 seconds without output and was interrupted; do not treat that as a pass. No tests were run. No visual browser verification, order submission, or deployment occurred.

Continuation closed: current stock entry, theme, dropdown, catalog/power and local-line checks are recorded above.
## 2026-10-19 — Dashboard dependency recovery

Status: Complete — no active handoff

The dashboard showed a Vite import-analysis overlay for @zxing/browser in StockCameraScanner.tsx. Both ZXing packages were declared in package.json/package-lock.json but `npm ls @zxing/browser @zxing/library` returned empty. Restored node_modules with `npm ci`; two attempts first failed with EPERM because the app and standalone prototype Vite processes held Lightning CSS open. Stopped those local previews, completed npm ci, then restored both using their existing configurations. No application source, manifest or lockfile edit was needed. Context changes: STATUS.md, PROJECT_KNOWLEDGE.md and this handoff.

Validation: npm ci and npm ls pass; npm run build passes with existing config/chunk warnings. Dashboard and scanner module return HTTP 200. Fresh authenticated browser renders the dashboard without an error overlay; console warning/error log is empty. Prototype root also returns HTTP 200. No camera permission, order write, hosted deployment or credential change. Lint and tests were not rerun for dependency restoration and context-only edits.
