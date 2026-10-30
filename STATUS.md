# Project Status

## Fixed asset register phase 1 - 2026-10-30

Branch `finance-asset-register`, local source. Adds Finance → Fixed Assets and Depreciation Runs under `/admin/finance/assets/*`, limited to admin and office admin. The register covers:
- assets with an accounting book
- monthly depreciation runs (draft, approved, posted) with a per-class QBO journal CSV
- disposals and write-offs with gain or loss
- the opening-balance CSV import, which reconciles against QBO to the cent
- the IAS 16 roll-forward, the register at a date, and the one-off reclass journal

Migration `20261030200000_asset_register.sql` was **applied to the live database on 2026-10-30** through the Lovable MCP, in one transaction. A rolled-back smoke test passed: import, the guards, approval, posting, disposal and the non-admin block. The database is still empty. The engine and import have unit tests, routes have an accessibility test, and the app typecheck and build pass. All pages were rendered locally on a temporary dev bench with sample data. They have not been run against real data or a signed-in session. Plan and decisions: docs/ASSET_REGISTER_PLAN.md. Every Markdown file is served publicly through `/repo-health`, so the plan contains no money figures.

## Admin mobile sidebar handle edge - 2026-10-29

The workspace theme's unlayered `.admin-tool button` rule overrides Tailwind radius utilities, so `rounded-l-none` alone did not square the edge. Set the two left corner radii inline on the trigger while preserving right-side rounding, contrast and sizing. Focused verification pending; see HANDOFF.md.

## Admin mobile sidebar handle contrast - 2026-10-29

Follow-up: increased handle visibility in light and dark themes by using the higher-contrast admin sidebar foreground token for its border and icon, a 2px right edge, and a stronger shadow. Keyboard focus has a visible ring. Width remains 17px. Focused verification pending; see HANDOFF.md.

## Admin mobile sidebar handle - 2026-10-29

Follow-up to mobile navigation: narrowed the edge handle by 30% (24px to 17px) and reduced its icon proportionally (20px to 14px), retaining its 44px height and accessible button target. This minimizes overlap with the first content column on narrow admin pages. Focused test and build pending; see HANDOFF.md.

## Admin mobile navigation and Codex run actions - 2026-10-29

Local source: the mobile admin navigation handle now sits flush to the left edge with no left border, a vertical three-dot icon and a clearer theme-aware border. The drawer and its light backdrop begin below the 44px admin header, so app switching/search/alerts remain visible and the page dims lightly. Codex Run and Dev Preview actions both start the current checkout's Vite dev server at 127.0.0.1:5173 with strict port/open behavior; `npm run dev` now checks the supported Node/npm runtime first. No service, credential, access, hosted data or deployment change. See HANDOFF.md for validation.

## Homepage drawer and returning customers - 2026-10-28

Source: quick-start keeps its original rounded handle at the panel's bottom edge, with reserved spacing below the header. Pull down/up, click, outside tap, Escape and keyboard focus dismissal work; touch scrolling remains native until a further upward swipe at the list end. Approved portal customers and signed-in staff see order, tracking, supplies and account actions; acquisition calls to action are hidden/replaced. Reuses existing portal identity for presentation only. Full suite: 285 files / 1786 tests pass. Browser verified locally at the existing mobile viewport; no production publish. See src/components/home/CONTEXT.md.


## Admin order recovery and capture identity - 2026-10-28

Local source: admin Rx & Stock Orders can reopen staged/failed internal stock submissions for correction and explicit resubmission; deletion is offered only for blank, unsent, non-invoiced stock rows without a portal order. Existing Rx edit/retry remains available. Capture lists show extracted patient name and customer account. App TypeScript passes; scoped ESLint reports warnings only, no errors. No migration or live-order operation. See the latest HANDOFF.md entry.

## Order release verification - 2026-10-28

PR #651: all 1786 tests pass across 285 files; lint (warnings only), TypeScript, Deno, build, PR checks and smoke pass. Node 20/22 CI and preview deployments are green. Four order migrations are verified/applied and recorded via Lovable; gatekeeper-orders alone is deployed, with hosted Edge smoke passing. Store checkout, direct stock and Rx submissions use the automatic Gatekeeper setting. No agent-created real order transmission, invoice or payment was used in verification. PR #651 was merged during verification; the final checkout migration is in a separate follow-up. Historical failures below are superseded by this final run.


## Admin mobile navigation and capture - 2026-10-28

Local source: AccountTopBar shows an admin-only dashboard link beside the mobile-sheet username; MyAccountSection makes the admin role a dashboard link. Shared AdminTopBar keeps applications, branding, back, search, notifications, operator attention and avatar below 768px; New, annotation, contextual help and settings move to the avatar menu, which already contains themes and account actions. AdminSidebar uses the existing accessible Sheet on mobile, initially closed, with an edge tab, no pinned state, and dismissal on outside tap, Escape, link click, navigation or viewport change. Desktop behavior is retained.

RxCapturePage adds a rear-camera input and repeated-photo action alongside the existing multi-file picker/drop/paste intake. Each file creates its own capture; customers must be selected first. Touch controls are larger and filenames wrap. Idle lists poll every 15 seconds (three seconds while reading) for captures from another device. Existing admin route guards, data permissions, storage and extraction APIs are retained. No new service, environment variable or database change. Build, TypeScript, lint, PR checks and 24 focused tests pass; full suite has six failures in four unchanged-contract test files, and qa:smoke reports two unrelated missing snippets. Browser layouts verified locally at 360/412/1305px; no physical-camera/upload or cross-device end-to-end test. Not deployed. See HANDOFF.md.


Homepage signed-out gating (2026-10-24, local source): signed-out visitors see a short credit/payment explanation (references, starter-limit and statement detail only when signed in), no statements/account-setup links, and "Sign in to…" labels on order/tracking links that go through `/auth?redirect=`. Shared step/FAQ copy no longer names Rx form, LabLink or live job status. Helper: `src/components/home/useHomeSignedIn.ts`; search index regenerated. Signed-out checked in browser; signed-in not rendered. Typecheck of touched files and lint pass; 7 existing test failures (5 files) unchanged. Not deployed.
Private clearance catalogue (2026-10-26, deployed): unlisted /clearance capability link, compact sans-serif header, plain 80px optical matrices and larger grid text. Multifocals sell whole pairs; single vision sells eaches. Admin-only family visibility persists across daily snapshots. Token-checked RPCs and private RLS tables are live; daily office publishing is active at 06:00 America/Barbados and an unattended run was receiver-accepted. Desktop and 360/390px browser checks passed. See docs/clearance-catalogue.md; Status: Complete — no active handoff.

Caribbean customer journey (2026-10-24, local source): the professional homepage now offers common-task shortcuts, transparent customer/account stages, and a client-side delivered-cost comparison worksheet. Trade-account applications capture prepaid, supplier-reference review (two required; third optional), or a requested starter limit; none grants credit automatically. Public freight copy no longer promises unverified transit times; quotes are destination-specific. Focused tests (7), app TypeScript and production build pass; scoped lint has 8 existing warnings in ProfessionalsPortalPage.tsx. Not deployed; shipping rates/transit data and a final credit policy still need office approval before publishing firm quotes or terms.
FreePBX click-to-call and selective recording (2026-10-24, local source): contact dialog has a Calls tab (Call button, recorded calls with summary/transcript/playback). New `call_requests`, `call_recordings`, `staff_extensions` tables and private `call-recordings` bucket in migration `20261024120000_pbx_calls.sql`; edge functions `pbx-calls` (staff) and `pbx-agent` (LAN agent, `PBX_AGENT_TOKEN`); agent in `scripts/pbx-agent/`. Migration, secret, deploys and PBX install are **not done**; Deno type-check and a real PBX/Supabase run were not possible. Unit tests, `tsc` pass; agent exercised against a stub only. See `docs/pbx-calls-setup.md`, including the unconfirmed PBX assumptions and the recording-consent steps required before use.

Alert bell / stock refresh / portal loading (2026-10-20, local source): shared two-note ding dong, six-second same-origin cross-tab cooldown, mute/Test ding dong controls and batched attention sounds. Stock reads refresh on mount/focus/reconnect and every eight hours while mounted (not an office inventory import). Portal loading overlaps independent reads, caches lists for one minute and defers order/address/payment details until account selection. Build, application TypeScript and focused tests pass; full suite retains 12 existing failures and lint retains the Rx workspace error. Live admin timing/audio verification remains pending; see HANDOFF.md. No hosted change.


Build recovery (2026-10-20, local environment): `npm run build` failed resolving the declared `@zxing/browser` import because both ZXing packages were missing locally. Restored locked dependencies with npm 10 `npm ci`; production build passes and development runs at http://127.0.0.1:5173/. Edge browser renders the homepage without captured console errors; the scanner module returns HTTP 200. Session-local PATH selection avoids the roaming npm 12 shim. No app source, dependency manifest/lockfile or hosted changes. Full tests: 1,691 passed / 12 failed across three previously documented failing suites (Rx workspace provider, Chemistrie timeout, OAuth rewrite). PR checks retain generated Copilot facts drift. See HANDOFF.md for lint and final validation.

Lead summary + signup lead capture (2026-10-20, local source): trade-account, price-list and portal-signup requests now match/create the CRM lead list-aware (never throwing) and email the owner a `lead-alert` summary (said/fit/history/next move/reply-by 4 business hours Barbados/one-tap links), falling back to the plain notification. Professional portal signups go through `contact-inquiry` (previously a direct `public_inquiries` insert: no owner email, ticket or CRM). 40 focused tests pass; no new full-suite failures (8 pre-existing failing files, incl. missing @zxing deps; copilot-facts drift pre-existing). **Not deployed**: `contact-inquiry` needs a redeploy then `npm run qa:edge-smoke`; no migration. Edge code could not run locally (no Deno); template smoke-rendered with stubbed components only. Plan: C:UsersRusse.claudeplansquiet-watching-whale.md (Milestone 1: Step 6 yes-path and SLA reminders still to do).

Portal operations controls (2026-10-20): assigned-pricelist Edit deep link and simple enable/disable switches are implemented in both portal settings surfaces. Existing customer settings are preserved. New-profile all-off initialization is staged in 20261020214927_new_portal_features_disabled.sql; production apply requires separate approval. Browser connection timed out; see HANDOFF.md for validation.

Doc Studio shortcuts/square surfaces (2026-10-20, local source): the dashboard Doc Studio tile has direct section links, ordered by that signed-in user's recent use in this browser. Existing Studio URLs accept allowlisted tab/billType query parameters. All annotated structural panels have square outer corners across viewport sizes; the shared admin top bar is square on all admin pages. Input/button/document styling is retained. No new route, backend or publication.


Iris phone messages (2026-10-20, local source): new Edge Function `iris-take-message` receives the Telnyx voice assistant's take-message webhook (POST, `X-Iris-Secret` header = server-only `IRIS_WEBHOOK_SECRET`, verify_jwt=false), creates a `phone` helpdesk ticket titled "Phone message: <caller>" with callback details, logs a ticket_created event, and emails the company feedback address (non-fatal). Registered in config.toml and the edge-smoke no-CORS list. The originating session reported deno check and local probes passing (405/401/400); not re-run here (no deno in this container). Deployed and working per the user (2026-10-21); not independently verified from this session. See HANDOFF.md and docs/iris-freepbx-routing.md.
Localhost data access (2026-10-20, local source): Vite now offers a loopback-only same-origin Supabase HTTP proxy for signed-in development sessions on any localhost/127.0.0.1/IPv6 loopback port. Shared client reads/functions and Doc Studio use it in development; production builds retain direct transport and existing auth. Confirmed hosted gateway CORS rejection on port 5173 and repaired the local path without a production function change. Live invoice 81799 imported successfully.


Doc Studio Innovations invoice import (2026-10-20, local source): Billing Invoice and Quotation can import by Innovations invoice number. Synced statement references resolve the account, with the existing customer picker as fallback for invoices absent from statements. Private item lines come from the existing account-scoped live-data gateway. Import creates a separate local editable draft, preserves source amounts without double VAT, labels header/line differences, and retains the Innovations number when saving an invoice. No backend, schema, auth or deployment change. See HANDOFF.md for verification limits.


Lens chain status (2026-10-20, local source): `/admin/pricing/alias-mapping` has a new "Chain status" view that checks every active alias left to right: synced, confirmed CV lens, supplier, reaches a price cell, priced on a pricelist, pricelist assigned to a customer. Innovations-only stages (lens on, price group, Innovations pricelist, cost source) show as grey "not reported yet" until the office pushes them; `docs/lens-chain-office-discovery-brief.md` is the brief for finding those tables. Read-only, no migration or schema change; 8 unit tests, TypeScript pass. Not checked in an authenticated browser against hosted data. Unpriced orders deliberately stay orderable at no charge.
Stock scanner / pair lines (2026-10-19, local source): the camera scanner now decodes only linear barcodes (Code 128/39/93, Codabar, ITF, EAN, UPC); QR and other 2D symbols are ignored. Adding a Pair of an eye-specific (chiral) lens creates two order lines, Right only and Left only, each with its own OPC, instead of one line of two; symmetric lenses keep one pair line. Browser-driven on EVO (local state only, nothing saved or submitted): 4 supplies and all 41 material/design/colour lens combos, 2,209 lines. VCPL has no stock/supply pricelist rows, so its catalog is empty. Focused tests, tsc and scoped lint pass.

Dashboard import error recovery (2026-10-19, local environment): restored locked dependencies with npm ci after the camera scanner's declared ZXing packages were missing from node_modules. Both app and standalone prototype previews were restarted after releasing their Windows native-module locks. Dashboard browser renders without the Vite overlay or console errors; scanner module HTTP 200 and production build pass. No application source, dependency manifest, lockfile or hosted service change.

Stock entry route / picker visibility (2026-10-19, local source): fresh stock-orders visits open the canonical Rx form with ?type=stock; quote/highlight links retain the stock editor. Lens menus now portal outside scrolling panels; segmented controls have contrasting selected states in both themes. Browser verified lens selection, powers and a local pair addition/removal without saving/submitting. No deployment.

Integrated stock / supplies form (2026-10-19, local source): replaced the admin Rx form's stock panel with the approved compact layout, categorized supplies/services, Rx-style lens choices, store power grid and review. Service request is no longer an order-type option; published addons/services use the same item browser. Account changes reset local stock state, stock mode suspends Rx autosave, and pair counts convert to individual server lens units. Existing save/release RPCs remain explicit. Real catalog reads and local line addition verified without saving/submitting; no deployment. See HANDOFF.md for validation.

Stock prototype header removal (2026-10-19, local only): removed branding/demo selectors and the full account/title/subtitle/badge row. The form now begins with identification beneath the prototype banner. Seeded full-catalog pricing remains the default. Browser and standalone build verified; no live-site change.

Stock prototype selected layout (2026-10-19, local only): only the chosen Rx supplies preview form remains; layout variants, switcher, preview tabs and step navigation are deleted. Identification is a compact set of labelled fields without a heading or help copy. Shared admin workspace tokens and font files style the form, dialogs and existing Rx/store components. All data and actions remain seeded/simulated. See HANDOFF.md for validation.

Rx sidebar alignment (2026-10-17, local source): removed the sidebar's sticky top offset only on the viewport-bounded Rx route. Its menu now aligns below the account header like other pages; form scrolling stays inside the Rx frame. Browser compared Saved Drafts with a blank Rx form without entering data or creating a draft. No publication performed.

Rx uncut supply/introduction (2026-10-17, local source): Uncut lenses show a disabled Uncut frame-supply value, with load/save/summary normalization; Full glaze restores the usual supply selector. The introductory sentence now scrolls away while the title stays fixed. Fixture and portal browser checks, 29 focused tests, TypeScript, lint and build pass. Full suite retains two unrelated failures. No order submitted or publication performed; see HANDOFF.md.

Portal Rx scrolling (2026-10-17, local source): fixed page title, bounded form scroller, pinned order toolbar/steps, and desktop quote constrained below the controls. Live browser scrolled through the existing form; 27 focused form/layout tests pass. Existing phone total bar remains. No order submitted or deployment performed; live hot-refresh autosave activity was visible. See HANDOFF.md for checks and limitations.

Pricelist education (2026-10-17, local source): smaller visible pencil with retained tap area; design-name popovers explain distinctions and link to existing lens guides; treatment headings have plain-English tooltips. Progressive/photochromic definitions are shared with the public pages. Browser checked in a separate side-chat tab. No pricing, order or publication action. See HANDOFF.md.

Pricelist readiness email (2026-10-13, released): account creation and invitations still assign the default template pricelist, but no longer send the "Your Classic Visions pricelist is ready" message. The create-user immediate-send checkbox is removed. The separate invitation email remains an explicit admin choice. Both Edge Functions and the frontend are deployed; the post-deploy edge health suite passed. See HANDOFF.md.

Atlas production release (2026-10-08): width persistence, per-user browser sidebar preferences, stable generated identifiers, authenticated published-page sharing and account/page/time audit are deployed. The named sharing migration is applied; hosted grants/RLS and unchanged page policies are verified. No page was enabled for sharing. See HANDOFF.md for local checks, browser proof and remaining target-specific verification. ClickUp and broader spaces remain deferred.

## Atlas title slugs and launcher favorites — 2026-10-07

Local source: title edits update unique slugs (draft autosave; published Update), sidebar renames update both fields, page browser titles reflect saved titles, ID-bearing shared links survive renames, and page actions expose saved per-user launcher favorites through existing pins. No production data write, schema apply or release. Old slug-only bookmarks have no redirect history. Validation and live pin-read limitations are recorded in HANDOFF.md.


CRM follow-up (2026-10-07, local source): contact Places lookups now use Places API (New) searchText and details endpoints, header credentials and explicit field masks. Business-name similarity is scored separately from location search context; ambiguity thresholds stay intact. Manual research combines Google Places listing details with OpenAI cited web sources when configured, records one attempt per provider, and shows unavailable/failed providers alongside successful results. Google errors count as failed enrichment rather than Nothing new found, including responses from older deployments. Scheduled enrichment remains Google-only. crm-enrich-contacts was deployed through the user-authorized Lovable chat; server logs verify version 94 live. Lovable sandbox edge-smoke passed all 47 functions and 3 probes; the local command failed to connect throughout. The authenticated Specs Optical research request reached Places API (New) but returned three equally named matches and HTTP 502 without contact changes. OPENAI_API_KEY is not configured, so no OpenAI call ran. One earlier UI preparation click reached the old legacy endpoint and was denied. No further lookup, Google configuration or credential changes were made. Frontend publication and successful combined-provider verification remain pending.

> Agents: read this file first. It tells you what is actively being worked on,
> what is broken, and what must not be touched. Update the "Last updated" line
> whenever you change this file.

Last updated: 2026-10-24 (FreePBX click-to-call and recording, local source)

RX stock/supplies order UX (2026-10-19, local source): stock/service item entry and order details now open in a modal; instructions are labelled as optional special instructions; order reference is required before saving or releasing. Chiral lens items offer Pair (default), Left, or Right; other items stay Pair. Standalone Stock Order Builder also marks the reference required and blocks submit until entered. Scoped ESLint and production build pass; full lint was interrupted after prolonged no-output execution. No order submitted or deployment performed; see HANDOFF.md.

RX stock order refinement (2026-10-19, local source): patient/reference/PO/instructions stay in the main form; patient is optional, reference required and capped at 20 characters, PO capped at 15. Instructions start compact. The item-only modal uses a compact treatment-dialog style and identifies published supplies and stock lenses covered by the account pricelist. See HANDOFF.md; source validation pending.

Pricelist tablet/currency display (2026-10-17, local source): compact tap-pinned lens popup with close control and 44px targets; EUR/XCD display options, labelled estimates unless configured; currency-aware retail display and numeric CSV. No global rates, transaction currency, hosted preferences or retail values were changed in verification. See HANDOFF.md.

Invoice line totals (2026-10-17, local source): both My Orders invoice dialogs now include Total (BBD) beneath the line amounts. Verified the annotated Rx and delivery examples in the local browser at $900.00 and $280.00. Shared rendering, integer-cent aggregation and missing-amount handling have focused regression coverage. No invoice data, authorization, connector or deployment change. See HANDOFF.md for validation.

Pricelist lens handoff (2026-10-17, local source): one matrix popup combines actual Rx-form lens names, retail-price editing and Start Rx order for linked Rx-enabled customers. The editor-selected lens and its confirmed primary alias determine the single option; the canonical alias opens a fresh account-priced draft, with patient/Rx/frame blank. Existing inquiry fallback, staff read-only views and access rules remain. Desktop/mobile popup checks and mocked draft handoff pass; no new hosted draft or production publication was performed in this follow-up. See HANDOFF.md for full validation and unrelated check failures.

Rx/pricelist annotations (2026-10-17, local source): portal Print order restored, category headers use teal, matrix tooltips identify lens/material/colour and explain unavailable cells, and a visible-price-only BBD gross-margin estimate is optional and never saved with the order. Browser verified pricelist tooltips and the print control; fixture bench verified profit/loss display. The live form autosaved a synthetic PREVIEW ONLY draft during verification; the user requested leaving it for review. No cart submit or lab order performed. Validation details and baseline failures are in `docs/agent/HANDOFF.md`.

Homepage wording (2026-10-17, local source): applied the trade-account heading, simpler lens-explorer heading, patient optician explanation, expanded lens-category labels, and final second-person FAQ copy (Comment 7 supersedes Comment 6). Shared category labels update both audience views. Existing responsive styles remain in place. Browser verified both audience views; build and generated search-index checks pass. Full lint/test results are recorded in `docs/agent/HANDOFF.md`. No publication performed.

Email reply follow-up (2026-10-13, local source): Reply now preserves the selected message's HTML body and embedded earlier correspondence in outgoing HTML, with a plain-text alternative. The quote preview is expanded by default. Focused tests, scoped lint, TypeScript, and build pass. The local mail bridge is currently unreachable, so authenticated rendered verification is pending. No email was sent or frontend published. See `docs/agent/HANDOFF.md`.
Email search/ribbon (2026-10-13, local source): app-wide search on the Email route lists accessible Inbox hits ahead of site results. Folder search and Sync stay on one ribbon row; More holds only actions that do not fit. Layout checked in the local browser at 1138px and 1864px; authenticated result selection still needs external Chrome/Edge verification. No mail action or production publication occurred. See `docs/agent/HANDOFF.md`.

Email resend (2026-10-15, local source): the Email Previews delivery log has a Resend button per message. The dialog pre-fills the original address so it can be corrected, and offers to replace the old address on matching CRM `contacts.email` lists (only after the corrected address accepts the mail; the ERP-synced `customers` table is not touched, and an Innovations sync may restore a contact's old address). `sendManagedEmail` now keeps each rendered message in new table `email_resend_payloads` (service-role only; skipped for emails with attachments), so only emails sent after deployment can be resent. Migration `20261015120000_email_resend_payloads.sql` and the `docstudio-api` function are **not applied/deployed**; no email was sent. Unit tests, `tsc -p tsconfig.app.json` and scoped lint pass; no browser pass.

---

## Active work

- **Lead Finder CRM matching and follow-up** — local source only. Results are matched against CRM contacts and customer accounts before the result limit: confirmed links and exact name + city (single record) associate automatically, website needs supporting name/city evidence and an unshared host, everything fuzzy is a suggestion. Current customers (flag, linked account, parent company, owning account, or a manual "Mark current customer") are excluded with a count and a "Show current customers" toggle; linked prospects stay visible; links and markings can be corrected. New per-lead panel adds Connection strength (Unclassified/Strong/Not strong, separate from the AI score), Needs follow-up (owner defaults to the signed-in operator, optional due date) and a searchable keyboard-operable "Link existing contact". Save is now the `lead_finder_save_lead` RPC (one transaction, advisory-locked per business, idempotent contact/opportunity/note/task, existing contact status and populated fields kept) replacing the name-based upsert. CRM lookup failure shows a warning and disables saving. Migration `20261007150000_lead_finder_crm_matching.sql` and the `lead-intelligence` function are **not applied/deployed**; no live data was written. 43 focused tests, `tsc -p tsconfig.app.json` and lint (0 errors) pass; the SQL has only static contract tests — **no Postgres/Docker here, so the RPC, concurrency and rollback behaviour must be exercised on a database before release**. See `src/features/admin/leads/CONTEXT.md` and HANDOFF.md.

- **Doc Studio recipients/signatures/labels** — local port 8081 improvements implemented; recipient search/dismissal retains To, signature supports HTML/image copy/export and draft insertion, labels support square shipping/customer layouts and editable headings. Public logo deployment and actual email-client validation remain pending. See Doc Studio CONTEXT and docs/doc-studio-signature-compatibility.md.

- **CRM contact editor** — local searchable company field (typing, filtering, Enter/arrows/Escape), validated email lists, Save / Save & Close, and cited public-web research suggestions through the existing enrichment endpoint. Manual research now uses OpenAI Responses web search with server-only OPENAI_API_KEY and optional CRM_RESEARCH_OPENAI_MODEL; local provider replacement requires function deployment and live verification. Salesperson receiver compatibility is prepared; office producer mapping and Innovations writeback remain incomplete pending actual source metadata and an office-side revision/conflict contract. Mail recipient consumers require audit before releasing list storage. No production contact edits, billable lookup or deployment from this chat. See `docs/crm-contact-editor-follow-up.md` and HANDOFF.md for checks and blockers.

- **Admin attention dropdown** — local source moves the attention count beside the notification bell in the shared AdminTopBar (including Atlas). A right-aligned 320px vertical Radix popover starts closed; X, Escape and outside click dismiss the panel while retaining unresolved work. All attention items are scrollable; Help Desk and existing Snooze remain available. TypeScript, lint (warnings only), build and 8 focused tests pass. Local isolated browser fixture confirms placement and all three dismissal paths. Full test run hit a 120-second timeout in the untouched Rx domain seeded-scenario test and was stopped; authenticated full-dashboard browser inspection was blocked by browser URL security policy. The user authorized committing and pushing this change to main on 2026-10-07; deployed behavior is not yet verified.

- **Helpdesk message edit / retract** — authors can edit or retract their own messages: staff replies, internal notes and customer portal replies. `edit_helpdesk_ticket_message` / `retract_helpdesk_ticket_message` are the only write path (table writes stay revoked); a customer is blocked once the ticket is closed or 15 minutes after sending (edit and retract; staff are unlimited; `20261006130000_helpdesk_customer_edit_window.sql`, applied live and tested both sides of the window), and automated or emailed-in messages (no `sender_user_id`) cannot be changed. Retract clears the text and the thread shows "This message was retracted"; replaced and withdrawn text is kept in staff-only `helpdesk_ticket_message_revisions` (no UI yet) and every change adds a `message_edited` / `message_retracted` timeline event. Messages show "edited". Migration `20261006120000_helpdesk_message_edit_retract.sql` **applied to the live project** via the Lovable MCP and exercised in a rolled-back transaction (non-author rejected, edit, retract, edit-after-retract rejected). Not covered: the `mcp` / `mcp-staging` edge functions read `body` directly and will show a retracted message as empty; attachments uploaded with a retracted message are hidden but remain in storage. No browser pass on an authenticated ticket.

- **Iris wiki formatting** — local replies and proposals share the wiki renderer; canonical Markdown conversion preserves tables, checklist marks and nested lists. Accepted selection replacements insert rich editor content. TypeScript, lint (warnings only), all 1,318 tests, build, PR checks and an isolated browser acceptance check pass. Existing stored plain-Markdown drafts remain unchanged. Production publication requires approval.

- **Open branch integration review — complete** — reviewed PRs #607/#608/#609 plus equivalent Rx-capture/Atlas ancestry and Windows test fixes are merged on main at `566077c5`. Smart Customer Journey is excluded. Newer types and function settings were preserved in conflicts. TypeScript, lint, 1,316 tests, build, PR checks and repaired smoke pass; GitHub validation passed on Node 20 and Node 22. The user approved frontend publication; Pages and both Vercel deployments succeeded. No migration, function deploy, order or email was performed. Existing Rx capture object-ownership/attempt-limit and statement migration-order findings are recorded in `docs/agent/OPEN_BRANCH_REVIEW.md`.

- **Atlas** — branch `atlas` (stacked on PR #601's branch). One standalone workspace at `/atlas/:space/:articleSlug?` replaces Knowledge → Wiki, Knowledge → SOPs and Website → Pages / Content (`ContentManagerPage`, `AdminSopsPage` deleted; old URLs redirect and keep slugs). Spaces are data (`src/features/atlas/spaces.ts`): Wiki, SOPs (published-only view of the wiki) and Website (Table / Board / Gallery, saved views, bulk publish with per-row validation, 560px peek using the same editor). Storage is behind `AtlasSource`; per-space capability map (no one gains a right); installable (manifest + app-shell service worker, launcher entry, admin search over title and body); Iris panel with proposals only; Export space; ClickUp import **dry run only** (no write path). Read `src/features/atlas/CONTEXT.md`. Applied to the hosted project: nullable `help_articles.space` (`20261005130000_help_articles_space.sql`; its UPDATE bumped `updated_at` on all 51 rows). **Not verified:** PWA install prompt and service worker (in-app browser cannot register one), a live Iris reply (the function enforces same-origin CORS; the deployed `companion-assistant` grounds only on public articles until the staff-Atlas source change is **deployed**), live drag-to-publish and bulk publish on hosted data, and section delete. Blog is an embed until a blog adapter exists. Remaining separate write paths on `help_articles`: the help-panel `WikiArticleEditDialog` and `HelpArticleEditor`.

- **Wiki block editor (Phase 3)** — branch `admin-workspace-phase3-editor` (PR #600). New `BlockEditor` (Tiptap) replaces `RichTextEditor` on `/admin/knowledge/wiki` only; `RichTextEditor` is untouched for its other callers. The canonical schema gains callout, toggle, to-do, code, divider, table and page-link blocks, code/strike/underline/colour/mention inlines, and nested lists (`depths` / `depth`); `tiptapDocToCanonical` / `canonicalToTiptapDoc` bridge them and unknown blocks round-trip. Autosave (800 ms, flushed on leaving) applies settings to the live row and sends published-page body edits to a draft copy (`draft_title`, `draft_body_json`, `draft_saved_at`); Update promotes it and writes a version row. **Applied to the hosted project on 2026-10-05 through the Lovable MCP (`query_database`):** `20261005121000_help_article_versions_table.sql` (table, RLS, indexes) and `20261005120000_help_articles_draft_copy.sql`. The original `20260308193000_wiki_rich_editor_workflow.sql` was deliberately **not** run: it assigns slugs to the 39 articles that have none (changing their URLs; two share a title and would break the unique index) and backfills baseline versions from raw content. These applies are not recorded in `supabase_migrations.schema_migrations` (that table holds Lovable-generated versions). Verified live on a published page: autosave writes only the draft columns, the live row is untouched, the draft survives a reload and Discard clears it. A version row has not been exercised yet (that needs an Update on a real page). Iris actions only open the placeholder panel (Phase 5); comments are disabled (no storage). Saving, publishing and drag-drop were not exercised against hosted data. Parity tests run under Vitest (`src/components/**/*.test.node.ts` is now included). `qa:copilot-facts` reports `platformFacts.generated.ts` as stale only because the Windows checkout has CRLF; the generated content is identical.

- **Wiki workspace shell (Phase 2)** — branch `admin-workspace-phase2-shell`, stacked on `admin-workspace-theme-phase1` (PR #598). `/admin/knowledge/wiki[/:articleSlug]` is now a full-bleed three-pane workspace (`src/components/workspace/*`): resizable sidebar (Ctrl+\ collapses), page tree with drag to reorder/nest (moves write `parent_id`/`section_id`/`sort_order` only, no version row), favorites, Ctrl+K palette, Ctrl+J, right panel in `?panel=`. Same data and URLs; the editor is still the old RichTextEditor (Phase 3). Local-only for now: favorites, page icon/cover/full-width (`localStorage`, no schema). Iris and Comments panel tabs are placeholders. The hosted project returned PGRST205 for `help_article_versions`, so History cannot load and the existing save path will fail at the snapshot insert until the 20260308193000 migration is applied there. Live drag-drop, create and save were not exercised against hosted data.

- **Admin workspace theme (Phase 1)** — branch `admin-workspace-theme-phase1`. `src/styles/workspace.css` defines the `--ws-*` tokens for every admin screen; all 67 `--admin-*` variables and the shadcn overrides in `.admin-tool .admin-content` now point at them, so the brown/gold admin palette is retired and dark mode is navy + teal. Adds JetBrains Mono (labels, code, IDs), the 6px auto-hiding scrollbar (`useScrollingClass`) and `body.ws-admin` (`useAdminBodyClass`) so portaled popovers and dialogs resolve the theme. Public tokens and print previews are untouched. Not changed: hard-coded gold in individual components (for example the Doc Studio Download button and `appColors.ts`). Phases 2–5 (wiki workspace, block editor, website content database, Iris) have not started.

- **Direct Rx order shipping address** — the live CVO Rx draft showed a
  complete default shipping address, while the direct credit-account submit
  failed with “A shipping address is required to place an order.” The Rx form
  calls `place_rx_order_direct`, which omitted the address when delegating to
  `place_customer_order`. Source migration
  `20261002180000_rx_direct_submission_shipping_address.sql` now resolves the
  authenticated account's default saved address (then legacy profile address)
  before delegation. The migration SQL was applied through the connected
  Lovable database MCP; the live function and grants were verified. No order was
  submitted. The Supabase MCP could not access this project to record migration
  history. See `docs/agent/HANDOFF.md`; the user must perform the final order
  submission.

- **Innovations statement document rehearsal** — approval-gated statement PDF
  automation has a local Finance preview with PDF preview, select-all, and
  bulk approval controls. A protected, dry-run-first
  `statement-document-prepare-period` function is supplied for the one-time
  September 2026 rehearsal; it has not been run against hosted data. Normal
  October discovery remains baseline-gated. PDFs are stored in private
  website-managed Supabase Storage; Microsoft Graph and OneDrive are no longer
  part of this delivery. The worker prioritizes the oldest statement periods.
  The website-storage migration and updated functions are now source-only and
  still require hosted redeployment; scheduling and live email remain
  approval-gated. See `docs/statement-document-automation-runbook.md` and
  `docs/agent/HANDOFF.md`. The Finance page now reads all non-void durable
  document jobs in paged batches, resolves customer/contact email, warns on
  missing email, and keeps preview/print available while excluding those rows
  from approval selection. The frontend was published through Lovable from
  main after its typecheck repair; no migration, Edge Function, schedule,
  secret, or email action occurred. The admin PDF preview now uses the same
  `StatementPrintDocument` as Profile > Statements and loads the selected
  statement summary and transaction rows. Page styling keeps variable-height
  transaction rows intact and repeats table headings across print pages.

- **Rx order rebuild** — Step 0 and Phase 0 are merged (PR #587) and their migrations are live: customers cannot reach the form (`rx-order` opt-in), the form saves through the atomic `save_rx_order` RPC and creates its quote on first save, surcharges are data (`rx_surcharge_rules`), orders have an event log, and the admin test bench can preview as a customer in test mode. Phase 1a (pure domain modules `parse/normalise/validate/catalog/price/payload` + `cv.rxorder/2` schema, each characterised against the engine) is on branch `rx-phase1a-domain`. Phase 1b first cut (React form: six cards, live quote, atomic save, test mode; on the test bench behind a Form switch) is on branch `rx-phase1b-react-form`; the trace/shape picker is ported too; Chemistrie clips are ported as well; advice tips, flags and print are still to port. Edge functions importing `_shared/orders/hashref.ts` need a manual redeploy for the lab-file fixes (then `npm run qa:edge-smoke`). See `src/features/rx-order/CONTEXT.md`.

- **Doc Studio email banner dismissal** — local source adds a keyboard-accessible close button and tab-session persistence. New delivery status/attempts show it again while polling continues. Browser dismissal/reload verification and build pass. Full tests retain four unrelated failures (949 passed); PR checks retain existing public-search-index drift. Lint passes with warnings only; production release requires approval.

- **Doc Studio toolbar follow-up** — source replaces preview-toolbar font ligatures with inline SVG icons and shares wrapping layout CSS between standalone/native Studio. Text buttons and save status grow/wrap; icon buttons retain labels/tooltips and fixed hit areas. Local browser verification and build/lint pass; production release remains pending.

- **Doc Studio letterhead review** — source isolates presentation tables from admin borders/padding, adds Gold/Teal/No rule and Comfortable/Compact choices shared by preview/Word, and keeps long-letter typography readable. Image-only managed email now receives nonblank fallback text. Local browser QA, focused tests, TypeScript, lint and build pass. No release or email occurred. Four unrelated full-suite failures remain; see `docs/doc-studio-letterhead-review.md` and HANDOFF.md.

- **Native website ordering plan** — `docs/lablink-to-native-ordering-plan.md`
  maps custom prescription lenses to the profile Rx Order Form and all other
  catalogued products, including stock lenses, to the Store. It inventories
  active LabLink copy, links, legacy tracking, assistant responses, saved drafts,
  and generated search content. Planning only: no copy, route, authorization,
  order, or deployment has changed. The current Rx route defaults to approved
  customers and the form requires a linked customer account; broadening access
  to every signed-up customer with a server-authorized membership requires
  explicit authorization-change approval and server-path verification.

- **AI spend and credit monitoring** — the source now has an admin-only usage
  ledger migration, content-free metering for Anthropic, Lovable gateway, and
  Document AI calls, and an AI spend accordion under Settings > Integrations.
  Manually reconciled balances and 30-day usage power fill and top-up estimates;
  unknown figures stay unknown. The connected Lovable workspace read provided
  no balance. Local authenticated browser rendering and provider-config
  navigation, TypeScript, lint, and build pass. The full suite has three known
  CRLF-sensitive failures; PR checks reach the unrelated pending release-ledger
  gate. Docker is unavailable for local RLS testing. Migration, functions, and
  frontend are not deployed; provider billing feeds and credentials are not
  connected. See `docs/ai-spend-monitoring-plan.md`.

- **Rx order browser feedback** — source changes complete locally. Completed
  sections fold when focus moves into another panel; Enter passes through the
  optional order reference. Frame and lens summaries show labelled fields,
  selected shapes get a thumbnail, and prescription blockers now explain prism
  and fitting-height limits. The collapsed frame summary places `Supplied by`
  beside the shape, separates field labels from values with fine rules, and
  removes hidden body spacing. Frame and lens summary headings now align at the
  top. The all-treatments drawer closes when focus or a pointer moves outside
  the popular choices area and drawer. Chemistrie selections are lab instructions only: their
  full specifications enter the order notes, without a SKU, quote item, or
  provisional charge. The frame panel and order rail are more compact.
  Chemistrie Sun includes the manufacturer's eight gradient choices; Blue and
  Readers use listed powers, Drive is fixed, and Black is no longer a magnet
  choice. Focused Rx tests (71/71), TypeScript, lint, build, and local keyboard
  browser checks and PR checks pass; the PR gate uses an explicit documentation
  symmetry exception because its release generator would mark this source-only
  work as a production release. The full suite has three pre-existing
  CRLF-sensitive failures outside Rx. No hosted release or production order was made.

- **Customer-device walk-in payments** — source now lets a walk-in pay on their
  own phone instead of handing a card over the counter. Staff can still take the
  card on the shop device, or **Publish link** (mints a one-time token plus a
  six-character claim code the cashier reads out; the customer scans the static
  counter QR at `/pay` and types it), or **Request by email** (token minted and
  mailed entirely server-side, valid 72 hours). A customer can also self-serve at
  `/pay` with no staff involvement, bounded to BBD $20–$500, behind Cloudflare
  Turnstile, a durable per-IP rate limit and an admin kill switch; those land in a
  "needs matching" queue on the admin page. Tokens and claim codes are stored only
  as SHA-256 hashes and `anon` has no access to `walk_in_payments` — every public
  read goes through the new `walkin-pay` Edge Function (`verify_jwt = false`, auth
  by token in code) rather than through `scotia-payment`, which stays staff-gated.
  `scotia-return` now routes customer-originated walk-ins to `/pay/result` instead
  of the admin shell. The stored `currency` CHECK is corrected from `'840'` to the
  `'052'` the gateway has always signed, and existing rows are backfilled. Card
  entry still happens only on Scotia's hosted page; no PAN, CVV or expiry is
  accepted anywhere. Migration `20260917101500_customer_device_walk_in_payments.sql`
  **is applied to the live project `xstmeirxhfbiyayrrsob`** (5 RPCs, 2 new tables,
  the `origin` column, realtime publication, and all 8 pre-existing payment rows
  backfilled from `'840'` to `'052'`). `walkin-pay` is deployed and answering. Both
  the assisted-link and email-request flows have created correct rows in
  production. The migration is idempotent and re-runnable, and now ends with
  `NOTIFY pgrst, 'reload schema';` like the repo's other 97 migrations — without it
  the new RPCs 404 from the Data API for ~10 minutes after the DDL commits, which
  is the "could not find the function ... in the schema cache" failure this entry
  was originally reported against. Also exercised against a scratch PostgreSQL 16
  instance (publish, resolve, replay, expiry, bounds, kill switch, matching, anon
  lockout, rate-limit trip), applied twice to prove idempotency. Lint, the full
  test suite and the production build pass. **`TURNSTILE_SECRET_KEY` /
  `VITE_TURNSTILE_SITE_KEY` are still unset, so self-serve reports itself disabled
  and refuses to sign — by design; the assisted and email flows are unaffected.**
  No end-to-end payment has yet been taken through the Scotia test gateway.
  `supabase/config.toml` carried the wrong `project_id` (`dzsalnvmlvjoatryhqfz`,
  the unfinished Datamation destination), which is what
  `.github/workflows/edge-function-release.yml` parses to choose a deploy target;
  it now points at the live project. `scotia-payment` and
  `scotia-return` still require deployment plus `npm run
  qa:edge-smoke`; live gateway verification against the Scotia test environment is
  still outstanding.
- **Rx Snap — prescription capture and draft intake** — proposed, not started.
  Plan: `docs/RX_SNAP_BUILD_PLAN.md` (read it before touching anything under
  `src/features/rx-snap/`). Photo/PDF capture of inbound prescriptions, parsed
  into partial `cv.rxorder/1` payloads that replay through the existing Rx Order
  Form via `restorePayload()`. It is a second producer of the prefill contract
  in `src/features/rx-order/prefill/rxOrderPrefill.ts` — not a new form. Phase 1
  is capture, storage and the job queue only, with no extraction. Open decisions
  (model provider/tier, corrections-per-draft threshold, image retention) are
  listed at the end of the plan and are Russell's call, not the agent's.

- **Shipment costing workbench repair** — source now uses the bundled PDF.js
  reader with signed-URL failure handling instead of an iframe, labels the panel
  accurately as a PDF reader, and preserves uploaded documents when an operator
  unlinks reviewed evidence. Supplier-specific charge suggestions now choose a
  complete most-common historical row profile (rather than averaging values),
  applying amount, VAT, duty, reclaimability, and notes together. Enter advances
  deterministically through the charge grid and adds a final row after Notes.
  The three-column workbench lets document review expand vertically and the
  landed-cost story collapses to its summary. The shipment action bar is sticky
  and wraps its actions instead of clipping them. Three columns now begin only
  at the wide-desktop breakpoint; below it, shipment header and landed-cost
  story use a comfortable context layout above a full-width document work area.
  At wide desktop, the invoice-items, landed-charges, and export tabs span the
  Shipment Header and Document Review columns while the landed-cost story
  remains readable beside them. Document review can minimize to a reversible
  header that retains the selected source and immediately releases its work
  surface upward without leaving the former fixed-height blank area. DHL shipments visibly show
  the existing 10% insurance-and-freight charity contribution in both landed-cost
  summaries without changing their totals. No OCR provider, migration, live data
  write, or deployment is part of this source change. Focused tests, build, and
  local authenticated external-Edge browser review pass; frontend release remains
  pending.

- **Shipment costing binder and Google Document AI intake** — source keeps a
  selected PDF to one pageable workbench viewport and makes the generated
  costing sheet the default document-review front page. Reviewed shipments can
  export the existing binder before lock. The new Settings > Integrations
  surface encrypts a Google service-account JSON, and the `document-ai` Edge
  function can create draft-only extraction records; Iris can read these
  records and templates but cannot write them. Google Document AI API and the
  `Classic Visions Shipment OCR` processor are created in the existing
  `classic-visions` project. Google Console rejected creation of the required
  service account (tracking `c489999731242316`), so no credential was saved,
  no document was transmitted, no migration or Edge function was deployed,
  and production OCR remains disabled.

- **Pricelists navigation refactor** — source now replaces the three generic
  pricing editor links with `/admin/pricing/pricelists`, a searchable,
  sortable, 25-row-paginated version table and the version-scoped editor route
  `/admin/pricing/pricelists/:versionId/:section`. RX, Stock, and Supplies reuse
  their existing editors inside one lazy, draft-preserving shell; invalid IDs
  never select another version, old section URLs redirect to the selection
  table, and Product Catalog price links require an explicit version choice.
  Dirty state is aggregated across the three mounted sections and warns only
  when leaving the editor or unloading the page. No database, pricing formula,
  persistence, materialization, export, preview, or customer-pricing contract
  changed. Focused tests, affected-file lint, the production build, diff checks,
  and authenticated external Edge route/search/navigation/draft-retention/exit
  warning QA pass locally. The frontend change is not deployed.

- **Pricelist, Gatekeeper, shipment, and support workflow repair** — source now
  distinguishes manual from bulk line-price overrides, bypasses materialization
  for metadata-only saves, preserves manual prices by default, and exposes a
  separately confirmed replace-all path. Gatekeeper has production-only route
  and polling controls, durable 15/30/60/120/240/360-minute outage backoff,
  one degraded-state notification, and service-only pre-POST Rx fallback to
  Innovations. Supplier history can fill only still-blank shipment fields, and
  the existing post-ticket attachment guard is covered for count, size, and
  storage failures. Both reviewed migrations and `gatekeeper-orders` are live;
  database definitions, grants, 481 override rows, and the three pre-existing
  duplicate logical-key groups were verified after deployment. The staging
  Gatekeeper route, status polling, and cron remain disabled. The frontend is
  published and external Edge browser QA confirmed the safe pricelist choice,
  the separate replace-all action, the disabled Gatekeeper controls, and that
  selecting a supplier with no shipment history preserves typed Type and
  Commodity values. Production PIN reconnection remains pending; the local
  Edge smoke run was blocked before HTTP by the workstation
  certificate-revocation chain.

- **HA Optical stock-order availability** — production catalog data and SQL
  functions were repaired on 2026-09-09. `get_stock_order_catalog` no longer
  fails on its ambiguous customer-name reference, stock lens pair prices are
  converted to per-lens order-line prices, three Innova families now map to
  their correct website lenses, and the missing chiral SKU variants exist.
  HA order `DC30B7E3` was released to Innovations with 17 lines, 36 pieces,
  and a $1,403.00 total. Migration
  `20260909203000_fix_ha_stock_order_catalog.sql` records the live repair.
  `StockOrderBuilderPage.tsx` also stops clearing its persisted draft id on
  every line edit; that frontend cleanup fix still requires the normal site
  deployment.

- **Portal invoice detail and Helpdesk images** — source now makes a posted
  statement row open an invoice-line preview and includes that exact preview
  when a customer asks about the invoice. It adds private, ticket-scoped image
  attachments for portal replies and assistant-created portal tickets. Migration
  `20260907162409_portal_helpdesk_attachments_and_invoice_details.sql` and the
  updated `live-data-gateway` function require deployment. The private
  OptiLens connector now implements `innovations.customer_invoice`, including
  customer-scoped posted-invoice lines. Live source verification is currently
  blocked because the configured read-only reporting account has an expired
  password; never infer item details from the statement total.

- **Scotia payment activity and statement card saving** — source now adds the
  admin-only `/admin/settings/payment-activity` confirmation ledger, backed by
  a security-invoker projection that exposes only time, reference, type,
  amount/currency, and result. Statement payments now offer an explicit
  pre-redirect save-card choice; the provider-issued token is stored only after
  a signed approved callback. Migration
  `20260904170609_card_payment_activity_and_statement_token_save.sql` and the
  updated `scotia-return` function require deployment before shared-environment
  verification. Never expose gateway parameter bags, CVV, PAN, expiry, or
  token data in the activity UI.

- **Iris AI-first response and two-front identity** — the public assistant now
  withholds its deterministic high-confidence match while generation is in
  progress, showing it only as a controlled fallback if generation fails. The
  shared prompt now defines the public customer-experience front and the
  authorized business-operations front. Her staged fictional portrait now
  opens an in-page public profile with the approved bio, AI disclosure, and
  explicit public-versus-operations boundary; no email mailbox,
  LinkedIn profile, service account, or Edge Function deployment has occurred.
  The approved actor-scoped access and controlled-admin-SQL contract is in
  `docs/iris-data-access-contract.md`; an admin-only financial-data capability
  is staged in source and still requires migration/Edge Function deployment.
  The controlled SQL gateway remains intentionally unimplemented.

- **Portal Copilot Helpdesk + voice reliability** — source now generates schema-valid Helpdesk ticket numbers, normalizes named priorities to the database's 0-5 scale, records through explicit click-to-start/click-to-stop audio capture, and inserts the formatted transcript directly into the active composer without a review gate; five seconds of silence stops and submits the transcription automatically. Sending remains explicit. The `portal-copilot` and `voice-transcribe` functions still require deployment before live shared-environment verification.

- **Doc Studio annotation completion** — My Files now loads through the cloud bridge, searches saved-file content and metadata, filters by type, avoids the duplicate file-manager heading, keeps its dark styling limited to the sidebar, loads Material icons, exposes a blank-email Compose action, and autosaves edits to an open saved file. Local browser verification and focused tests passed; edge-function deployment is still required before shared-environment release.

- **CV Portal Copilot connected capabilities** — source implementation now includes
  a deterministic qualified-CRM scan using contacts, order-health, opportunity
  and activity data. It prepares evidence/inference-labelled follow-up tasks and
  requires per-item approval before creating a CRM activity; it never auto-creates
  opportunities. The new workflow migration and updated `portal-copilot` function
  require deployment before live verification. Pricing-advisor and public-web
  enrichment data seams are mapped but not yet enabled.
- **CV Portal Copilot ERP rollout MVP** — source implementation is complete at
  `/admin/copilot`: admin-only route, live Innovations-synced rollout planning,
  Level 2 preparation with Level 4 invitation approvals, push-to-talk transcript
  review, audit history, email retry/partial-failure handling, and three new
  Classic Visions MCP tools. The
  `20260813130000_portal_copilot_mvp.sql` migration and the `portal-copilot`,
  regenerated `mcp`, updated `admin-user-management`, and `docstudio-api`
  functions still require deployment before live workflow verification.
- **Classic Visions MCP deployment** — Codex is registered against the streamable-HTTP endpoint and the local OAuth-protected function exposes three read-only tools. The live endpoint still returns `404 Requested function was not found`; direct deployment is blocked because the currently authenticated Supabase account returns `403` for function access.
- **On-demand live-data gateway** — the CV Web request/response function,
  short-lived gateway migration, live Innovations statements/balances, and live
  OptiLens delivery-status UI are implemented and verified locally. The
  migration and edge function still need deployment, and the network-hosted
  OptiLens checkout must be updated before the gateway can be enabled live.

- **Smart customer journey** — first-release code, database migration, controlled lens rules, customer command centre, Rx draft handoff, and route/test coverage are implemented. The migration still needs to be applied to the target Supabase project and an approved rule set must be published before live recommendations are enabled.

- **Catalog editor wizard** — `NewCatalogDialog` component not yet shipped.
  Implementation prompts exist in `plan.md` (Codex handoff sequence). Three
  component prompts + one SQL migration for the `status` column are queued.
- **Canvas-based editor v2** — `src/features/admin/catalog-editor-v2/` is the
  new editor shell. Not yet the live route. The legacy editor at
  `/admin/pricing/publisher/:id` is still what users hit.

## Known broken (do not assume these work)

| Area | Issue |
|---|---|
| Catalog duplicate | Copies `catalog_templates` row only — does NOT copy `catalog_sections` or assignments |
| Draft status | UI label only — no `status` column exists yet in DB; migration pending |
| PDF export | List-page PDF ≠ editor preview output |
| Fixed section preview | Shows placeholder text unless a matching `help_articles` record exists |
| Drag-and-drop reorder | UI hints at drag handles but reorder does NOT persist |
| Gatekeeper production connection | Staging is intentionally disabled; a fresh production PIN and a successful read-only status pull are required before polling can be enabled |

## Do not touch

- `src/features/admin/wiki/` — stable, separate concern; no active work
- `src/config/routeRegistry.ts` — route registry must stay synchronized; changes require route registration + auth decision + test
- `package-lock.json` — do not switch to bun or yarn; npm is the single lockfile

## Recently stabilized (safe to build on)

- Wiki article renderer — shared renderer in place; preview and published views both use it (Atlas uses the same one)
- Customer assignment — list-page assign dialog is correct and stable
- Auth guards — `/admin/**`, `/admin/moonshot/**`, `/ops/**` all behind `AdminProtectedRoute`
- Portal Lab pricelist access — `Is Lab` resolves through person, parent, customer contact, or `contacts.linked_customer_id`; follow-up migration must be deployed before production verification

---

## Key data model (quick reference)

```
catalog_templates      — cover metadata, name, status (column pending migration)
catalog_sections       — ordered section rows per template
pricelist_versions     — pricing data source for rx/stock/supplies sections
help_articles          — content source for knowledge + fixed sections
catalog_assignments    — many-to-many: templates ↔ customers
```

## Context pointers (fetch only what the task needs)

| Task area | Go read |
|---|---|
| Catalog editor behavior | `docs/catalog-editor-current-behavior.md` |
| Routing rules | `plan.md` + `src/config/routeRegistry.ts` |
| Design constraints | `classicvisions_design_philosophy.md` |
| Agent/validation rules | `AGENTS.md` |
| Architecture overview | `docs/architecture/README.md` |
| Feature-level context | `src/features/<name>/CONTEXT.md` |

## Contact us / Get support attachments — 2026-10-09

Local source enables public Iris attachment browse, description paste and window drop for images, documents and audio; pending composer files and sent chat files carry into requests. Public multipart ingestion persists private Helpdesk attachments without public bucket access. Existing admin shared picker already supports dialog-wide paste/drop. Migration and function/frontend release require approval; hosted upload and authenticated read proof remain pending. See HANDOFF.md.

## Iris visitor conversations — 2026-10-09 (production release)

Public starter prompts now give contextual frame/coating/policy guidance and a relevant follow-up instead of account counts or weak product matches. Account lookup requires a record-specific intent; sign-in alone does not identify a public visitor as a dispenser. Generated answers are included in subsequent conversation context. The lens guide retains audience and supplies use-specific education, prescription/measurement limits and retailer links without promising an automated prescription match. Search the site uses the existing grounded companion-assistant path; legacy web action types remain compatible but no longer call the retrieval-free, 400-character companion-web-search endpoint. No new service, environment variable, schema or authorization change. User approved publication; main commit 631870c6 reached Vercel READY and the custom-domain production aliases. Live browser confirms contextual starters, guide, site-search scope and a generated frame conversation with a simplified follow-up. Generated replies can still add unrequested product suggestions and citation-number mismatches; the server endpoint was not changed.

## Portal support sends — 2026-10-09 (local source)

CustomerOrdersPanel life-buoy questions use the signed-in staff owner and the selected contact as partner_contact_id; notification now defaults on. Person/company audience rules remain unchanged. Ticket creation writes helpdesk_tickets directly, followed by a timeline event; helpdesk-email handles optional staff-to-contact notifications. A failed event or notification must not turn a persisted ticket into a failed submission or encourage duplicate creation. Notification errors and skipped recipients now warn visibly. Iris retains failed request drafts, exposes submissionError inline and guards concurrent form sends. Both forms use mobile input text and 44px send controls; the admin dialog bounds height with dynamic viewport units and scrolls.

Hosted read-only inspection confirms ticket/event grants and RLS allow existing staff and eligible self-owned portal creation. No schema, authorization, Edge Function or environment-variable change. The exact original production failure remains unconfirmed without a named approved send; frontend release and actual email delivery still require approval.

Ticket title follow-up (2026-10-09, local): portal Helpdesk list rows and their text flex child now allow shrinking. The title uses one-line ellipsis with a full-title hover attribute; stored text and ticket navigation stay unchanged. Status/date can wrap on narrow screens. This ships with the pending portal send repair.

Mobile admin search follow-up (2026-10-28, local source): GlobalSearch collapses to a search button below 768px. Opening focuses a 16px input and shows viewport-wide results beneath the topbar; labels wrap and results scroll within 60dvh. Outside tap, close button, Escape and navigation dismiss it; Escape/close restore button focus. Desktop retains its inline input and Ctrl+K. Search permissions and data sources are unchanged.

Order transmission and supplementary invoices (2026-10-28): unpriced published stock items carry price_pending and lab hold notes; account-only prices, Gatekeeper default and server-driven auto-transmit for new submissions, admin switch with manual mode, and staff-issued itemised BBD invoices payable separately from the customer cart. Website shipping transitions are blocked for unpaid extras/unquoted submissions. Test fixtures and historical drafts are not auto-sent. Existing payment settlement and access controls remain authoritative. See docs/order-transmission-and-extra-invoices.md for operational limits and verification.
