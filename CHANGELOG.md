# Changelog

> Indexed summary entry point. Detailed source entries live in `docs/changelog/` and are aggregated here for backward compatibility.

## 2026-09-04 — Walk-in payment customer email and receipt printing

### Release Notes
- Walk-in card payments at **Settings → Walk-in Payments** now support an optional customer email field.
- Upon payment completion, a receipt is automatically emailed to the customer.
- Staff members are immediately prompted with a confirmation modal asking if they would like to print a physical receipt, and can re-print or resend the receipt email at any time.

### Technical Changelog
- Added `customer_email` column to `public.walk_in_payments` table and updated `create_walk_in_payment` to store and validate customer email.
- `sendWalkInPaymentReceipt` delivers transactional receipts to the customer email with fallback and copy to staff, and supports forced resending.
- Added `send-walkin-receipt` authenticated staff action in `scotia-payment`.

## 2026-09-04 — Scotia payment confirmations and saved statement cards

### Release Notes
- Administrators now have **Settings → Payment Activity**, a compact Scotia card-payment confirmation list showing only when a payment happened, its reference, type, amount, and result.
- Statement amounts remain on one line, and customers can opt in to securely save a card before they continue to Scotiabank.

### Technical Changelog
- `scotia_payment_activity` is a security-invoker projection over staff-RLS gateway events; gateway request/response bags are cleared and no gateway payload, card details, expiry, token, or failure diagnostics enter the browser.
- Statement settlement now saves a provider-issued token only after a signed approved callback and records only its saved-method relationship on the payment intent.

## 2026-08-27 — Continuous CRM contact enrichment

### Release Notes
- Contacts are now kept up to date from public business listings on their own. A nightly sweep and a 15-minute new-contact worker look each business up on Google Places and fill in blank website, phone, address, city, state, postal code and rating details.
- Nothing already entered is overwritten. When a listing disagrees with a stored value it becomes an approval card in the Copilot showing the current value, the proposed value, the source link, the retrieval date and a confidence score.
- Ask the Copilot to enrich a contact, list what is waiting for review, or queue those findings for approval. **Leads → Bulk Actions → Enrich All** runs a batch, and a contact's own editor has **Enrich from public web**.

### Technical Changelog
- New `crm-enrich-contacts` edge function with scheduler-secret or administrator auth, a 40-contact batch, a 150/day attempt cap, a 30-day per-contact floor and a `?dryRun=1` mode. Policy lives in `_shared/enrichment/contactEnrichment.ts` and is shared with the Copilot's `enrich_contact` tool.
- `contact_enrichment_attempts` and `contact_enrichment_findings` record field-level before/after with source URL, retrieval date and confidence. `apply_contact_enrichment` is the only write path.
- `preserve_populated_crm_fields_on_innovations_sync` gained a transaction-local opt-in so an approved correction is no longer silently reverted; the Innovations receiver's protection is unchanged.
- `copilot_actions.action_type` widened with `apply_contact_enrichment`, reusing the existing approve/reject, audit and retry path.

## 2026-08-27 — Copilot microphone choice and platform self-knowledge

### Release Notes
- The floating Portal Copilot now has the same microphone picker as the full console, including hold-to-record and a live input-level bar, and remembers the chosen microphone across page loads and both surfaces.
- The Copilot now knows the platform it runs in: every module and page, the data it can read and write in each, and where the app is hosted, where its data comes from and which services back it. It answers capability questions by offering to do the work rather than describing manual steps.
- The Copilot is also told which admin page is open, so ambiguous questions resolve against what the admin is actually looking at.

### Technical Changelog
- Extracted the voice device menu into `VoiceSettingsMenu`, shared by `AdminCopilotAssistant` and `PortalCopilotPage`. `usePushToTalk` persists only `deviceId` and falls back to the system default when a remembered microphone disappears.
- Replaced the hand-maintained `systemContext.ts` with `platformFacts.generated.ts`, produced by `scripts/generate_copilot_platform_facts.mjs` from `apps.ts`, `adminResources.ts` and a small hand-maintained facts file. Detail beyond the always-on index is served on demand by the new `get_platform_facts` tool.
- `submit-command` accepts a `pageContext` slug and resolves it through the generated route table before adding it to the system prompt; the raw client string is never interpolated.

## 2026-08-22 — Customer portal experience pass

### Release Notes
- Sitewide release validation is restored across the storefront, Portal Copilot, Rx ordering, and the public store-variant security boundary.
- Portal customers can preview saved drafts, open lab-order details, collapse account navigation, and use a roomier support assistant with in-place chat history and dictation.
- Barbados lab prices are identified as BBD, web-cart prices remain identified as USD, and users without price access no longer see pricing-availability language in Rx ordering.
- Saved payment methods now live inside My Profile as checkout-created records that customers can edit or remove; internal CRM approval markers are no longer exposed.
- Saved addresses now live inside My Profile, and inline profile edits can be applied with Enter.
- Portal Copilot can create Helpdesk tickets through its shared admin tool and records voice until the user explicitly stops it for punctuated transcription.

### Technical Changelog
- Restored the sitewide CI gate by aligning refactored Portal Copilot and Rx-order contracts with their tests, providing the storefront test with its required query runtime, and correcting the public store-variant view to execute with caller permissions in both fresh and already-migrated databases.
- Fixed profile metadata synchronization, bundled the PDF renderer statically with retries, enabled same-origin microphone permission, and added permission-aware Rx account configuration.
- Added assistant drag, recurring snoozable nudges, a six-line composer, full-height request forms, and inline saved-conversation loading.
- Refined the assistant request form to give its details field all remaining panel height, and retained the former payment-method URL as a redirect to My Profile.
- Stabilized the multiline assistant composer as a rounded rectangle with bottom-aligned voice/send actions, and retained the former address-book URL as a redirect to My Profile.
- Aligned Copilot Helpdesk writes with the live schema contract by generating ticket IDs/numbers, translating priority labels to 0-5, and replacing browser speech-recognition lifecycle coupling with MediaRecorder plus the governed transcription function; silent prompt echoes are now rejected instead of inserted as dictated text.

## 2026-08-18 — Statement document automation

### Release Notes
- Newly discovered non-void Innovations statements now enter a durable PDF, OneDrive, and authenticated portal-download workflow.

### Technical Changelog
- Added idempotent statement document jobs, activation baselining, Microsoft Graph upload orchestration, and post-upload canonical email gating.

## 2026-08-15 — Canonical stock quotations

### Release Notes
- The Stock Order Builder now saves a linked STOCK quotation using the same protected non-zero price resolution as the account catalogue, and opens the populated quotation in DocStudio.

### Technical Changelog
- Added an account/Retail/catalog/manual pricing resolver, atomic stock-draft-to-quote command, linked DocStudio billing document, and editing-staff-only profit context.

## 2026-08-14 — Portal Copilot qualified CRM suggestions

### Release Notes
- Administrators can scan current CRM and order-health signals for a focused queue of lapsed-buyer, overdue-follow-up, incomplete-contact and opportunity-review suggestions, then approve only the tasks they want created.

### Technical Changelog
- Added a deterministic CRM recommendation planner, real contact/order-health/opportunity/activity adapters, evidence-versus-inference UI, and an approval-only bridge to existing CRM activities.
- Documented the verified pricing-advisor and public-web enrichment seams without enabling guessed or automatic writes.

## 2026-08-14 — Portal Copilot multi-chat workspace

### Release Notes
- Administrators can start a new Copilot chat, keep multiple conversations, and switch between them without losing prior messages or workflow results.

### Technical Changelog
- Added user-owned conversation/message storage, linked rollout runs to conversations, backfilled existing runs, and replaced the run-only sidebar with persistent chat history.

## 2026-08-13 — Admin Portal Copilot MVP

### Release Notes
- Administrators can prepare an ERP-customer portal rollout from one typed or confirmed voice command, review every proposed action, and explicitly approve or reject invitations.
- The workflow keeps a durable audit trail and treats ambiguous contacts, missing email addresses, and partial email failures as visible follow-up work instead of silently guessing.

### Technical Changelog
- Added Claude-only Copilot settings, run/action/audit storage, a strict admin Edge Function, deterministic rollout planning, existing portal-provisioning and Doc Studio email reuse, and MCP tools for prepare/list/decide operations.
- Added the registry-backed `/admin/copilot` surface, push-to-talk controls, approval editing, and Windows-safe admin smoke-process launching.
- Corrected Edge push-to-talk startup so Web Speech begins inside the initiating press instead of falsely reporting denied permission after microphone approval.

## 2026-08-12 — Unified Order Dispatch and MCP Artifact Stability

### Release Notes
- Rx and stock orders now share one Hashref v2.5 writer and can be released through either Innovations or Gatekeeper without duplicate claims.
- MCP Edge Function generation is now explicit at deployment time; normal Vite builds and Vitest runs no longer overwrite the portable function artifact.

### Technical Changelog
- Added the shared canonical-order writer, stock dispatch migration, Gatekeeper stock routing, and coverage for the generated Hashref contract.
- Corrected the Gatekeeper contract lookup to `/api/v2/orders/contract_available`.
- Added `npm run mcp:generate` and deploy/CI wiring that generates a portable bundle for the selected Supabase project.

## 2026-08-11 — Stock Order Form Discovery and Drafts

### Release Notes
- Staff can open the Stock Order Form from the header launcher or global search.
- Stock order drafts are restricted to lab accounts and are visible from the quotations/drafts surface for reopening.

### Technical Changelog
- Added registry-backed route search coverage, a lab-scoped stock-account view, persisted staged-order draft reopening, and route/accessibility regression coverage.

## 2026-08-06 — Header Launcher Shortcuts

### Release Notes
- Staff can open Activities and the Rx Order Form directly from the header app launcher.

### Technical Changelog
- Added permission-aware launcher shortcuts backed by the canonical admin routes, plus route-registry and regression-test coverage.

## 2026-08-06 — Quote Requests Routed Through Helpdesk

### Release Notes
- Customer quote requests now create a linked Helpdesk ticket, preserve the sent request as read-only history, and direct every follow-up reply into that ticket conversation.

### Technical Changelog
- Added an atomic authenticated quote-request RPC, canonical quote-to-ticket relationship, STOCK-request immutability for customers, ticket status/link rendering, and focused portal regression coverage.

## 2026-08-04 — Multi-account Portal Access

### Release Notes
- One customer login can now be granted access to multiple company accounts and switch the active account inside My Account.

### Technical Changelog
- Added membership-scoped account authorization and feature overrides, server validation in the live-data gateway, non-destructive admin linking, account-scoped request caches, and migration coverage for existing single-account profiles.

## 2026-08-04 — Portal Lab Pricelist Tag Resolution

### Release Notes
- Selecting **Is Lab** on the portal customer's CRM person or resolved company now unlocks Stock Lenses and Lab Supplies when the customer returns to the pricelist page.

### Technical Changelog
- Extended lab authorization to CRM companies resolved through `contacts.linked_customer_id`, removed the five-minute denied-access cache, and made failed tag-link replacement visible to the editor.

## 2026-07-30 — Live Helpdesk Conversations

### Release Notes
- Helpdesk replies can now appear in the customer portal and operator inbox without a browser refresh.
- An assistant request for human help opens the exact live Helpdesk conversation once the customer confirms it.

### Technical Changelog
- Added an authenticated, idempotent message RPC and private Supabase Realtime topics, with database authorization for the relevant customer or staff member only.
- Added targeted client-cache refreshes for one ticket and the office inbox, avoiding polling and broad data reloads.
- Corrected a database-function result-column collision that blocked reply sending, and prevented a handled send error from becoming an unhandled browser promise.
- Standardized two-way conversation alignment (sender right, received reply left) and added one server-side Helpdesk acknowledgement per customer conversation, with business-hours and urgent-call wording.

## 2026-07-24 — Sales App Consolidation

### Release Notes
- Closed the standalone Sales app. Proposals now live in CRM; quotations and website orders now live in Website.
- Admin → Settings → Integrations now includes secure DHL Express MyDHL configuration for on-demand shipment tracking and landed-cost estimates.

### Technical Changelog
- Replaced Sales routes with canonical `/admin/crm/proposals`, `/admin/website/quotations`, and `/admin/website/orders` routes, updated navigation and permissions, and added regression coverage that prevents the Sales app or routes from returning.
- DHL Basic Auth credentials are encrypted at rest and resolved only by an admin-protected Edge Function; DHL tracking and landed-cost results are not stored.

## 2026-07-22 — Staff Public Networking Cards

### Release Notes
- Staff can create an opt-in public networking card with email, WhatsApp, skills, and a one-tap downloadable contact card.
- A staff member's profile home screen now has **Share my card**, opening a large event-ready QR code.
- Admin → Settings → Users has QR-preview and ID-card actions for every admin, operator, or viewer.

### Technical Changelog
- Added the RLS-protected `staff_public_cards` read model, public `/connect/:slug` route, vCard generation, and QR rendering.
- Kept public-card data separate from private portal/CRM profile fields; unpublished cards remain non-public.

## 2026-07-19 — Contacts Access Deployment Assistant

### Release Notes
- Contacts now provides one guided entry point for customer portal access and internal staff access, with safe sandbox training available before a live deployment.
- The assistant finds contacts, customer accounts, and existing logins, then asks for only the account, login, and role decisions that require human confirmation.

### Technical Changelog
- Added a protected explicit existing-login/customer-link action, verified-email context, and a contacts-first workflow for invite, temporary-password, and role-assignment deployment.
- Published contextual Wiki guidance and an operations follow-up template for missing data, conflicting links, and failed deployments.

## 2026-07-18 — Integration Status Recovery and Dependency Refresh

### Release Notes
- Administrators can recheck the payment gateway and clear a stale error only after a successful zero-impact credential test.
- Innovations sync status can be refreshed on demand; duplicate account-number links disappear from the warning once the underlying records are resolved.

### Technical Changelog
- Refreshed the npm dependency set and lockfile; TypeScript remains on 6.x because the current `typescript-eslint` peer range does not support 7.x.
- Added a privileged payment-gateway test-result RPC that records the test time and status without exposing gateway credentials.

## 2026-07-16 — Portal Statements and Live Order Status

### Release Notes
- Approved customers can now open Statements without needing a staff role.
- Local portal testing on port 8081 can reach the live-data gateway, restoring live order and delivery status requests.

### Technical Changelog
- The account sidebar now uses the shared `statements` feature decision, and regression tests cover both enabled and disabled access.
- The shared Edge Function CORS policy explicitly permits the local Vite origin used by the portal test server.

## 2026-07-14 — Website Portal Contact Editing

### Release Notes
- `/admin/website` now opens Website Portals first.
- Selecting a portal account opens the existing Contacts editor in place, rather than navigating away to Contacts.

### Technical Changelog
- Website Portals now uses the signup-synchronized `profiles.email` value and reuses the Contacts edit dialog for linked customer contacts.
- Recorded the Customer Contact as the canonical editable surface for CRM, Innovations linkage, and optional portal access.
- Customer rows now open the shared dialog on Portal Settings; their right-click menu provides Edit contact, Edit portal, Emulate, and Create login actions.

## 2026-07-13 — Specialty Lenses

### Release Notes
- Added the new Specialty Lenses page with accessible expandable details for Endless Pilot Progressive and OmniLux NAL.
- Specialty Lenses is now available from the Lifestyle Lenses menu; the House Brands heading and full-screen mobile navigation have also been refined.

### Technical Changelog
- Added the canonical `/lenses/specialty` route, typed specialty-lens content, reusable action URLs that retain the selected lens identifier, and accordion interaction coverage.

## 2026-07-13 — Innovations EFT Bank Portal Directory

### Release Notes
- Bank Payment Portals now receives the exact EFT-institution directory from Innovations and identifies source-managed rows.
- Verified retail online-banking destinations are seeded; ambiguous, placeholder, and non-retail entries remain intentionally unmapped instead of redirecting a customer to the wrong institution.

### Technical Changelog
- Added immutable `innovations_eft_institution_id` matching, a cloud receiver entity, and a read-only OptiLens Local `dbo.EFTInstitutions` sync entity that preserves the exact source bank name.
- Made portal URLs nullable only for entries without a verified customer sign-in page; the customer payment dialog now safely falls back to support when no URL exists.

## 2026-07-13 — Admin Email Preview Center

### Release Notes
- Administrators can now review the authentication and application emails wired into Classic Visions from Settings → Email Previews.
- The split workspace identifies each email's trigger and recipient, and previews personalized sample copy without sending an email.

### Technical Changelog
- Added canonical admin route `/admin/settings/email-previews`, sidebar navigation, and route-accessibility coverage.
- The preview catalog covers six authentication templates and eight registered transactional templates while retaining the existing source-managed, authenticated email send pipeline.

## 2026-07-13 — Storefront Cost-Access Regression Guard

### Release Notes
- Anonymous storefront visitors can see published sell prices without receiving product-cost values.
- Direct reads of cost-bearing product tables remain blocked for anonymous and ordinary authenticated users.

### Technical Changelog
- Added safe-RPC storefront reads, a rendered anonymous storefront regression test, and a database-policy audit RPC for `addons`, `lenses`, and `supplies`.
- Added `npm run security:product-cost-rls-audit` to the required PR checks so future migrations cannot re-grant direct product-table SELECT access or add unsafe SELECT policies.

## 2026-07-11 — Portal Statements and Order Status

### Release Notes
- Customer statements now use posted Innovations statements with full aging, balance, and transaction detail instead of a synthetic current-period record.
- My Orders now includes live Innovations WIP and same-day valid shipment status from the MSSQL-SVR gateway while retaining delivery tracking and website order history.
- Sign in now uses a more spacious, modern form with password visibility and inline reset-password access.
- My Account now shows the linked ERP account number and includes a Sign out action beside Save Changes.
- Customer account-number linking now blocks duplicate Innovations account numbers and exposes a duplicate audit view.
- My Orders now keeps every open shipment visible regardless of age, retains closed deliveries for 30 days, and lets customers expand a shipment to review its included work and tracking link.

### Technical Changelog
- Extended the live gateway, statement sync, and portal views with the posted-statement and order-status fields required by the customer portal.
- Added portal order-status search, section-count anchors, compact website-order cards, and a wider responsive account layout; the gateway now returns only Rx number, patient, received date, and status for the current account's active WIP and valid same-day shipments.
- Added an authenticated, source-managed ERP account-number lookup for My Account; customers can view the resolved value but cannot edit the integration link from their profile.

## 2026-06-24 — Product Cost RLS + Analytics Insert Hardening

### Plan
- Close reported cost-data exposure on `addons`, `lenses`, and `supplies` without changing public catalog routes or staff editing flows.
- Keep website analytics ingestion available while rejecting malformed public write payloads.
- Refresh npm dependencies within the existing npm lockfile workflow and preserve the current site behavior.

### Release Notes
- Direct reads on cost-bearing product tables are now limited to admin/operator edit roles; public and customer-facing product reads continue through cost-free views.
- Website analytics session, pageview, and web-vitals inserts now validate IDs, paths, metric names, ratings, and bounded numeric fields instead of accepting unrestricted rows.
- Dependency audit now reports zero vulnerabilities after npm lockfile refresh.

### Technical Changelog
- Added `supabase/migrations/20260624090000_harden_product_cost_rls_and_analytics_inserts.sql` to replace broad `has_any_role()` product SELECT policies with `has_edit_role()` policies and tighten analytics INSERT checks.
- Updated `src/tests/integration/supabaseRlsHardening.integration.test.ts` to assert product-cost RLS and analytics policy hardening.
- Resolved an API v1 merge-conflict marker in `supabase/functions/api-v1/index.ts` while preserving the default-order fallback behavior.
- Updated auth flow tests and shared test setup so required country selection is covered without depending on Radix Select browser internals in jsdom.

## 2026-06-05 — Shipment Costing Fixes + Security/Print Hardening

### Plan
- Close the admin shipment-costing regressions merged on 2026-05-29 so charge edits, line edits, and FOB visibility behave predictably.
- Fold in the 2026-06-01 DEV merge runtime changes without overstating doc-only churn.
- Keep this weekly summary source-backed and include direct links to the merged history items that drove it.

### Release Notes
- Shipment Detail no longer overwrites charge edits with line-item edits, and the FOB column is now preserved as read-only in the admin costing view.
- Admin UI polish fixes landed for sidebar behavior plus shared input/select rendering to address the text cutoff issues merged this week.
- The DEV merge hardened quote printing, transactional-email authorization/CORS handling, and Vercel security-header synchronization while removing Bun lockfile drift from the npm-only workflow.

### Technical Changelog
- Updated `src/pages/admin/costings/ShipmentDetailPage.tsx` to stop charge/line edit overwrite regressions and keep the FOB column read-only.
- Updated `src/components/admin/AdminSidebar.tsx`, `src/components/ui/select.tsx`, and `src/components/ui/input.tsx` for the sidebar/text-cutoff fixes that were merged on 2026-05-29.
- Updated `src/components/admin/QuotePdfExport.tsx` to use explicit first-page/continuation pagination rules and continuation headers for quote print output.
- Updated `supabase/functions/send-transactional-email/index.ts`, `vercel.json`, `scripts/sync_vercel_security_headers.mjs`, `scripts/check_lockfiles.mjs`, and `package.json` to tighten privileged email access, sync enforced security headers, and reject stray Bun lockfiles in the npm workflow.
- Key history links: [Fixed text cutoff & sidebar](https://github.com/classicitbb/optilens-1c39be6c/commit/505681e27f9c0cb1a1f92aa7918dc48047248e3b), [Added read-only FOB col](https://github.com/classicitbb/optilens-1c39be6c/commit/ea6e9e969d03bddbd2dd9efe43bdb368fa41b20a), [Fixed charge/line edit overwrites](https://github.com/classicitbb/optilens-1c39be6c/commit/4893620509a7b512a4749630bc823142d73ea0f1), [Merge DEV updates](https://github.com/classicitbb/optilens-1c39be6c/commit/01c0ef8d5b44e5fc360ae10b452d00feb4322bff).

## 2026-04-13 — LED PRO Public Lens Page + Admin Rendering Safeguards

### Plan
- Publish a dedicated public-facing LED PRO lens page and wire it into the shared public route system.
- Keep discovery surfaces synchronized so navigation, route metadata, knowledge-center content, and site search all resolve the same canonical URL.
- Close two admin runtime issues by normalizing PDF preview zoom initialization and sanitizing stored SLA rich-text before rendering.

### Release Notes
- Added a new public LED PRO lifestyle-lens page at `/lenses/led-pro`.
- LED PRO is now discoverable through public header navigation, the lens design guide, knowledge-center entries, and site search.
- The LED PRO hero now uses a live embedded demo at the watch section so the page does not depend on a locally merged video asset during runtime.
- Admin SLA policy descriptions now render through the shared rich-text sanitizer, and PDF preview opens with an explicit 100% manual zoom baseline.

### Technical Changelog
- Added `src/pages/lenses/LedProPage.tsx` as the canonical public page for LED PRO lens marketing content and media.
- Updated `src/routes/public/PublicRoutes.tsx` and `src/config/routeRegistry.ts` to register `/lenses/led-pro` through the centralized public routing system.
- Updated `src/components/Header.tsx`, `src/pages/LensDesignGuidePage.tsx`, `src/data/knowledgeCenter.ts`, and `src/lib/siteSearchIndex.ts` so shared navigation and discovery surfaces point to the new LED PRO page.
- Updated `src/tests/integration/publicRouteAccessibility.integration.test.ts` to enforce route-registry and runtime-route coverage for `/lenses/led-pro`.
- Updated `src/pages/admin/helpdesk/HelpdeskSlaPoliciesPage.tsx` to sanitize policy-description HTML before `dangerouslySetInnerHTML` rendering.
- Updated `src/components/admin/PdfPreviewShell.tsx` to initialize manual zoom at `1` instead of `null` for a stable preview baseline.

## 2026-04-06 — Companion Assistant (Public AI Floating Assistant)

### Plan
- Add a floating AI companion assistant accessible from all public pages.
- Back the assistant with a dedicated Supabase Edge Function (`companion-assistant`) using Claude as the model.
- Expose a full-screen assistant window page and integrate context sharing across public routes.

### Release Notes
- A floating companion assistant is now available on all public pages, providing AI-powered help for visitors.
- The assistant is model-backed via the new `companion-assistant` Edge Function.
- A dedicated full-screen assistant window is accessible at `/assistant`.
- Public search panel updated with improved assistant integration.

### Technical Changelog
- Added `src/components/assistant/CompanionAssistant.tsx` — floating assistant UI component.
- Added `src/features/assistant/CompanionAssistantContext.tsx` and `CompanionAssistantContext.shared.ts` — context and shared state.
- Added `src/features/assistant/companionAssistantEngine.ts` — assistant orchestration and engine logic.
- Added `src/features/assistant/assistantGeneration.ts` — model generation helpers.
- Added `src/pages/assistant/CompanionAssistantWindowPage.tsx` — full-screen assistant page.
- Added `supabase/functions/companion-assistant/index.ts` — Claude-backed Edge Function.
- Updated `src/routes/public/PublicRoutes.tsx` to register `/assistant` route.
- Updated `src/config/routeRegistry.ts` to include assistant window route.
- Added unit tests: `CompanionAssistant.test.tsx`, `companionAssistantEngine.unit.test.ts`.

## 2026-03-31 — PR Doc Symmetry Guardrail

### Plan
- Add a machine-readable module documentation index that maps code paths to required companion documentation updates.
- Enforce doc symmetry in pull requests by validating changed files against the mapping.
- Add a rationale-required override path for exceptional cases while keeping normal CI behavior blocking by default.

### Release Notes
- Added a new documentation symmetry guard for PR checks to block code-only changes that skip required docs updates.
- Added explicit override support through `docs/bugs/*doc-symmetry-exception*.md` or PR metadata labels with required rationale.
- Wired the doc symmetry check into the PR check pipeline and package scripts so CI can enforce it consistently.

### Technical Changelog
- Added `docs/ai/module-doc-index.json` to define module-to-doc requirements.
- Added `scripts/check_doc_symmetry.mjs` to inspect git diff changes and enforce companion docs.
- Updated `scripts/pr_checks.mjs` and `package.json` scripts to run the doc symmetry guard in PR checks.

## 2026-02-28 — Admin E2E Runtime Hardening (Lead Finder graceful fallback)

### Plan
- Run end-to-end admin checks across key pages and watch for runtime failures.
- Prevent Lead Finder from hard-failing when Edge Function connectivity is unavailable.
- Surface operator-friendly fallback messaging instead of destructive runtime behavior.

### Release Notes
- Lead Finder now degrades gracefully when the `lead-intelligence` Edge Function cannot be reached.
- Users receive a clear in-page warning and non-crashing diagnostics state instead of repeated fatal runtime failure behavior.
- Search action now catches unexpected failures and reports a controlled toast error.

### Technical Changelog
- Updated `src/features/admin/leads/hooks/useLeadFinder.ts` to return a safe fallback payload when function-invoke transport failures occur.
- Updated `src/pages/admin/leads/LeadFinderPage.tsx` to use `mutateAsync` with explicit try/catch and warning-surface handling.
- Retained existing diagnostics panel contract by providing fallback diagnostics values when providers are unreachable.

## 2026-02-28 — Contacts/CRM Location UX Upgrade (Country→State/City constrained dropdowns)

### Plan
- Replace free-text country/state/city fields with guided dropdowns in Contacts edit flow.
- Apply the same constrained location selection model to CRM Manual Opportunity Intake.
- Keep persistence backward compatible with existing contact/opportunity records.

### Release Notes
- Contacts edit dialog now shows Country first, with State and City dropdown options constrained by selected country.
- CRM Manual Opportunity Intake now uses Country, State, and City dropdowns with country-constrained options.
- Existing saved location values continue to display and remain selectable even if legacy/custom text was used previously.

### Technical Changelog
- Added `src/lib/locationOptions.ts` with country/state/city option helpers and backward-compatible option hydration (`ensureOption`).
- Updated `src/pages/admin/erp/ContactsPage.tsx` to swap address free-text fields for constrained `Select` controls and reorder country above state/city.
- Updated `src/pages/admin/crm/CrmPipelinePage.tsx` intake form to use constrained location dropdowns.
- Updated `src/features/admin/crm/hooks/useOpportunities.ts` to persist optional `state` into contact upsert payload during manual intake.

## 2026-02-28 — Product Catalog Regression Fix (Row Scroll + Working Filters)

### Plan
- Restore vertical row scrolling in product catalog segment tables while keeping headers visible.
- Fix the filter popover interaction regression so selections actually apply.
- Re-validate catalog behavior with credentialed UI checks and smoke tests.

### Release Notes
- Product catalog table rows now scroll again inside their table frames.
- Filter popovers now stay interactive after opening, so option selection and apply behavior work as expected.
- "Select All" in filter popovers is now directly clickable to clear narrowed selections quickly.

### Technical Changelog
- Updated `src/components/ui/table.tsx` table wrapper to fill available height (`h-full`) so internal row scrolling works in flex layouts.
- Updated `src/components/admin/MultiSelectFilter.tsx` to track both trigger and portal menu refs for outside-click handling, preventing immediate close on menu interaction.
- Wired the popover "Select All" row to call `selectAll` directly.

## 2026-02-28 — Product Catalog Table UX Fixes (Sticky Headers + Filter Overlay + Tab Counts)

### Plan
- Keep product catalog table headers pinned while row data scrolls underneath.
- Ensure column-filter dialogs render above table content instead of appearing hidden.
- Add filter-tab impact counts so users can see constrained record totals before switching tabs.

### Release Notes
- Product catalog segment tables now keep one sticky header layer, preventing header cells from drifting out of frame while rows scroll.
- Column filter popovers now render in a top-level portal with fixed positioning and stronger z-index stacking, so they appear above rows and sticky headers.
- Lens, Add-ons, and Supplies filter tabs now display live counts (e.g., `Active (42)`) based on the current search and column-filter context.

### Technical Changelog
- Updated `src/components/admin/AddonDataTable.tsx` and `src/components/admin/SupplyDataTable.tsx` to remove redundant per-column sticky classes and add computed tab-count labels.
- Updated `src/components/admin/LensDataTable.tsx` to compute status counts from base-filtered records and show count-bearing tab labels.
- Updated `src/components/admin/MultiSelectFilter.tsx` to use `createPortal` with dynamic fixed positioning for reliable popover layering.

## 2026-02-28 — E2E Stability Pass (Help Panel + Wiki Keying)

### Plan
- Execute credentialed end-to-end navigation across core admin surfaces.
- Fix runtime loops and React key warnings surfaced by browser-console checks.
- Re-run smoke harness to confirm regressions are closed.

### Release Notes
- Fixed an update-loop issue in Help Panel expansion state initialization.
- Fixed duplicate-key warning in wiki section table-of-contents generation for repeated headings.
- Re-validated core admin route smoke checks and credentialed browser flow.

### Technical Changelog
- `src/components/admin/HelpPanel.tsx`: guarded `setExpandedIds` to avoid unnecessary state updates that triggered maximum update-depth warnings.
- `src/components/admin/wikiFormatting.tsx`: added deterministic unique section IDs for duplicate heading labels.
- Added credentialed browser verification artifacts for wiki/admin navigation console-health.

## 2026-02-28 — Admin CRM Homepage + Wiki Markdown Visibility

### Plan
- Route admin homepage to CRM pipeline for users with CRM access.
- Make changelog, release notes, and delivery plan visible in Help/Wiki in markdown form.
- Improve wiki markdown rendering for clearer human-readable headings and code blocks.

### Release Notes
- `/admin` now redirects admins/operators/viewers to `/admin/crm/pipeline`.
- Help/Wiki now includes a dedicated **Release Ledger** section with markdown-backed Release Notes, Changelog, and Delivery Plan articles.
- Wiki content renderer now supports markdown headings (`#`, `##`, `###`) and fenced code blocks.

### Technical Changelog
- Added `src/components/admin/AdminHomeRedirect.tsx` and wired admin index route to it.
- Added raw markdown imports in `src/data/wikiContent.ts` from `CHANGELOG.md`, `docs/release-notes.md`, and `docs/phase2-phase3-delivery.md`.
- Added `docs/release-notes.md` and enhanced `src/components/admin/wikiFormatting.tsx` parsing/rendering logic.

## 2026-02-28 — Smoke Harness Reliability + Credentialed Login Validation

### Plan
- Prevent false-positive smoke passes when Vite reports transform/startup errors.
- Validate credentialed login flow and protected-route redirect behavior.
- Keep release ledger process synchronized between repo changelog and in-app wiki.

### Release Notes
- Smoke harness now fails when dev server emits pre-transform/syntax/startup errors.
- Verified login interaction on `/auth` with provided credentials and submit flow automation.
- Verified protected wiki route `/admin/knowledge/wiki` redirects to auth when not already authenticated in browser session.

### Technical Changelog
- Added dev-server diagnostic pattern capture and failure gating in `scripts/admin_smoke_and_error_checks.mjs`.
- Kept runtime logging format/wiring checks and auth/admin route smoke checks intact.
- Aligned date-stamped update governance across `CHANGELOG.md` and wiki ledger article.

## 2026-02-28 — Automated QA Harness + Runtime Logging Hardening

### Plan
- Strengthen smoke coverage for login/auth and high-traffic admin routes.
- Add stricter assertions for runtime error logging wiring across app/page surfaces.
- Enforce stable one-line runtime-error output contract for downstream automation.

### Release Notes
- Added `/auth` to automated smoke route checks.
- Added Auth page checks to ensure login UX strings remain present.
- Added/kept runtime logging checks for app wiring and one-line error format contract.

### Technical Changelog
- Updated `scripts/admin_smoke_and_error_checks.mjs` with additional route and snippet assertions.
- Preserved runtime log format contract checks for `[runtime-error] <timestamp> | <source> | <title> | <detail> | <route>`.
- Added this date-stamped changelog structure for future major updates.
