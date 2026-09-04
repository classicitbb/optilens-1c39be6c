# Frontend Bug Reports

Track frontend regressions and customer-facing issues.

## 2026-09-04 — Walk-in payment lacked customer email capture and print prompt
- Area: staff walk-in card payments at `/admin/settings/walk-in-payments` and receipt email delivery.
- Impact: staff could not record customer email for walk-in payments; receipt emails were only sent to the staff creator's profile, and staff were not prompted to print a receipt upon completion.
- Resolution: added `customer_email` column to `walk_in_payments`, updated `create_walk_in_payment` and `WalkInPaymentsPage` to capture and validate email, updated `sendWalkInPaymentReceipt` to deliver receipts to customer email, and added a print prompt dialog upon payment settlement.
- Regression prevention: `staffWalkInPayments.integration.test.ts` asserts customer email capture in migration, UI form, receipt display, email delivery, and print prompt modal.

## 2026-09-04 — Statement amount wrapping and missing safe payment confirmation
- Area: customer statement table, Scotia return flow, and Settings administration.
- Impact: BBD statement amounts could wrap onto two lines, and staff had no concise way to confirm a card-payment outcome without accessing gateway diagnostics.
- Resolution: keep Amount cells non-wrapping; add an admin-only, display-safe activity projection and page; request card saving before the provider-hosted checkout rather than after card entry.
- Regression prevention: the activity page is limited to the safe projection fields, while the settlement function remains idempotent and saves a token only after a signed approved callback.

## 2026-08-27 — Enrichment writes were silently reverted, and Enrich All did nothing
- Area: CRM contacts, the Innovations preserve trigger, and the Leads bulk-action bar.
- Impact: `Enrich All` had no click handler at all. Worse, any enrichment that corrected an existing value on an Innovations-linked contact would have reported success and changed nothing.
- Root cause: `preserve_populated_crm_fields_on_innovations_sync` reverts every service-role write over a non-blank admin-entered value, and it checks only `auth.role()`, so it could not tell an approved correction from an Innovations overwrite. Separately, `get_lead_provider_credentials` is gated on `has_role(auth.uid(),'admin')` and returns `{}` under the service role, which would have made every scheduled run a silent no-op.
- Resolution: give the trigger a transaction-local opt-in that only `apply_contact_enrichment` sets, read the provider credential table directly in both service-role callers, and wire the button.
- Regression prevention: `crmContactEnrichment.integration.test.ts` asserts the opt-in, the unchanged Innovations protection, both service-role guards, and that neither caller uses the admin-gated RPC.

## 2026-08-27 — Floating Copilot had no microphone choice and no memory of one
- Area: admin floating Portal Copilot composer and the shared push-to-talk hook.
- Impact: an admin with more than one input device could not choose which microphone the floating Copilot used, and any choice made in the full console was lost on the next mount.
- Root cause: `usePushToTalk` already enumerated devices and accepted a `deviceId`, but only `PortalCopilotPage` rendered a picker, and the setting lived in component state with no persistence.
- Resolution: share the picker through `VoiceSettingsMenu`, render it in the floating widget, and persist `deviceId` through `voicePreferences`.
- Regression prevention: `voiceEntrySurfaces.test.ts` asserts both surfaces import the shared menu and that the stored device is read and written by the hook.

## 2026-08-27 — Copilot could not describe the platform it runs in
- Area: Portal Copilot grounding context.
- Impact: the Copilot could not say which pages exist, which data it could change, or where the app is hosted, so it answered capability questions with generic manual instructions. The "Watching ..." label was cosmetic — the page was never sent to the server.
- Root cause: grounding was a hand-maintained module list in `systemContext.ts` with no capability or infrastructure detail, and `submitCopilotCommand` never forwarded the route.
- Resolution: generate the grounding context and a capability index from `apps.ts` and `adminResources.ts`, serve deeper detail through `get_platform_facts`, and forward a whitelisted page slug on every command.
- Regression prevention: `npm run qa:copilot-facts` fails a stale generated file inside `qa:pr-checks`, and an integration test asserts every slug `adminContexts` can emit exists in the generated route table.

## 2026-08-22 — Sitewide validation drift after portal refactors
- Area: anonymous storefront, Portal Copilot, and embedded Rx order verification.
- Impact: both Node validation jobs failed even though lint, typecheck, and production build succeeded, preventing sitewide releases.
- Root cause: one storefront test omitted the Query provider now required by `useUserRole`, while Copilot and Rx assertions still targeted pre-refactor component ownership, button copy, patient-name casing, and a removed duplicate settings control.
- Resolution: mount the real query runtime in the storefront test and update the Copilot/Rx contracts to verify the current accessible UI and component boundaries.
- Regression prevention: retain the focused five-file validation loop and the full `npm run test` gate on both supported Node versions.

## 2026-08-22 — Portal Copilot ticket creation and recording lifecycle
- Area: admin Portal Copilot, shared admin-resource tools, and voice transcription.
- Impact: Copilot could not create a Helpdesk ticket because `ticket_number` was absent and a named priority was sent to an integer column; browser speech recognition could also end immediately and hide the Stop action while the recorder remained open, and silent audio could echo the domain vocabulary hint into the composer.
- Root cause: the generic Helpdesk resource registry drifted from the actual table contract (`owner_user_id`, required `ticket_number`, integer priority), the optional Web Speech service incorrectly controlled the recording UI lifecycle, and prompt-echo responses were not filtered.
- Resolution: generate UUID-derived ticket numbers and AI-source metadata inside the shared dispatcher, normalize priority labels to 0-5, and make `MediaRecorder` run exclusively from explicit Start/Stop actions before server transcription.
- Regression prevention: retain the red-capable dispatcher and recorder lifecycle tests, plus external Chrome/Edge permission and deployed-function verification.

## 2026-08-22 — Portal persistence, previews, and assistant usability
- Area: customer portal profile, handbook, orders, drafts, Rx ordering, navigation and support assistant.
- Impact: organization edits could be overwritten, handbook PDF imports failed after bundling, draft/order contents were hard to inspect, price currency/authorization copy was ambiguous, and support entry was cramped and fragmented.
- Root cause: auth metadata was treated as profile authority, PDF.js was nested behind unresolved dynamic imports, several persisted records exposed only summary rows, and assistant forms/history shared message-list presentation instead of dedicated modes.
- Resolution: made profile-table edits durable, statically bundled/retried PDF.js, added draft/order detail interactions and explicit currency labels, passed server-derived price authorization into Rx rendering, and consolidated support/history into a movable full-height assistant.
- Regression prevention: retain focused profile/Rx tests, production bundle inspection, header checks, authenticated portal browser checks, and an external Chrome/Edge microphone-permission test.
- Follow-up: moved checkout-saved payment methods into My Profile, removed customer-side card creation and internal CRM badges, reduced the navigation divider control, and made request details fill the assistant form.
- Follow-up: moved saved addresses into My Profile, added Enter-to-apply for inline profile edits, and kept the multiline assistant composer rectangular with its controls anchored along the bottom.

## 2026-08-13 — Edge reported denied speech permission after microphone approval
- Area: Admin Portal Copilot push-to-talk
- Impact: approving microphone access could still immediately show **Microphone or speech permission was denied** and produce no transcript.
- Root cause: the hook awaited `getUserMedia` and device/meter setup before calling `SpeechRecognition.start()`, detaching Web Speech startup from the initiating user press.
- Resolution: configure and start recognition synchronously inside the press, then initialize the selected-device meter asynchronously.
- Regression prevention: retain the hook test that makes recognition emit `not-allowed` whenever startup loses the initiating gesture, plus external Edge activation verification.

## 2026-08-13 — Portal rollout lacked governed bulk operations
- Area: Admin portal-access operations
- Impact: staff had to identify ERP customers and provision invitations one at a time, with no consistent approval queue, ambiguity handling, or consolidated audit history.
- Root cause: existing portal-provisioning and email functions were transactional endpoints rather than a governed workflow spanning live selection, review, execution, and recovery.
- Resolution: added an admin-only Copilot workflow that deterministically prepares actions, requires approval for invitations, reuses existing provisioning/email boundaries, and records every transition.
- Regression prevention: retain admin authorization, deterministic recipient selection, idempotency keys, transcript confirmation, explicit level-4 approval, and partial-failure retry coverage.

## 2026-08-12 — Inconsistent outbound-order transport and preview behavior
- Area: Rx and Stock Order forms
- Impact: stock and Rx orders could diverge in rendered order text or transport routing, making the release result difficult to verify.
- Resolution: both forms now use the shared Hashref writer and select Innovations or Gatekeeper explicitly at release time; the preview is rendered by that same writer.

## 2026-08-11 — Stock order form discovery and draft recovery
- Area: Admin Website stock ordering and navigation
- Impact: the stock form was not a distinct header-launcher tile, newly registered routes were not consistently discoverable in global search, and staged stock orders had no drafts-page entry.
- Root cause: launcher deduplication collapsed the Website child route into the Website app, while global search depended on sidebar items and the stock outbox had no list/reopen surface.
- Resolution: added a permission-aware Stock Order Form shortcut, route-registry search fallback, lab-only account scope, explicit form title/action copy, and draft list/reopen links on Quotations.
- Regression prevention: keep concrete admin routes registered in `APP_ROUTE_REGISTRY`, preserve the `stock-order` navigation shortcut, and retain the stock route accessibility test plus the lab-tag migration guard.

## 2026-08-06 — Missing header launcher shortcuts
- Area: Admin header app launcher
- Impact: staff had to navigate through CRM or Website sidebars to reach Activities or the Rx Order Form.
- Resolution: added direct, permission-aware launcher tiles that open the existing canonical admin pages.
- Regression prevention: keep both shortcuts registry-driven and covered by the admin Rx route-accessibility integration test.

## 2026-08-06
- Area: customer portal Quote Requests and Helpdesk
- Impact: submitting a quote created only an editable quotation row, so the request was absent from the Helpdesk queue and follow-up replies had no shared conversation.
- Root cause: `QuoteFormSection` inserted directly into `quotes` without a transactional Helpdesk handoff or canonical record link.
- Resolution: atomically create and link the quote, ticket, and creation event; render the immutable request with ticket status and route all replies through the existing Helpdesk detail screen.
- Regression prevention: keep STOCK requests customer-immutable, preserve RX draft editing, and never split quote and ticket creation across browser writes.

## 2026-08-04 — Multi-account portal access
- Area: customer portal identity, live account data, and Deploy access
- Impact: one login could point to only one `profiles.crm_customer_id`; linking another customer replaced the first and the browser could not select a deliberate account context.
- Root cause: person identity, default account selection, and authorization were represented by the same profile column.
- Resolution: introduced active user/customer memberships, membership-scoped feature overrides, a visible account selector, and server-side membership enforcement for live-data requests. The profile customer remains a compatibility/default pointer only.
- Follow-up: keep carts, drafts, payments, orders, and future portal data explicitly customer-scoped. Never treat the browser's stored selection as authorization.

## 2026-08-04
- Area: customer portal assigned pricelists and Admin → Contacts tags
- Impact: selecting **Is Lab** on a valid CRM company could leave Stock Lenses and Lab Supplies hidden, and an already-open portal could preserve the denied result for five minutes.
- Root cause: authorization omitted the `contacts.linked_customer_id` customer relationship used by the CRM editor, while the client treated the false decision as fresh. The tag mutation also ignored an error while deleting prior links.
- Resolution: include the resolved CRM-company relationship, recheck access on portal return/focus, and surface failed tag-link replacement.
- Follow-up: deploy `20260804171342_fix_portal_lab_tag_resolution.sql` before validating production behavior.

## 2026-07-30
- Area: customer portal Helpdesk, operator Helpdesk, and assistant handoff
- Impact: ticket messages required a manual page refresh, so customers and operators could miss a new reply even while both were using the website.
- Root cause: the two screens performed one-time HTTP reads and client-side direct writes; no private live message signal existed to invalidate the affected ticket or office queue.
- Resolution: added database-authorized private Realtime broadcasts, an idempotent authenticated send RPC, targeted cache refreshes, operator notification, and exact-ticket navigation after assistant human-help confirmation.
- Follow-up: keep event payloads identifier-only and enforce access in `realtime.messages` policies. Do not add polling or a public/shared Helpdesk channel.
- Regression: the first RPC version exposed `ticket_id` as a return field and used the name unqualified in its write/duplicate path, producing Postgres error `42702`. The correction uses unambiguous table references; the reply component catches a rejected mutation after its toast is shown.
- Regression prevention: two-way messages must not share the same alignment. The outer message row owns left/right placement and must be full width. Automatic acknowledgements use `is_automated`, preventing reply loops and repeat notices after a human reply.

## 2026-07-24
- Area: Admin → Settings → Integrations / DHL Express
- Impact: there was no secure place to configure DHL Express credentials for tracking and landed-cost work; adding credentials to a browser client would expose the Basic Auth pair and storing DHL estimate responses would violate its service terms.
- Resolution: added an admin-only configuration card, encrypted credential storage, and a JWT-protected server endpoint limited to on-demand configuration testing, shipment tracking, and landed-cost requests. Estimate data is returned only for the immediate request and is not persisted.
- Follow-up: do not connect arbitrary customer tracking numbers to the DHL endpoint. First establish a server-side, customer-scoped shipment ownership mapping.

## 2026-07-24
- Area: Admin application navigation
- Impact: proposals, quotations, and web orders were split across a standalone Sales app even though their ownership belongs to CRM and Website.
- Resolution: removed Sales from the launcher and route shell; proposals now open under CRM, while quotations and website orders open under Website. Internal editor, print-preview, notification, permission, and help links now use the new canonical destinations.
- Follow-up: keep new links in CRM or Website only; do not restore `/admin/sales/**` or `/admin/orders` routes.

## 2026-07-22
- Area: staff networking and public contact sharing
- Impact: staff had no safe, event-ready way to share a digital business card, QR code, or one-click contact details; exposing the existing portal profile would also risk leaking private account/CRM fields.
- Resolution: added a separate opt-in public-card model and `/connect/:slug` surface, with publish control, email/WhatsApp actions, vCard download, profile-home QR sharing, and admin User-row preview/editor actions.
- Follow-up: keep public fields in `staff_public_cards` only. Do not add private portal fields or CRM identifiers to its public renderer or anonymous select policy.

## 2026-07-19
- Area: Admin → Contacts → Deploy access
- Impact: customer and staff access could require switching between Contacts, Users, and Website Portals, making it easy to miss an email, select the wrong account, or auto-link an existing sign-in without an explicit decision.
- Resolution: added a single Contacts-first deployment assistant with explicit account/login/role choices, verification and statement-tag guidance, contact-only no-match intake, safe training scenarios, and a context-preserving operations follow-up template.
- Follow-up: preserve the explicit-link confirmation whenever access provisioning changes; new exception patterns should become training prompts or Wiki guidance rather than extra manual navigation.

## 2026-07-18
- Area: Admin → Settings → Integrations
- Impact: gateway errors could remain visible after a configuration was repaired because the test operation did not persist its outcome; Innovations duplicate warnings had no manual refresh path.
- Resolution: gateway tests now record their success/failure state and time through an admin-only RPC, and the Innovations card provides a non-destructive on-demand recheck. Duplicate warnings clear only when the backing duplicate view is empty.

## 2026-07-16
- Area: customer portal Statements navigation and My Orders live panels
- Impact: an approved customer could still see Statements locked because the sidebar required a staff role, and local public-site testing on port 8081 showed generic Edge Function failures in both live order-status panels.
- Root cause: the sidebar bypassed the shared `statements` feature decision, while the shared Edge Function CORS policy did not recognize the local port-8081 origin. The browser therefore hid the CORS rejection as a transport failure.
- Resolution: Statements now follows `canAccessFeature("statements")`, and the shared CORS policy permits `localhost` and `127.0.0.1` on port 8081. Regression tests cover both access state and the CORS allowlist.

## 2026-07-14
- Area: Website Portals customer editing
- Impact: selecting a customer navigated admins away from Website Portals into a separate Contacts page, while the portal dialog duplicated profile/account edits and could display an empty email when the optional admin user-list request was unavailable.
- Resolution: Website Portals now opens the shared Contacts editor in place and reads the signup-synchronized profile email. The Website parent route now opens the Portals workspace first.
- Follow-up: keep customer identity, Innovations linkage, and optional portal access in the shared Customer Contact edit surface; do not add a competing editable portal profile.

## 2026-07-14
- Area: Website Portals row actions and shared customer editing
- Impact: portal settings were not visible after the contact editor became the in-place surface, and admins had no concise way to choose contact editing, portal editing, emulation, or account creation from a customer row.
- Resolution: moved portal operations, orders, addresses, payments, and support into the shared Contact modal's Portal Settings tab. Normal clicks select that tab; a right-click menu exposes the four account-specific actions.

## 2026-07-13
- Area: public lens navigation and mobile menu
- Impact: specialty lens information had no single discoverable public page, the branded-lens column used an outdated heading, and the mobile menu left a dark partial-screen scrim rather than matching the site's frosted mega-menu presentation.
- Resolution: added the accessible `/lenses/specialty` accordion page with typed content for Endless Pilot Progressive and OmniLux NAL, linked it under Lifestyle Lenses, renamed the heading to House Brands, and made the mobile sheet full-screen with the shared translucent blurred surface.
- Follow-up: if the pricing request or LabLink flow gains a lens-preselection API, consume the existing `selectedLens` URL value at the destination before removing the documented integration boundary.

## 2026-07-13
- Area: EFT statement payment routing
- Impact: the bank-payment directory was manual-only, so a newly configured Innovations EFT institution could leave a customer without a matching payment destination; forcing every source record to a URL also risked redirecting legacy placeholder values to an unrelated bank.
- Resolution: OptiLens Local now synchronizes `dbo.EFTInstitutions` by immutable ID while preserving the exact source display name. Verified retail sign-in URLs are seeded, source-managed names cannot be edited, and rows with no verified customer sign-in endpoint retain the existing support fallback.
- Follow-up: confirm a new source institution's customer login page before adding its URL; do not use a generic bank homepage as a payment redirect.

## 2026-07-13
- Area: admin settings email operations
- Impact: administrators previously had no single, safe interface to identify or inspect the authentication and transactional email templates configured by the application.
- Resolution: added `/admin/settings/email-previews` with a route-tested split list/preview workspace, source-path visibility, and sample-only personalization controls. No email is sent or altered from the review screen.
- Follow-up: keep this catalog synchronized when an auth template or the transactional template registry gains a new entry.

## 2026-07-13
- Area: public storefront product catalog
- Impact: a storefront data-source regression could query cost-bearing product tables directly, or a product-card change could render cost-shaped values to anonymous visitors.
- Root cause: public catalog access had drifted between views and direct base-table policies without an end-to-end DOM regression guard.
- Resolution: route storefront reads through safe RPCs and cover the anonymous page with a product payload containing sentinel cost values that must not render.
- Follow-up: retain the safe RPC boundary and update `anonStorefrontCostSafety.e2e.test.tsx` when product-card rendering changes.

## 2026-07-11 — Closed issues

### Account profile hid the ERP account number and required navigation to sign out
- Surface: customer My Account
- Symptom: customers could not confirm their linked ERP account from the profile form, and Sign out was only available through the account menu.
- Resolution: My Account now displays the source-managed account number (or `ACC#` until linked) and provides a Sign out button next to Save Changes.

### Portal order-status list did not match the lab WIP report
- Surface: customer My Orders
- Symptom: the portal returned broad historical order rows and exposed extra internal columns instead of the active WIP and valid same-day shipments in the lab report.
- Resolution: the local MSSQL connector now uses the report's active-job and valid-terminating-shipment filters for the identity-mapped customer, and sends only Rx number, patient, received date, and status to the portal.

### Sign-in form was visually dated and had no password visibility control
- Surface: `/auth?mode=signin`
- Symptom: the compact form made the sign-in flow feel disconnected from the current portal UI and required blind password entry.
- Resolution: rebuilt the sign-in presentation with a focused card, larger form controls, inline reset-password access, and a keyboard-accessible show/hide password button.

### Synthetic current-period statement presented as a posted statement
- Surface: customer Statements & Billing
- Symptom: the newest entry was calculated from balance data and had no source statement ID or line items.
- Resolution: portal selection now contains only posted Innovations statements; live balance remains separate.

### Shipment tracking used where live order status was required
- Surface: customer My Orders
- Symptom: the live panel showed shipment sessions rather than the current LMS order status.
- Resolution: added a separate MSSQL-backed Innovations Order Status table without removing shipment tracking.

### Older open shipment omitted from customer delivery status
- Surface: customer My Orders
- Symptom: the delivery panel applied a 90-day cutoff, hiding still-open shipment 10419 and preventing customers from expanding a shipment to inspect its work.
- Resolution: the live request now asks for all open shipments plus closed deliveries from the last 30 days; shipment rows expand to show supplied order/item details and a tracking link.

## 2026-06-24 — Closed issues

### Product cost columns readable through direct table SELECT
- Surface: Supabase RLS for `addons`, `lenses`, and `supplies`
- Symptom: authenticated viewer/customer roles could read base product tables that include cost-bearing fields.
- Resolution: replaced broad role SELECT policies with editor-role SELECT policies and preserved cost-free public views for customer-safe browsing.

### Public analytics tables accepted unrestricted insert payloads
- Surface: website analytics runtime tables
- Symptom: public INSERT policies accepted arbitrary rows with `WITH CHECK (true)`.
- Resolution: tightened INSERT policies with visitor ID, token, path, metric, rating, device, and value checks while leaving normal public analytics ingestion enabled.

### API v1 lint blocked by merge-conflict marker
- Surface: `supabase/functions/api-v1/index.ts`
- Symptom: lint failed on a leftover conflict marker in list ordering fallback logic.
- Resolution: resolved the conflict to a single fallback path that retries `id` ordering only when the caller did not provide an explicit order.

## 2026-04-13 — Closed issues

### SLA policy description HTML rendering risk
- Surface: `/admin/helpdesk/sla-policies`
- Symptom: saved rich-text descriptions were rendered directly into the table cell via `dangerouslySetInnerHTML`.
- Resolution: route description HTML through `sanitizeRichTextHtml` before render so published policy copy still displays but unsafe markup is filtered.

### PDF preview initial zoom ambiguity
- Surface: admin PDF preview shell
- Symptom: `manualZoom` started as `null`, leaving the first-load zoom state implicit.
- Resolution: initialize `manualZoom` to `1` so preview behavior starts from an explicit 100% baseline and downstream zoom logic reads a concrete value.

### Public LED PRO route coverage gap
- Surface: public lens pages
- Symptom: new lifestyle-lens content needed canonical routing, navigation discoverability, and route-accessibility coverage to avoid orphaned content.
- Resolution: added `/lenses/led-pro` route registration, shared discovery references, and integration assertions for the public route registry plus runtime route declaration.

### LED PRO page merge-conflict regression
- Surface: `/lenses/led-pro`
- Symptom: an interrupted merge left conflict markers in `src/pages/lenses/LedProPage.tsx`, which broke both lint and production build.
- Resolution: resolved the page to a single embedded-demo implementation and restored the page to valid TSX so validation can complete.
