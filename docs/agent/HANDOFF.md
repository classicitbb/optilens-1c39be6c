## 2026-10-09 — Iris visitor conversation quality

Status: Complete — no active handoff

User approved frontend publication. Iris fix ac97b542 was preview-built successfully, integrated with concurrent attachment-release documentation, and published from main commit 631870c6. Vercel production reached READY and its classicvisions.net / www.classicvisions.net aliases point to that release. The scoped delta contains only assistant frontend/tests and documentation; no Edge Function/config, migration, credential, access or request-form submission occurred.

Production browser verified signed-in public frame, coating and policy starters; Myself → Computer & screens → Not yet / not sure guide; renamed Search the site and its honest search scope. Generated follow-up about an existing full-rim frame answered frame integrity, fit and material checks; a second request simplified the same thread into three questions. Screenshot evidence is in this chat's artifacts. One browser typing timeout left a partial draft; it was completed and submitted once, with no duplicate request.

Known limitation: generated replies can still add unrequested product suggestions and their displayed citation numbering can disagree with inline references. These are existing server generation/citation behaviors; this frontend publication does not certify every generated answer or change the server endpoint. The old companion-web-search backend remains deployed but is unused by this frontend.

Validation: 31 focused tests, final TypeScript, build, PR checks and git diff --check pass. Full lint: 0 errors / 2431 warnings; focused lint: 0 errors / 20 warnings. Full test command finished 225 passed / 3 failed files, 1496 passed / 3 failed tests. Untouched failures: adminPortalCopilot.integration credential source-string expectation, rxFormChemistrie.integration clip timeout, rxFormShape.integration trace upload assertion. No broad-suite success claimed.

# Work Handoff

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
