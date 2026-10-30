# Frontend Runtime Module Docs

## 2026-10-30 - HR phase 3: Leave, income tax, deduction overrides, employee contacts

- `/admin/finance/leave` (feature `hr`) and `/admin/finance/tax` (feature `payroll`) sit behind `HrRoute`. The employee page gains Leave and Tax tabs; `?tab=<value>` opens a tab directly.
- Leave balances are computed in the browser by `src/features/admin/hr/leave/leaveBalance.ts`: entitlement tiers granted on each hire anniversary from `leave_policy.tracking_from`, the carry-over cap applied before each grant, then adjustments and approved requests. `unpaidLeaveInPeriod` feeds `usePayroll.buildPayslip`, which adds a negative taxable earning (base pay ÷ working days in the month × days), so NIS and PAYE fall with it.
- Payroll engine: `statutoryRounding` (default `dollar`, halves up; tests use `cent` for BRA's examples) and `overrides` keyed by `deductionKey` (`nis`, `paye`, `rr_levy`, `item:<recurring item id>`). Overridden lines keep `calculated`; overrides live in `payslips.overrides` and are carried through recalculation with adjustments.
- `src/features/admin/hr/tax/annualTax.ts` holds dated `TAX_YEAR_RULES` (add a row per year, never edit a past one); `useTax.estimateYear` adds opening figures from `employee_tax_years`, the year's payslips (drafts included) and projects the remaining months from the latest payslip.
- Contacts: deletes go through the `delete_unlinked_contacts` RPC (`deleteUnlinkedContacts` in `useContacts.ts`); the `contacts_delete_guard` trigger also blocks direct deletes of linked contacts. `ContactPickerSelect` is reused on the employee profile.
## 2026-10-30 - In-app confirm dialogs

Native `window.confirm/alert/prompt` are banned by ESLint `no-alert`. React code uses `useConfirm()` from `src/hooks/useConfirm.tsx`: render `{confirmDialog}` once in the component and `if (!(await confirm({ title }))) return;`. Vanilla engines bundled by Vite use `inAppConfirm`/`inAppPrompt` from `src/lib/inAppDialog.ts`; static scripts under `public/ds` use `window.__cvDialog` from `public/ds/in-app-dialog.js`. The pricelist editor's capture-phase link guard now always cancels the click and re-navigates after the dialog resolves.

## 2026-10-30 - HR phase 2: Payroll runs

`/admin/finance/payroll` and `/admin/finance/payroll/:runId` sit behind `HrRoute`; the sidebar link maps to the `payroll` feature. `src/features/admin/hr/payroll/engine.ts` is a pure monthly payslip calculator (integer cents, half-up rounding) driven by the dated `STATUTORY_RULES` table: add a row when BRA/NIS change a rate, never edit a past row. `usePayroll.ts` loads employees, compensation, recurring items and splits, calculates in the browser and replaces a draft run's payslips on every create/recalculate (one-off adjustments are carried over). Approval goes through the `approve_payroll_run` RPC; DB triggers lock approved/paid runs. Run actions confirm through an `AlertDialog`, not `window.confirm` (embedded browsers dismiss native dialogs silently).

## 2026-10-29 - HR phase 1: People module and office_admin role

`AppRole` gains `office_admin` (staff access, canEdit, `canHr`). `/admin/finance/people` and `/admin/finance/people/:employeeId` are wrapped in `HrRoute` (realRole admin or office_admin, mirroring `can_hr()`); the Finance sidebar hides links whose `PATH_FEATURE_MAP` feature is `hr`/`payroll` when the role lacks `can_view`. Data hooks live in `src/features/admin/hr/useEmployees.ts`; sensitive IDs are fetched only on an explicit "Show details" click via `reveal_employee_sensitive`, which writes an audit_log row.

## 2026-10-28 - Admin order recovery and capture patient identity

In Rx & Stock Orders, staged/failed admin-created stock submissions without transport, receipt, or website order linkage open in the stock builder with account, reference, PO, instructions, raw lines and active variants restored. Staff correct the details and explicitly submit again. Delete blank is limited to empty raw/priced lines, zero total, eligible status, no dispatch evidence, no linked web order, and no supplemental invoice; the server's existing admin delete policy remains in force. Rx capture intake and workspace rows display extracted patient name with the customer account. No schema or Edge Function change.

## 2026-10-28 - Business research in Notes and CI repair

crm-enrich-contacts research mode also returns the model's written summary (instructions now ask for a labelled business profile); research now uses a market-intel prompt (medium search context, up to four tool calls, 2,500 output tokens) and includes the saved website in the query; the contacts list gains Add market intel to notes, which researches and saves selected contacts sequentially (max 25, stops at the daily cap); new `contactResearch.ts` shares the research fetch with Research public web and formats the Notes block, appended to the editor draft and reloading the notes editor. CI repair: `npm audit fix` cleared zod, body-parser, undici and fast-uri advisories (lockfile only); regenerated the public content search index; refreshed six stale contract tests (live-data-gateway selects, lens-assistant hidden redirect, Website sidebar order, LabLink embed copy, launcher shortcut label). Full suite passes locally (1774 tests).

## 2026-10-22 - Native PDF viewer and spreadsheet previews

PdfViewer renders the browser's PDF viewer in an unsandboxed iframe (Chrome refuses it in a sandboxed frame) on a blob URL when navigator.pdfViewerEnabled and a fine pointer are present; otherwise it keeps the pdf.js canvas path. The blob keeps cross-origin signed URLs inside CSP, so frame-src now allows blob:. src/lib/spreadsheetPreview.ts detects csv/xlsx and reads the first 200 rows and 40 columns of each sheet (read-excel-file is dynamically imported; 1 MB csv and 5 MB xlsx caps). SpreadsheetPreview and SpreadsheetPreviewDialog (src/components/files) serve admin email attachments and helpdesk attachments; attachmentPreviewKind reports xlsx. Legacy .xls is not previewed.

## 2026-10-22 - CI repair (Rx workspace, OAuth rewrite, dependencies)

Rx Orders workspace now attaches the original error as `cause` when a release is rethrown. The `/~oauth/:match*` Vercel rewrite is restored ahead of the SPA fallback. Vite and follow-redirects moved to patched versions via `npm audit fix`. No behavior or database change.

## 2026-10-20 - Alert sound and read performance

alertSound.ts shares a gesture-unlocked Web Audio context, Web Locks/storage cooldown and bounded event receipts and mute preference. NotificationBell detects new IDs without ringing initial backlog; operator attention calls once per batch after snooze loading. useProductVariants polls existing database RPC every eight hours while mounted plus mount/focus/reconnect; activeOnly is part of the cache key. WebsitePortalsPage overlaps CRM/contact and activity reads, caches for one minute and enables order/address/payment hooks only with a selection. Existing other callers retain current-user behavior. No server cron, backend change or auth change.


Lead capture (2026-10-20): Auth.tsx sendLeadSignal now calls submitPublicInquiry with inquiryType auth_onboarding_interest instead of inserting into public_inquiries, so signups reach contact-inquiry (CRM lead, helpdesk ticket, owner lead-alert email). Failure stays non-blocking for account creation. The edge side (contact-inquiry, _shared/leads, _shared/crm) is in supabase/functions.

Portal controls (2026-10-20): WebsitePortalsPage shares two-state switches and canonical assigned-pricelist Edit links across embedded/fallback settings. portalFeatureToggleValue preserves existing unset inheritance; writes remain explicit booleans. New profiles receive all-false overrides only after the pending INSERT trigger migration is approved/applied.


Doc Studio annotations (2026-10-20): dashboard sublinks come from the feature navigation list, reordered by browser-local per-user module use. Studio applies tab/billType on the existing canonical route; section changes keep the URL in sync. Initial billing type changes detach the local draft instead of autosaving over an open file; file/invite handoffs win. Structural classes on the established template own the square outer workspace panels. The shared admin-topbar class owns the square admin header. Controls and paper templates retain their styles.


Localhost data transport (2026-10-20): shared Supabase global fetch and the Doc Studio bridge use the Vite loopback proxy in development. Project URL/session keys and caller authorization remain unchanged; production builds connect directly. Request URL replacement explicitly preserves method, headers, body, cancellation and fetch options. No environment key values belong in documentation.


Doc Studio Innovations invoice import (2026-10-20): the established studio runtime calls a loader registered by DocStudioEmbed. It resolves the account through synced statement references or selected customer, then calls requestLiveData for innovations.customer_invoice. Mapping preserves source amounts and provenance, fails on missing prices, and detaches the imported draft from the open saved file. Native v2 remains unchanged.


Stock entry/pickers (2026-10-19): StockOrderEntry redirects fresh visits to the canonical Rx new form with type=stock, preserving quote/highlight editor links. RxForm receives initialOrderType; the host keys new form mounts by mode. Shared ComboBox uses Radix Popover Anchor/Portal/Content with collision padding and available-height bounds while keeping keyboard focus in its input. Shared Seg uses scoped rx-segment styles for explicit theme contrast.

Stock form integration (2026-10-19): RxForm renders StockServicePanel keyed by selected account and offers only Rx / Stock-supplies. Stock mode cancels its Rx autosave timer. The runtime panel imports new category/lens browsers and stock-order-form.css; no prototype modules or seeded values are imported. Shared Rx selectors/domain logic and LensVariantGrid are reused with account-scoped products. Pair conversion, per-eye OPC validation and quantity limits live in stockOrderModel. Existing stock hooks own all server reads/writes.

Selected prototype theme (2026-10-19): shared-ui.css imports styles/workspace.css and maps Tailwind semantic colours to --ws-* tokens. The standalone body opts into ws-admin/admin-tool; Plus Jakarta Sans and JetBrains Mono come from existing font packages. One layout and compact identification replace variant/host/step rendering. Existing ?variant links normalize to the same form.

Prototype lens UI refinement (2026-10-19): `prototype/LensPicker.tsx` mounts the existing Rx Seg/ComboBox and pure comboOptions/repairTriple alongside LensVariantGrid with seeded variants and a local callback. Source alias resolution and local Tailwind compilation are confined to the standalone Vite config. Shared LensVariantGrid accepts optional addButtonLabel with the previous cart label as default. No app-shell or client import.

Stock / supplies design study (2026-10-19): `src/features/rx-order/prototype/vite.config.mjs` defines an independent local Vite root with environment loading and public assets disabled. Its plain-JavaScript seeded UI imports no application client and adds no runtime route. `npx vite --config src/features/rx-order/prototype/vite.config.mjs` runs it. The main application build excludes this entrypoint. The single selected layout uses only in-memory state; standalone builds target an ignored Node cache directory.

Rx sidebar offset correction (2026-10-17): AccountLayout selects `relative` for the Rx sidebar and retains `sticky top-16` elsewhere. The Rx content row's bounded overflow had become the sticky containing block and applied an extra 64px offset. The existing inner form scroller remains the sole Rx scroll owner.

Rx uncut supply (2026-10-17): `frameSourceForScope` normalizes form defaults, scope changes, load/save and summaries. FrameCard uses a disabled Uncut display for uncut jobs. PortalRxOrderForm passes an `introduction` into the scrolling RxForm root; LensAssistantSection retains only the fixed title. No new effect writes form state.

Portal Rx scroll ownership (2026-10-17): AccountLayout bounds the Rx route only; LensAssistantSection fixes the title outside RxForm's overflow container. A portal-only toolbar/steps group sticks at the frame top. RxStickyLayout observes actual control/frame sizes, including bottom padding, for QuotePanel height/offset and section jump margins. The observer is isolated from Rx values and persistence. Admin layout and the `lg` quote breakpoint retain their existing behavior.

Pricelist education (2026-10-17): `PricelistDesignInfo` uses Radix popovers for design definitions; treatment tooltips reuse accordion buttons without nesting interactive controls. Shared public progressive/photochromic data lives in `src/data` and remains indexed by public search. Pencil visuals shrink without reducing the expanded hit area.

`components/account/pricelistCurrencies.ts` merges configured currencies with the existing indicative EUR/XCD display rates, formats currency symbols, and converts retail overrides through BBD. `RxPricelistCell` uses a 320px maximum width, two-column details, mouse-only hover opening, persistent tap opening, explicit close and 44px targets. No pricing-settings write or new service.

My Orders invoice totals (2026-10-17): shared `InvoiceLines` in `MyOrdersSection.tsx` renders a semantic table footer, sums displayed amounts once in cents, and leaves incomplete totals unavailable. No new fetch, data write, or feature gate.

Pricelist handoff (2026-10-17): `RxPricelistCell` replaces matrix tooltips with a responsive interactive popover. `pricelistLenses.ts` follows each assigned matrix row's selected lens ID through confirmed alias mappings, preferring its primary; the result is one canonical form selection or no resolved selection. `PortalRxOrderForm` passes a fresh `lens` selection to `RxForm`; `prefill/pricelistLens.ts` fills lens/vision fields only. The form resolves price from its current account catalog and follows normal autosave. Existing draft/edit/reorder takes precedence, missing selections are reported, and Start another clears the initial alias.

Rx/pricelist annotations (2026-10-17): RxForm's portal print action mounts the existing print portal without explicitly saving; admin still saves first. QuotePanel mounts GrossMarginEstimate only for visible, ready, priced quotes; its local selling-price state never enters persisted order data. AssignedPricelistsSection uses existing secondary teal tokens and matrix focus/hover tooltips. Live form input still autosaves after 1.5 seconds; synthetic browser tests belong in the fixture bench.

Homepage copy (2026-10-17): section introductions are owned by `src/components/home/HomePage.tsx`; category labels are shared through `homeContent.ts` (`patientLensExplorer` slices `lensExplorer`). Copy edits retain the existing responsive classes and require regenerated public search prose.

Atlas local source (2026-10-08): repaired browser preference synchronization and per-user sidebar isolation; width stays through Update/reload. New generated identifiers and explicit shared links remain stable through renames. Shared published pages require website sign-in, permit forwarded links, and record administrator-visible account/page/version/time access. Draft/unshared/inactive/locked/secret pages are denied by the audited RPC. Sharing migration and frontend are not released; see docs/agent/HANDOFF.md.

CRM follow-up (2026-10-07, local source): contact Places lookups now use Places API (New) searchText and details endpoints, header credentials and explicit field masks. Business-name similarity is scored separately from location search context; ambiguity thresholds stay intact. Manual research combines Google Places listing details with OpenAI cited web sources when configured, records one attempt per provider, and shows unavailable/failed providers alongside successful results. Google errors count as failed enrichment rather than Nothing new found, including responses from older deployments. Scheduled enrichment remains Google-only. Deployment, Places API (New) enablement/key restrictions and billable live lookup verification remain pending; no Google configuration or credential changes were made.

## 2026-10-15 — Email Previews resend (local source)

`EmailDeliveryHealthCard` shows Resend on the latest log row of each stored message and opens `ResendEmailDialog` (resend-info lookup, editable recipient, optional contact update). Backed by `docstudio-api` `email/resend-info` and `email/resend` and the `email_resend_payloads` table written by `sendManagedEmail`. Emails with attachments, and anything sent before deployment, have no stored body and no Resend button.

## 2026-10-07 — Lead Finder CRM matching and follow-up (local source)

LeadFinderPage composes `LeadCrmPanel` and `LinkContactDialog`; link, customer-mark, correction and save all call SECURITY DEFINER RPCs (`lead_finder_*`), never table writes. Search results carry `identity_key` and `crm` state; `diagnostics.excludedCustomerCount`, `crmLookup` and the `only_current_customers` empty reason are new. See `src/features/admin/leads/CONTEXT.md`.

## 2026-10-07 — CRM research provider

PublicWebResearch retains its existing response contract and draft-only actions. The administrator-only crm-enrich-contacts research mode now returns citation-derived sources from OpenAI Responses web_search; no client key or frontend API integration is introduced. See docs/crm-contact-editor-follow-up.md for server configuration and release limitations.


## 2026-10-07 — Doc Studio recipients, signatures and labels

The established runtime lives in public/ds/studio-logic.js and studio.html, mounted by DocStudioEmbed. Picker listeners clean up on unmount and retain To during dismissal. Signatures use inline tables and hosted PNG plus 3x canvas alternatives; clipboard failures are surfaced. shiplabel payloads preserve slMode/slFromCaption/slToCaption with legacy shipping defaults. Generated support.js and the native v2 gateway remain untouched. See Doc Studio CONTEXT and docs/doc-studio-signature-compatibility.md.

## 2026-10-07 — CRM contact editor

ContactsPage uses CompanyCombobox, contactEmails and PublicWebResearch. Full-pipeline save guards prevent duplicate inserts; retained link fields avoid reverting a newly selected ERP customer on the next save. Research calls existing admin-only crm-enrich-contacts with mode: research, reads saved context and returns source evidence without automatically changing CRM fields. See `docs/crm-contact-editor-follow-up.md` for office integration and recipient-audit limits.

## 2026-10-07 — Admin attention dropdown

OperatorAttentionAlert mounts once inside AdminTopBar, shared by AdminLayout and AtlasAdminFrame. The controlled Radix popover starts closed, aligns to the trigger end and scrolls all items. Dismissal changes local presentation state only; the existing attention hook owns polling, sound, qualification and Snooze.

## Iris wiki content conversion

Atlas converts Iris Markdown with unified, remark-parse and remark-gfm into canonical blocks. Replies and proposals share WikiArticleRenderer; acceptance inserts canonical Tiptap content, including marks for inline selection replacements. Stored plain-text drafts are not automatically rewritten.

## 2026-10-05 — Atlas

- **Where:** `src/features/atlas/` (read its `CONTEXT.md`). Routes `/atlas/:space/:articleSlug?` are mounted in `App.tsx` behind `AdminProtectedRoute` and registered in `routeRegistry.ts` (`standalone-shell`). The old admin URLs are redirect-only.
- **One shell, data-driven spaces:** `spaces.ts` defines Wiki, SOPs (a published-only filter over the wiki's stored pages) and Website; `registerAtlasSpace` / `registerAtlasHost` add more. A space declares scope, layout (`tree` or `database`), saved views, properties and capability rules. Nothing else switches on a space id.
- **Capabilities:** `resolveCapabilities` maps each space's rules onto the host permission system (`wiki` feature for Wiki/SOPs; the admin role's access/edit/admin for Website). Edit, publish and remove all require view.
- **Storage:** UI code uses `AtlasSource`; `createHelpArticlesSource` maps pages to `help_articles` (`space` column, falling back to `content_type`). Business-specific data (option lists, contexts, company name, the Iris provider) is registered by `src/config/atlasHost.ts`.
- **Write path:** `usePageEditor` (autosave 800 ms; published pages edit the draft copy; Update/Publish call `saveVersion` and record history). `validateForSave` gates every publish (editor, bulk, board). Slugs are never backfilled (`null` slug leaves the stored value alone) and are refreshed into the list before the URL changes.
- **Database views:** URL state `?tab=`, `?view=`, `?status=`, `?sort=`, `?q=`, `?peek=`. Blog is an interim embed (`blog-posts`) until a blog adapter exists.
- **Install:** manifest and icons come from `config.ts` via `npm run atlas:assets`; `atlas-sw.js` caches the shell only.
- **Iris:** `IrisPanel` asks the host provider and renders a proposal; `acceptProposal` applies it to the draft. Import (`import/`) and export (`exportSpace.ts`) are storage-independent.

## 2026-10-05 — Admin workspace theme and wiki block editor

- **Theme:** `src/styles/workspace.css` defines the `--ws-*` tokens on `.admin-tool` and `body.ws-admin` (light and dark). `AdminLayout`, `AdminDocsLayout` and `CopilotWorkspacePage` mount `useScrollingClass` and `useAdminBodyClass`. The colour-option tokens (`--ws-c-*`, `--ws-t-*`) are also defined on `:root` so page content renders colour marks on `/knowledge`.
- **Wiki workspace:** `/admin/knowledge/wiki[/:articleSlug]` renders `AdminWikiPage` inside `WorkspaceShell`. Tree moves are planned by `planPageMove`; favorites, page icon, cover and full width live in `localStorage` (`useWikiWorkspacePrefs`).
- **Editor:** `BlockEditor` holds a canonical `BlogCanonicalContent` and emits one on every change via `tiptapDocToCanonical`; remount it (change `key`) to load a different document. `RichTextEditor` is unchanged and still serves Doc Studio, the blog manager and helpdesk config.
- **Save path:** autosave (`autosaveDraft`, 800 ms, flushed when leaving the page) builds its row with `buildAutosaveUpdate`: settings (`summary`, `section_id`, `parent_id`, `sort_order`, contexts, and `slug` while unpublished) go to the live row; the body goes to `title` / `body_json` / `content` / `body_html` for unpublished pages and to `draft_title` / `draft_body_json` / `draft_saved_at` for published ones (`supportsDrafts` is detected from the rows; without the columns, published-page body edits stay local and `beforeunload` warns). `upsertArticle` (Publish / Update) still bumps `version_number`, writes `help_article_versions`, clears the draft copy and reports `historyRecorded: false` when the history table is missing (PGRST205 / 42P01) so the page can warn. `discardDraft` clears the draft copy. Dirty and autosave checks compare documents with `stableStringify` (`src/lib/stableJson.ts`) because jsonb returns object keys in its own order. Both migrations (`20261005121000_help_article_versions_table.sql`, `20261005120000_help_articles_draft_copy.sql`) are applied on the hosted project.
- **Lists:** canonical lists are flat; `depths` (list) and `depth` (todo item) carry nesting, converted by `nestByDepth` for rendering, HTML, Markdown and the Tiptap mapping. A nested list takes the type of the list it sits in.
- **Shared renderer:** `WikiArticleRenderer` → `BlogPostRenderer` renders every block type; an unknown block renders a visible `data-unknown-block` fallback. Admin passes `ws-prose` for the workspace typography; the public `/knowledge` typography is unchanged.

## Doc Studio email status dismissal

`EmailDeliveryHealthBanner` retains the shared health query while hidden. The `docstudio-email-health-dismissed` sessionStorage key remembers the dismissed status, latest attempt identity/time/status and rate-limit expiry. A changed identity shows the bar again. Storage denial still allows dismissal until the component remounts. No recipient or provider error text is persisted.


## 2026-09-30 — Preview toolbar follow-up (source only)

`public/ds/preview-toolbar.css` is loaded by standalone `studio.html` and native `DocStudioEmbed.tsx`. Preview actions use inline SVG paths independent of Google icon fonts. The bar, identity and action groups wrap; text buttons grow vertically; live save status wraps rather than hiding the full message.

## 2026-09-30 — Doc Studio letterhead (source only)

Presentation tables reset inherited admin grid styles. Saved letter fields `ltRule` and `ltSpacing` share preview/Word rendering; body text remains readable on long letters. See `docs/doc-studio-letterhead-review.md` for verification and export limits.

## 2026-09-26 — Portal Rx order form

- `/profile/rx-order` keeps the account layout at a route-scoped 1200px maximum. The embed `.wrap` owns a 2px desktop inset and retains a 14px mobile inset at 640px and below.
- `src/features/rx-order/embed/rx-order-engine.js` controls section focus/collapse, labelled summaries, shape thumbnails, Rx gate diagnostics and Chemistrie configuration. A finished panel folds when focus enters another panel. `cv.rxorder/1` draft restore normalizes older clip fields.
- Chemistrie choices follow the manufacturer order flow and retailer brochure: eight named Sun gradients, quarter-step Reader (+0.50 to +2.50) and Blue (plano to +2.00) powers, and fixed non-polarised Night Drive. Account-specific availability and prices remain the live catalog's responsibility.

## 2026-09-24 — Contacts and Leads merged into CRM; Leads Assistant → Copilot

- The Contacts and Leads apps are gone; everything lives in the `crm` app under `/admin/crm/*`: Dashboard, Pipeline, Contacts (`/contacts`, deep link `?contact=<id>` / `?erpCustomer=<id>`), My Leads (`/leads`), Lead Finder, Campaigns & Sequences, Lead Audit Reports, Activities, Outbox, Proposals, CRM Settings.
- `CrmSettingsPage` (`/admin/crm/settings?section=tags|industries|leads`) hosts the former Contact Tags, Industries and Leads Settings pages as tabs.
- `LegacyCrmRedirect` forwards `/admin/contacts/**`, `/admin/erp/contacts`, `/admin/leads/**`, and the old tag/industry/lead-settings paths, preserving query. `/admin/contacts/<id>` (GlobalSearch used to emit it with no matching route) goes to `?contact=<id>`. Links that used `/admin/erp/contacts?contact=…` lost the query through the old redirect; they now link to `/admin/crm/contacts` directly.
- No `crm` rows exist in `role_permissions`, so the app's launcher key is `contacts`, and GlobalSearch's contact results / Create Activity now use `ADMIN_APPS.crm.featurePrefix` (operators and viewers see them; before, only admins did). Page feature keys stay `contacts` / `leads` in `PATH_FEATURE_MAP`.
- The Leads AI Assistant moved to `/admin/copilot/leads-assistant` ("Leads Assistant"); `copilot.baseRoute` is now `/admin/copilot` so admin-shell AI tools show the Copilot sidebar. The full-screen workspace stays at `/copilot`.

## 2026-09-24 — Launcher pins

- Right-click (long-press on touch) any admin sidebar item → "Pin to launcher". Pinned pages appear first in the launcher's **Pinned** section with the page's sidebar icon and its app's accent colour; right-click a pinned tile to unpin.
- Pins are per account in `user_launcher_pins` (RLS: own rows only; select/insert/delete). Applied to the live DB via MCP on 2026-09-24 — migration `20260924150000_user_launcher_pins.sql` is the record.
- The launcher resolves pins against `ADMIN_APPS` sidebar items at render time, so pins to removed pages or apps the user can't open are skipped. Labels that repeat across apps (e.g. Leads "Settings") show as `App · Label`.
- `SidebarNavList` takes an optional `wrapItem`; only `AdminSidebar` uses it. The launcher's outside-click close ignores `[data-radix-menu-content]` so the portalled menu can be clicked.
- Launcher app tiles come from `navigationRegistry.ts` (not `ADMIN_APPS`); new apps need an entry there — Orders and Finance were added.

## 2026-09-24 — Finance app

- New `finance` app at `/admin/finance/*`: Import Costings (`/costings`, `/costings/new`, `/costings/:id`), Costing Reports (`/costings/reports`), Payment Activity, Walk-in Payments, Bank Payment Portals. Pricing keeps catalog/pricelist work only; Settings keeps company/users/roles/integrations/system pages.
- Launcher `featurePrefix` is `costings` (no `finance` permission exists yet), matching who could reach costings from Pricing. Page-level gates are unchanged: Payment Activity and Bank Payment Portals stay `AdminOnlyRoute`; walk-in keeps the `integrations` feature and its admin-only launcher shortcut.
- `LegacyFinanceRedirect` maps `/admin/pricing/costings/**` and `/admin/settings/{payment-activity,walk-in-payments,bank-payment-portals}` to the new paths with query preserved. `scotia-return` intentionally still returns to `/admin/settings/walk-in-payments` (avoids an edge-function redeploy) and is forwarded by that redirect.
- Live `help_articles` "Walk-in Card Payments" page_slug/context moved to `finance/walk-in-payments`; the 2026 migration that seeded it is left as history.

## 2026-09-24 — Orders app (reverses the 2026-07-24 Website placement)

- Admin modules are organised so each context has one app with its own URL prefix and sidebar; the sidebar resolves the active app by `baseRoute` prefix, so a page's URL decides which module you are in.
- Order handling moved out of Website into the `orders` app: `/admin/orders` (web orders), `/admin/orders/quotations` (+ `/new-rx`, `/rx/:id`, `/:id`, `/:id/print-preview`), `/admin/orders/stock-orders`, `/admin/orders/rx-submissions`. Launcher permission key is `orders`.
- `LegacyWebsiteOrdersRedirect` in `AdminRoutes.tsx` maps every old `/admin/website/{orders,quotations/*,stock-orders,rx-submissions}` URL to the new path, preserving sub-path and query (`?quote=`, `?highlight=`, `?draft=`), so stored `admin_notifications.href` values and bookmarks keep working.
- `adminSalesClosure.integration.test.ts` still forbids a standalone Sales app / `/admin/sales/**`; it now asserts the Orders app routes instead of forbidding them.
- Website is now Portals, Store, Content (public only), NPS, Feature Board, Assistant Quality. The Content CMS no longer edits internal wiki articles; those belong to Knowledge → Wiki.

## 2026-09-11 — Pricelist, Gatekeeper, shipment, and Helpdesk safety

- `PricelistVersionsSection` is the single pricelist-properties editor and compares normalized adjustment signatures. Metadata-only saves use the row/child-section update path; percentage changes open `PricelistAdjustmentSaveDialog`, whose default preserves manual overrides and whose replace-all path is separately destructive.
- All direct line-price editing writes `override_source = 'manual'`. The materialization RPC owns bulk rows and returns applied, removed, and preserved counts.
- `GatekeeperIntegrationTab` keeps outbound delivery and status polling independently visible, requires a production connection before either can be enabled, and displays durable outage/backoff state. `useRxSubmissions` treats disabled, production-required, and temporary outage responses as operational states rather than destructive refresh errors.
- `ShipmentDetailPage` applies historical supplier defaults through a request-id guard and merges each field only when its current value is still blank. `CompanionAssistantContext` retains its post-ticket attachment guard; regressions cover validation and upload failures after one successful ticket insert.

## 2026-09-04 — Walk-in payment customer email and receipt workflow

- `WalkInPaymentsPage` collects optional `customerEmail`, passes it to `create_walk_in_payment`, and displays the customer email and email receipt delivery status on the confirmed receipt view.
- When payment is settled, an `AlertDialog` automatically prompts the staff member with a choice to print a physical receipt immediately.
- Staff can also trigger an on-demand receipt email resend through the `send-walkin-receipt` action in `scotia-payment`.

## 2026-09-04 — Scotia payment activity

- `PaymentActivityPage` reads only the display-safe `scotia_payment_activity` projection and keeps the activity list bounded to the latest 100 rows. It never selects gateway parameter JSON, response codes, card metadata, expiry, or tokens.
- `StatementsSection` passes `assignToken` only when the customer explicitly checks the save-card option before the hosted Scotia redirect. A signed callback can return only the boolean confirmation that a card was saved.

## 2026-08-27 — Contact enrichment surfaces

- `useContactEnrichment` is the single client entry point for `crm-enrich-contacts`, used by both **Leads → Enrich All** (batch of 25) and a contact's **Enrich from public web** action. It reports filled fields and needs-approval findings as separate counts, because they mean different things to the user.
- `ActionCard` renders `apply_contact_enrichment` as a read-only before/after table with the source link and confidence. `changed` is forced to `false` for that type — enrichment findings are sourced evidence, not a draft, and a card that looks unsaved would leave Approve disabled.
- `edit-action` rejects enrichment payloads server-side for the same reason.

## 2026-08-27 — Copilot voice settings and page awareness

- `VoiceSettingsMenu` owns the microphone list, hold-to-record switch and optional advanced-settings entry. Both Copilot surfaces render it around their own trigger button and keep their own `holdToRecord` state; the widget omits the advanced entry because it has no advanced panel.
- `voicePreferences` persists `cv.voice.deviceId` and `cv.voice.holdToRecord` through guarded `localStorage` access. `usePushToTalk` seeds only `deviceId` from storage — `language` and `vocabulary` stay caller-supplied, because `InlineDictationButton`, `ContactsPage` and the public `CompanionAssistant` each pass their own.
- A remembered microphone that is later unplugged raises `OverconstrainedError`; `usePushToTalk` resets to the system default and reports it rather than leaving recording stuck.
- `AdminCopilotAssistant` sends the admin-context slug it already computed for the "Watching ..." label as `pageContext`, so the Copilot knows which page is open.

## 2026-08-22 — Portal records, assistant, and PDF runtime

- Cross-surface regression tests follow the current component boundaries: Portal Copilot evidence lives in `ActionCard`, Rx patient summaries use the engine's normalized uppercase display, and admin Rx settings remain in the page header rather than the sticky order toolbar.
- Storefront safety tests mount the same TanStack Query provider required by `useUserRole`, so they still exercise anonymous price/cost suppression without failing before the product card renders.
- `CartDraftsSection` keeps unfinished cart/Rx work separate and renders disclosure-only snapshots from the persisted draft payloads.
- `MyOrdersSection` owns submitted website, lab and delivery history. Lab detail and delivery price surfaces are permission-gated and labelled BBD; website cart/order money is labelled USD.
- `CompanionAssistantContext` owns open/close, five-minute nudge recurrence, session dismissal and saved-conversation restoration. `CompanionAssistant` renders history and request forms as full panel modes rather than message bubbles.
- Portal Rx branches receive explicit currency and `order-prices` authorization. Hidden-price users receive no copy advertising a separate pricing mode.
- `PdfViewer` statically imports the legacy PDF.js runtime/worker and verifies/retries PDF bytes before rendering, preventing bare module imports from escaping the production bundle.
- Profile edits update both the durable `profiles` row and non-authoritative auth display metadata; blank auth metadata is omitted during profile seeding so it cannot erase later edits.
- `MyAccountSection` owns the customer-facing saved-payment-method view. Creation remains a checkout concern; `/profile/payment-methods` redirects to the embedded profile section for compatibility.
- Portal support request details flex to the remaining assistant-panel height and scroll internally when their content exceeds that space.
- `MyAccountSection` embeds the shared address book and handles Enter through the same validated inline-save actions as its checkmark controls; `/profile/address-book` remains a compatibility redirect.
- The assistant composer uses a stable rounded-rectangle shell and bottom alignment so multiline growth occurs upward without moving its microphone or send actions.
- `usePushToTalk` uses `MediaRecorder` as the sole recording lifecycle and invokes `voice-transcribe` only after an explicit stop; provider output is normalized for sentence casing and terminal punctuation before entering the composer.
- The shared Copilot/MCP admin-resource dispatcher owns Helpdesk creation defaults, UUID-derived ticket numbers, assignee aliasing, and named-to-numeric priority normalization.

## 2026-08-18 — Statement PDF download

- `StatementsSection` recognizes the authenticated `statement_id` plus `download=1` link generated by the canonical statement email.
- It obtains the current Supabase session and streams the PDF through `statement-document`; the browser never calls Microsoft Graph directly and never receives Graph credentials.
- Statement rendering remains the existing `StatementPrintDocument` preview path; durable document generation and private website storage are server-side worker responsibilities.

## 2026-08-15 — Canonical stock quotations

- `resolve_stock_order_price` is the authenticated stock-pricing authority: selected-account pricelist, the single canonical Retail account's pricelist, published catalog price, then an audited editing-staff manual price.
- `save_stock_order_as_quote` locks a staged stock submission, re-resolves its catalog-derived prices, writes the authoritative `STOCK` quote and lines, and links a DocStudio billing document. The browser only sends the draft identity.
- `StockOrderBuilderPage` consumes the resolved catalog rather than supplementing it with a broad storefront list, so non-Retail availability remains server controlled. Editing staff can inspect cost and margin context without exposing it to view-only users.

## 2026-08-14 — Portal Copilot qualified CRM scan

- `portal-copilot` reads `contacts`, `customer_order_health`, `opportunities` and open `activities`, then passes those rows to the pure `crmOpportunityScan` planner.
- The planner suppresses contacts with existing open work and emits at most one ranked pending action per contact. Evidence, inference, priority, due date and next action are stored in the action payload.
- Approval reuses the existing `activities` write boundary with the approving admin as owner. Preparing or rejecting a suggestion performs no CRM mutation, and no path auto-creates an opportunity.

## 2026-08-14 — Portal Copilot conversations

- `copilot_conversations` is the user-owned chat container; `copilot_messages` stores its text and attachment metadata, while `copilot_runs` remains the governed approval/audit unit linked by `conversation_id`.
- The browser requests all conversation mutations through `portal-copilot`. The Edge Function verifies ownership and admin access, updates the chat title from its first request, and returns one selected conversation with its messages, runs, actions, and audit events.
- Existing rollout runs are backfilled as conversations so the multi-chat upgrade preserves historical work.

## 2026-08-13 — Admin Portal Copilot

- `/admin/copilot` is an admin-only, registry-backed page. Its browser client calls `portal-copilot`; it never holds provider or service-role credentials.
- ERP rollout planning is deterministic and reads current customers, contacts, and active portal memberships. The model may classify a command, but it cannot invent recipients, execute SQL, or bypass risk and approval rules.
- Voice input uses browser speech recognition with an explicit transcript-confirmation gate. Ordinary textarea typing remains fully editable and independent of clipboard access.
- `usePushToTalk` must call `SpeechRecognition.start()` synchronously inside the initiating pointer/keyboard press. Device enumeration and the microphone level meter may initialize afterward; awaiting them first can lose Chromium's user activation and emit `not-allowed` despite an approved microphone grant.
- Level 4 invitation actions require an explicit approval. Level 2 data-quality tasks may be edited before approval, and durable run/action/audit records remain the source of truth after refresh.

## 2026-08-12 — Unified order dispatch

- `StockOrderBuilderPage` sells published website products and variants, with server-side pricing and an explicit Innovations or Gatekeeper release choice.
- Rx and stock releases invoke the same canonical Hashref writer. Stock orders use `rx_eye:5`, while previews show the exact generated order text.
- The stock pricing reference tab makes clear that legacy Innova-family pricing rows are no longer the Stock Order Builder's price source.

Operational notes and change context for code in `src/**`.

## 2026-08-11 — Stock order form discovery and drafts

- `navigationRegistry.ts` uses the `stock-order` shortcut key so the Website app and the Stock Order Form remain separate launcher tiles while sharing Website permissions.
- `GlobalSearch` supplements sidebar items with concrete active admin routes from `APP_ROUTE_REGISTRY`; parameterized routes are excluded until an identifier can be supplied.
- `useStockEligibleAccounts` reads the lab-scoped `stock_lens_eligible_accounts` view. The view follows the CRM **Is Lab** contact graph used by `can_access_customer_lab_pricing`.
- Staged `stock_order_submissions` are the persisted stock-order drafts. The quotations page lists them and links back with `?draft=<id>` so the form can restore the frozen payload.

## 2026-08-06 — Header launcher shortcuts

- `navigationRegistry.ts` declares Activities and Rx Order Form as launcher shortcuts while retaining their CRM and Website `appKey` permissions.
- `AppLauncher` resolves shortcut keys to the canonical `/admin/crm/activities` and `/admin/website/quotations/new-rx` routes. Do not introduce duplicate pages or alternate route implementations for these tiles.
- `admin.crm.activities` is registered as an active admin route so every launcher destination has the required route metadata and authorization decision.

## 2026-08-06 — Quote request Helpdesk handoff

- `QuoteFormSection` submits through `submit_customer_quote_request`; do not restore separate client inserts into `quotes` and `helpdesk_tickets`, because the RPC owns atomic creation and authorization.
- `quotes.helpdesk_ticket_id` is the canonical conversation link. The quote list reads linked ticket state through normal Helpdesk RLS and routes replies to `/profile/helpdesk/:ticketId`.
- Customer UPDATE permission remains available only for RX drafts. Submitted STOCK request text is read-only in the portal; follow-up content belongs in `helpdesk_ticket_messages`.

## 2026-08-04 — Multi-account portal access

- `usePortalIdentity` is the compatibility interface over `portal_account_memberships`; `profiles.crm_customer_id` remains only the default/legacy pointer during rollout.
- `AccountSwitcher` stores a user-scoped customer preference, but every live-data request sends the selected customer to the server for active-membership validation. Local storage is never authorization.
- Account-specific React Query keys include `crmCustomerId`. Switching broadcasts `cv:portal-account-selection` so every hook instance updates in the same tab and cancels in-flight account requests.
- `admin-user-management` adds a membership without overwriting the original profile/customer/contact relationship. The live-data gateway checks membership status and membership-scoped feature overrides before resolving customer data.

## 2026-08-04 — Portal Lab pricelist access

- `AssignedPricelistsSection` treats `can_access_customer_lab_pricing` as mutable authorization state and rechecks it on mount and window focus; do not give a denied result a long stale time.
- `useSetContactTags` must fail the mutation when removal of prior `contact_tag_links` fails, otherwise the Contacts editor can report a tag set that the database did not save.
- The database decision includes the person, parent company, `customers.contact_id`, and company contacts whose `linked_customer_id` equals the resolved portal customer.

## 2026-07-30 — Live Helpdesk conversations

- `useLiveHelpdeskTicketUpdates` joins one private `helpdesk:ticket:<ticket-id>` topic only while that conversation is open. Its broadcasts contain identifiers, then refresh only that ticket's messages, timeline, and summary queries.
- `useLiveHelpdeskInboxUpdates` runs in the operator shell and refreshes the Helpdesk queue when a customer replies, creates a ticket, or its status changes. A visible toast calls out new customer replies.
- All browser message writes use `send_helpdesk_ticket_message`, which assigns the direction server-side and uses a client message UUID to make retrying a submit safe. Do not reintroduce direct client-table inserts for messages.
- The RPC must keep every `helpdesk_ticket_messages` column reference explicit because its `RETURNS TABLE` fields share names with table columns. `TicketReplyComposer` catches rejected `mutateAsync` calls because the mutation itself owns the error toast.
- `TicketMessageBubble` and the portal ticket detail each use a full-width conversation row: the signed-in sender is right-aligned and the responder is left-aligned. Do not infer alignment from a display name; use message direction.
- The database marks an automatic acknowledgement with `is_automated`. The trigger sends it once for portal/chat/assistant-created tickets, or the first inbound customer message before a human response. Working hours are Monday–Friday, 8:30 AM–5:00 PM in `America/Barbados`.
- The assistant handoff navigation stays at `/profile/helpdesk/:ticketId`; keep the confirmation requirement before creating a support conversation.

## 2026-07-24 — Sales app consolidation

- The Sales app is no longer registered in `ADMIN_APPS` or the launcher navigation registry.
- Canonical admin routes are `/admin/crm/proposals`, `/admin/website/quotations`, and `/admin/website/orders`; quotation editor, print-preview, notification, breadcrumb, and permission links use these destinations.
- `adminSalesClosure.integration.test.ts` prevents the removed Sales and standalone orders routes from being reintroduced.

## 2026-07-24 — DHL Express MyDHL integration

- `IntegrationsPage` configures the DHL Express account number, environment, and Basic Auth credential pair. Credentials are write-only in the browser and encrypted in `dhl_express_secrets`.
- The JWT-protected `dhl-express` Edge Function is admin-only and permits exactly three actions: a read-only configuration test, one shipment tracking lookup, and one landed-cost estimate. Landed-cost request and response data are deliberately not persisted.
- Customer My Orders continues to use the existing customer-scoped live-delivery feed. Do not route an arbitrary portal tracking number into `dhl-express` until the server can prove that it belongs to the signed-in customer's delivery.

## 2026-07-22 — Staff public networking cards

- Canonical public route: `/connect/:slug`, registered in both `PublicRoutes.tsx` and `routeRegistry.ts`. Only explicitly published cards can be returned to anonymous visitors.
- `staff_public_cards` is a separate public projection; do not read `profiles` directly from the public page because it also contains portal and CRM linkage fields.
- Staff open `/profile/networking-card` from the **Share my card** action on the profile home screen. The page provides an event-sized QR code, native share/copy actions, and self-service editing.
- Admin → Settings → Users exposes QR-preview and ID-card editor actions for internal staff roles. The shared editor preserves the same card shape and publish controls for self-service and admin configuration.

## 2026-07-19 — Contacts access deployment

- `ContactsPage` exposes the Contacts-first **Deploy access** dialog and first-use training nudge. The assistant searches CRM contacts and ERP customer accounts, deliberately surfaces account ambiguity, and routes no-match cases to contact-only creation.
- `AccessDeploymentAssistantDialog` can link a chosen existing login, send an invite, set a temporary password, assign an explicitly selected internal role, and optionally approve portal access after the customer link is confirmed.
- `admin-user-management` now returns login verification state and supports the explicit `link-customer-portal-account` action. The client request policy requires an admin, UUID-shaped user/contact IDs, and a positive customer ID.

## 2026-07-18 — Integration status recovery

- `IntegrationsPage` persists the outcome of its zero-impact Scotia credential/hash test through `record_payment_gateway_test`; a successful test clears a stale error badge and a failed test records an error timestamp.
- `InnovationsSyncStatusCard` has an on-demand status recheck. It does not mutate customer links: duplicate account-number warnings remain visible until the underlying source data is corrected, then disappear on refresh.

## 2026-07-16 — Portal statements and local live-data access

- `AccountSidebar` uses `canAccessFeature("statements")`, which keeps the sidebar and the canonical `/profile/statements` feature gate aligned. A staff role is not required for an approved customer unless an explicit feature override disables statements.
- The shared Edge Function CORS policy allows the local Vite origins on port 8081. This is needed because the portal browser client sends authenticated `live-data-gateway` requests directly to Supabase; a rejected preflight appears to the UI as a generic Edge Function transport failure.
- `AccountSidebar.test.tsx` covers enabled and disabled Statements navigation, while `liveDataGatewayCors.integration.test.ts` guards the port-8081 CORS allowlist.

## 2026-07-14 — Website Portals and Contacts

- `/admin/website` is a redirect to `/admin/website/portals`; Website Content remains available at its explicit route.
- `WebsitePortalsPage` prefers `profiles.email`, which is synchronized from the signup identity, before using the optional admin user-list email.
- The Contacts editor supports an embedded mode so Website Portals can open the same editor overlay for a linked CRM contact without route navigation. Customer Contact is the canonical editable record; Website Portals remains an activity/access surface.
- The embedded editor now has a Portal Settings tab containing operations, orders, addresses, payments, and support. Normal row clicks choose that tab; row context-menu actions select Details, Portal Settings, emulation, or login creation deliberately.

## 2026-07-13 — Specialty Lenses public page

- Canonical public route: `/lenses/specialty`; it is registered in `src/routes/public/PublicRoutes.tsx` and `src/config/routeRegistry.ts`, with coverage in `src/tests/integration/publicRouteAccessibility.integration.test.ts`.
- `src/data/specialtyLenses.ts` provides the typed, reusable card content and selected-lens action URLs. The existing price-request and LabLink routes do not yet consume `selectedLens`; it is retained as a URL handoff for the future integration rather than treated as a completed preselection API.
- `SpecialtyLensesPage` uses one collapsible Radix accordion item at a time. Its controls retain keyboard support, focus treatment, and `aria-expanded`/`aria-controls` semantics from the shared primitive.
- The shared header labels the third Lenses column as House Brands and renders the mobile menu as a full-screen `bg-background/80 backdrop-blur-md` sheet, matching the desktop mega-menu treatment without a visible dark scrim.

## 2026-07-13 — Innovations EFT bank payment routing

- `BankPaymentPortalsPage` displays the read-only Innovations EFT institution directory using its immutable source ID. Source-managed names are disabled in the edit dialog so the exact `customers.eft_institution_name` match cannot drift; admins can still curate the sign-in URL and notes.
- `StatementsSection` opens a bank page only for an EFT customer whose matching portal record has a verified `http(s)` URL. A mapped source bank with no URL deliberately takes the existing support fallback rather than opening a blank or unrelated destination.

## 2026-07-13 — Admin email previews

- Canonical admin route: `/admin/settings/email-previews`; it is registered in `src/routes/admin/AdminRoutes.tsx`, `src/config/routeRegistry.ts`, and the Settings sidebar app configuration.
- `EmailPreviewsPage` keeps a static, source-aligned catalog of six authentication and eight application templates. It is intentionally a review surface: editable sample values change only the local preview, while live send templates remain server-side and source-managed.
- `src/tests/integration/adminEmailPreviewsRouteAccessibility.integration.test.ts` enforces route registry, runtime route, and navigation alignment.

## 2026-07-13 — Safe storefront product reads

- `src/hooks/useStoreProducts.ts` loads lenses, supplies, and add-ons through `get_lenses_safe`, `get_supplies_safe`, and `get_addons_safe` RPCs rather than querying the cost-bearing base tables or public views.
- The public store renders sell prices for anonymous visitors, while the product card has no cost-field rendering path.
- `src/tests/e2e/anonStorefrontCostSafety.e2e.test.tsx` covers the anonymous `/store` page with a cost-shaped input payload and asserts that only the sell price reaches the DOM.

## 2026-07-11 — Portal financial and order status data

- `StatementsSection` consumes real posted Innovations statements. It presents statement ID, volume discount, due date, aging buckets, financial totals, and transaction rows with order/payment references.
- `MyOrdersSection` requests the identity-scoped `innovations.customer_orders` live-gateway operation. The portal renders four customer-facing columns—Rx number, patient, received date, and status—sourced from MSSQL-SVR through OptiLens Local; shipment tracking remains a separate panel.
- The order query mirrors the lab WIP view: active Rx/stock jobs plus non-cancelled terminating shipments created on the current MSSQL server date. The delivery request uses `include_open: true` with a 30-day `closed_since` boundary, so older open shipments remain visible.
- Shipments are expandable portal tiles. The local connector may return per-shipment `orders`, `tracking_number`, and an `http(s)` `tracking_url`; the frontend rejects non-web tracking links before rendering them.
- `AccountLayout` uses a wider responsive container and adaptive sidebar width so account pages use large screens without compressing the portal content.
- The browser never submits an LMS account number. The Edge Function resolves the signed-in user's mapped customer record before queuing the on-premises lookup.
- `MyAccountSection` obtains the account number only through `get_portal_erp_account_number()`, a signed-in-user-scoped RPC. The displayed value is source-managed and is not part of the editable profile form.

## 2026-06-24 — Security hardening support tests

- Product-cost exposure is guarded at the database policy layer: storefront product reads use the `get_*_safe` RPCs, while legacy cost-free views must never be replaced with direct base-table reads.
- Staff admin product editors still read/write the base product tables through `has_edit_role()` access.
- Runtime website analytics still uses direct public inserts for pageviews and web vitals, but rows must match the stricter migration checks for visitor IDs, paths, metric names, ratings, and bounded numeric values.
- Auth onboarding tests now fill the required country field and mock Select primitives in the unit test so jsdom does not depend on Radix dropdown scrolling behavior.

## 2026-04-13 — LED PRO route + admin rendering updates

- Canonical public route added: `/lenses/led-pro`.
- Route wiring stays centralized across `src/routes/public/PublicRoutes.tsx` and `src/config/routeRegistry.ts`, with accessibility coverage added in `src/tests/integration/publicRouteAccessibility.integration.test.ts`.
- Shared discovery surfaces were updated to point at the same runtime page: `Header`, `LensDesignGuidePage`, `knowledgeCenter`, and `siteSearchIndex`.
- `src/pages/lenses/LedProPage.tsx` now uses an embedded live demo in the hero watch panel, avoiding dependence on a locally merged MP4 during page rendering.
- `src/pages/admin/helpdesk/HelpdeskSlaPoliciesPage.tsx` now sanitizes stored rich-text HTML before rendering policy descriptions, preserving the shared rich-text rendering path while reducing unsafe markup risk.
- `src/components/admin/PdfPreviewShell.tsx` now initializes `manualZoom` to `1`, which keeps preview behavior aligned with an explicit baseline zoom state instead of a nullable first render.

## 2026-09-17 — Customer-device walk-in payments

- New public routes: `/pay` and `/pay/result`, declared in `src/routes/public/PublicRoutes.tsx` and registered as `public.pay` / `public.pay-result` in `src/config/routeRegistry.ts` with `authMode: "public"`.
- `src/pages/PayPage.tsx` is one page with steps (choose → code or self-service form → confirm → gateway) rather than several routes, because the customer completes a single task on a phone and never navigates. An emailed link arrives as `/pay?token=…` and skips to confirm.
- The public pages never query Supabase directly. `src/lib/payments/walkInPay.ts` is the only data path and talks solely to the `walkin-pay` Edge Function; `anon` has no access to `walk_in_payments`.
- `src/components/seo/Seo.tsx` gained a `noindex` prop so transactional pages stay out of search results; it defaults to `false`, leaving every existing caller unchanged.
- `src/pages/admin/WalkInPaymentsPage.tsx` keeps its existing "take the card here" flow and adds **Publish link** and **Request by email** alongside it. It watches the payment it published through `src/features/admin/walk-in-payments/useLiveWalkInPayment.ts`, which pairs a Supabase realtime subscription with an 8-second poll — a missed event here would mean a cashier hands over glasses that were not paid for.
- `src/features/admin/walk-in-payments/PublishedLinkPanel.tsx` renders the counter QR with the existing `qrcode.react` dependency. The QR encodes only the static `/pay` URL; no payment data is ever put in a QR payload.
- `src/features/admin/walk-in-payments/UnmatchedPaymentsQueue.tsx` reuses `src/components/admin/ContactPickerSelect.tsx` for attaching a self-service payment to a contact.
- `src/components/payments/TurnstileWidget.tsx` renders nothing without `VITE_TURNSTILE_SITE_KEY`; the server refuses self-service payments without its own secret regardless, so a missing key surfaces as "unavailable" rather than as an unprotected form.

Atlas release verification (2026-10-08): the scoped frontend and named sharing migration are deployed. The live Share dialog stays disabled until explicit enablement; administrator history loads empty, an unassigned token denies content, and sidebar width survives reload. No production page mutation, successful sharing/audit or signup test was performed. See docs/agent/HANDOFF.md for complete evidence and limits.

## 2026-10-09 — Public support attachments (local source)

Public inquiry helper sends multipart submission JSON plus files when attachments exist, preserving JSON-only callers. contact-inquiry enforces actual request-byte caps and file validation, saves private Helpdesk metadata after ticket creation, and returns attachmentError independently of request success. Public uploader attribution is nullable through the prepared migration; existing access policies remain unchanged.

Public support form follow-up (2026-10-09): request sections retain their natural height and the form scrolls when attachments exceed the available Iris window height. This prevents file rows from overlapping name, title and details fields.

## 2026-10-09 — Iris visitor guidance (local)

Fixed frame/policy prompts being treated as account lookups, automatic dispenser assumptions on public pages, and generated answers missing from follow-up history. Frame, coating and policy starters now answer directly with a relevant clarifying question and links. The guided lens flow retains the selected audience and gives use-specific guidance instead of promising an automatic Rx match. Search the site uses grounded site answers rather than the clipped, retrieval-free web endpoint. No backend deployment or data change. Local browser confirms the three starter replies and screen-use guide; live generated follow-ups from localhost returned a controlled fallback and remain unverified. Focused tests pass; full suite has unrelated admin credential-contract and Rx integration failures.

## 2026-10-09 — Portal ticket sends (local source)

Admin contact order questions now default to notifying the selected contact, retain the signed-in staff owner and existing account audience rules, and block missing recipients. Iris shows creation errors and retains the draft for retry. Timeline and email failures after ticket creation warn without failing the existing ticket; skipped email recipients are reported. Concurrent confirmations are guarded. Mobile forms use 16px input text, 44px buttons and a bounded scrolling admin dialog; life-buoy targets are 44px below the desktop breakpoint. No Edge Function, migration, authorization or environment changes. Frontend publication and named live email verification remain pending approval.

Ticket title follow-up (2026-10-09, local): portal Helpdesk list rows and their text flex child now allow shrinking. The title uses one-line ellipsis with a full-title hover attribute; stored text and ticket navigation stay unchanged. Status/date can wrap on narrow screens. This ships with the pending portal send repair.

## 2026-10-26 — Private clearance catalogue (local, unpublished)

Prepared the unlisted /clearance route; the random capability token stays in the URL fragment.
No menu, sitemap or public search entry is added. Tokens are checked by the receiver and
stored hashed. Anyone holding a valid link can view its sale snapshot; expiry/revocation
hides availability. Stock, internal costs and write-off notes are never exposed.

Families group exact material/manufacturer/design/colour, with separate diameter matrices.
Sphere/cylinder grids sell single-vision eaches; base/add grids sell complete multifocal pairs.
The office calculates pair stock plus matching right/left and omits unmatched multifocal lenses.
All grid columns are fixed at 80px and all colours use host semantic theme tokens. Cells use plain quantity/price text without badges, inner borders, padding or margins.

Signed-in administrators get a discreet Manage catalogue footer link to /admin/clearance.
Hide/Show family is an app-owned visibility overlay applied server-side and preserved across
snapshot refreshes. It does not disable source catalogue lenses or change stock. Non-admin
link holders cannot change visibility.

A dedicated Edge Function and RLS-protected snapshot/visibility tables are prepared. The
publisher requires a scoped server-only catalog:write API key; ordinary link reads cannot
publish. Local migration, function and routes are not deployed/applied. Daily office publishing,
private-link provisioning and production publication remain subject to explicit approval.

FreePBX calls (2026-10-24, local source): `ContactCalls` is a Calls tab in the ContactsPage dialog. Call invokes `pbx-calls` request-call; recorded calls read `call_recordings` (admin/operator RLS) and play through `pbx-calls` recording-url signed links. See `docs/pbx-calls-setup.md`.

## 2026-10-26 — Private clearance activation
The owner-approved unlisted catalogue and daily office feed are live. Grids use fixed
80px columns, plain quantity/price cells, larger table fonts, host theme tokens and a
compact sans-serif introduction. Admin-only family visibility survives refreshes.
Token-checked database RPCs keep private stock/cost tables inaccessible. Both scoped
migrations are applied. Daily 06:00 Barbados publication was exercised unattended and
positively accepted. Desktop and 360/390px checks passed without page overflow or
script errors. No source stock/order write, reservation, payment or email occurred.

## Admin mobile navigation and capture - 2026-10-28

Local source: admin dashboard links in the account drawer and profile; compact shared mobile admin header with profile overflow; closed-by-default overlay sidebar; repeated camera photos and multi-file Rx capture with larger touch targets and cross-device list refresh. Existing admin-area authorization and capture services are retained. See docs/agent/PROJECT_KNOWLEDGE.md and HANDOFF.md for validation and release limits.

Mobile admin search follow-up (2026-10-28, local source): GlobalSearch collapses to a search button below 768px. Opening focuses a 16px input and shows viewport-wide results beneath the topbar; labels wrap and results scroll within 60dvh. Outside tap, close button, Escape and navigation dismiss it; Escape/close restore button focus. Desktop retains its inline input and Ctrl+K. Search permissions and data sources are unchanged.

Order transmission and supplementary invoices (2026-10-28): unpriced published stock items carry price_pending and lab hold notes; account-only prices, Gatekeeper default and server-driven auto-transmit for new submissions, admin switch with manual mode, and staff-issued itemised BBD invoices payable separately from the customer cart. Website shipping transitions are blocked for unpaid extras/unquoted submissions. Test fixtures and historical drafts are not auto-sent. Existing payment settlement and access controls remain authoritative. See docs/order-transmission-and-extra-invoices.md for operational limits and verification.

Store checkout verification (2026-10-28): confirmed card and on-account stock orders follow the Gatekeeper automation setting; manual mode stages submissions. The obsolete assigned-pricelist rejection is removed. Rollback-only SQL fixtures verify automatic/manual queue eligibility without sending orders.
The edit route owns loading the saved submission and passes it into the stock panel, preserving the panel's standalone integrations.

Homepage quick-start reserves 44px below the fixed header. Its original rounded handle supports captured pointer drags; outside pointer events, Escape and keyboard focus leaving dismiss it. Homepage customer actions reuse the resolved portal identity and staff role; this is presentation only.

FreePBX call panel (2026-10-30, local source): `ContactCalls` polls its `call_requests` row every 2 s while the call is live and sends Hang up / Record / Stop through `pbx-calls` `control`; Record confirms in an `AlertDialog`. See `docs/pbx-calls-setup.md`.
