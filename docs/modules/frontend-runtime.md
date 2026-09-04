# Frontend Runtime Module Docs

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
- Statement rendering remains the existing `StatementPrintDocument` preview path; durable document generation and OneDrive upload are server-side worker responsibilities.

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
