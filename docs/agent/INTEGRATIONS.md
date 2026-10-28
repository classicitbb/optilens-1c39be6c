# Integrations and Cross-Repository Contract

## Alert bell and stock/list reads - 2026-10-20

Frontend changes reuse existing notification/attention reads, get_store_product_variants_public and admin user/customer detail contracts. Eight-hour stock polling runs in mounted browsers plus mount/focus/reconnect; it does not import office inventory and is not a server cron. Bell coordination uses Web Locks and origin-local storage, without cross-device messaging. Portal list caches last one minute; existing mutation invalidations remain effective. No migration, hosted write, new service, connector, environment variable, credential or authorization change.


## Portal operations controls — 2026-10-20

WebsitePortalsPage uses shared two-state switches in both the embedded contact settings and fallback portal dialog. Switches write explicit true/false overrides; existing unset rows retain approval/tag inheritance, and existing Rx/order-price opt-ins remain off. Clear conflicting override is retained separately. The assigned-pricelist Edit link uses buildPricelistEditorPath(id, "rx") and is disabled without an assignment.

Migration 20261020214927_new_portal_features_disabled.sql initializes nine false feature rows only after a new profiles INSERT, including auto-notifications. It never backfills existing profiles or overwrites a pre-existing override. The internal trigger uses fixed search_path, fully qualified objects and revoked public execution; existing staff bypass and sensitive pricing/statement tag checks remain. Applying this migration is an authorization/default change and needs explicit approval; commit/push authorization alone is not a database apply. No new service or environment variable.


Doc Studio dashboard/navigation annotations (2026-10-20): frontend-only allowlisted section queries and browser-local user-scoped recent module keys. No document content or identifiers are stored in the recency key. Existing file and invitation handoffs take precedence over section queries. No route, backend, connector, schema, service, credential, access rule or environment-variable change.


Local development Supabase transport (2026-10-20): `/__supabase` forwards only to the configured VITE_SUPABASE_URL through Vite. It accepts same-origin loopback requests, preserves caller bearer/apikey headers, and removes the browser Origin on the server-side hop; hosted JWT, roles, RLS and account scopes remain authoritative. Existing Node roots plus the OS certificate store are used when supported, with TLS verification enabled. No privileged key is added and no production CORS/auth/credential change is required. Shared Supabase HTTP queries, auth/storage/functions and the established Doc Studio bridge reuse it only in development; Realtime remains on its existing direct transport. Static production builds stay direct.


Doc Studio invoice import (2026-10-20, local source): reuses authenticated Supabase reads of statement_lines, statements and customers plus the existing innovations.customer_invoice live-data operation. Statement references only resolve the customer account; invoice amounts/descriptions come from the private connector. Account-scoped gateway authorization stays unchanged. Invoices absent from synced statements require explicit customer selection. Customer name/address are current CRM fields, not a historical invoice address snapshot. VAT/discount breakdown and due/PO details are not exposed by the existing invoice contract; no values are inferred. The original invoice number is preserved as document provenance. No new service, connector, credential, environment variable, auth change, backend deploy or migration.


Stock entry/picker follow-up (2026-10-19): frontend navigation and existing Radix overlay reuse only. Fresh stock links open the shared Rx form in stock mode; saved-quote/product-highlight links retain their existing editor. No API, service, environment variable, schema or auth change. Browser grid addition/removal stayed in local state without saving/submitting.

Stock prototype integration (2026-10-19, local source): runtime uses existing get_stock_order_catalog, get_store_product_variants_public, save_stock_order_draft and release_stock_order_submission. New lens display lookups project only identity fields from get_lenses_safe and read id/name reference tables plus lens_lens_options links. Supply category identifiers resolve through the existing supply_categories reference hook. No schema, grant/RLS, credential, environment or service change. No client amount is sent to save/release. Prices are server-resolved BBD per individual lens; UI pair counts/prices are converted explicitly, with chiral pairs split by eye. Service items are existing published addon rows. Review and local line entry do not persist anything; Save draft and final Submit remain the only stock writes. Stock mode cancels parent Rx autosave. Browser checks did not invoke either write path. The standalone prototype remains a separate seeded design artifact.

Selected prototype styling (2026-10-19): imports the existing admin workspace CSS and installed font assets directly; no copied token palette, new package, service or API. ws-admin/admin-tool opt-in and semantic colour mapping are confined to the standalone entrypoint. Single-layout selection and compact identification are local presentation changes only.

Prototype refinement (2026-10-19): imports are limited to shared React UI and pure lens-catalog logic. The reused store grid receives seeded variants and an in-memory add callback; its hook import is type-only and is erased from the browser bundle. No cart, Supabase client or order mutation path is imported. Standalone Vite resolves the existing source alias and compiles the reused UI styles locally. No new dependency, environment variable or connector.

Stock / supplies prototype (2026-10-19): independent Vite root with `envDir: false`, no public asset directory, no imported app clients, and an in-memory seeded catalog. Its CSP restricts connections to its own local origin and Vite socket; forms never post. Barcode camera capture, save and sync are simulations. No service, connector, schema, credentials, authorization or production-order boundary changed. The customer/admin switch is presentation only and must never substitute for production account authorization.

RX stock/service UX reuses the existing stock-order Supabase catalog/draft/release hooks; no new service, connector, credential, environment variable, schema, or access boundary was introduced. Draft persistence and release continue through the existing server-priced stock-order flow.

Pricelist EUR/XCD display (2026-10-17): existing portal_pricing_currency_settings remains the configured-rate source. The frontend appends only EUR and XCD from the existing Rx indicative-rate constants when absent. No new backend, migration, global FX write, auth change or live-rate feed. User display preferences and retail overrides retain their existing explicit save paths; verification did not save either.

Pricelist selected-lens read (2026-10-17): `portal_assigned_pricelist_matrix` already returns `lens_id`. The portal reads only `lens_id, innovations_alias, is_primary` from existing `lens_alias_map`, restricted to those selected IDs and non-null `confirmed_at`, in bounded paginated batches. Existing grants/RLS remain in force; no new RPC, migration, credentials, authorization or production write. Resolution requires a primary or sole unambiguous confirmed selection, available in the existing safe alias catalog.

Pricelist → Rx form (2026-10-17, local source): reuses the existing `get_rx_catalog_aliases` read and current-account price lookup. Only a canonical lens alias travels in `/profile/rx-order?lens=...`; no client amount, account selection, permission or retail-price override is carried. The existing Rx feature gate, customer account lock, draft save and inquiry paths are retained. No new service, credential, schema, connector or environment variable.

The Codex `Dev Preview` project action starts only the local Vite server on loopback port 5173. It adds no external service, connector, credential, access rule, or deployment behavior.

Atlas standard-page width/padding is frontend-only: 770px maximum and 5px gutters from `sm`, with existing mobile gutters retained. No connector, service, environment variable, schema or access boundary changed.

Customer onboarding email boundary (2026-10-13, released): `admin-user-management` calls `customer-onboarding` for default template pricing assignment only. Inviting a login may send the separately requested Supabase Auth invite email; it no longer sends the managed `welcome-pricelist` message. The scoped `customer-onboarding:smoke` path still tests the email pipeline against its explicit test recipient. The two changed Edge Functions were deployed after the user's approval, and post-deploy `npm run qa:edge-smoke` passed without a customer email. The GitHub Edge Function workflow remains unable to deploy until its `SUPABASE_ACCESS_TOKEN` secret is restored.

## Atlas launcher favorite persistence — 2026-10-07

Uses existing user_launcher_pins with account-owned policies and user-ID query keys. Stored route is the existing /admin/knowledge/wiki?articleId=... redirect, satisfying the existing admin-route constraint. Launcher resolves only readable pages through AtlasSource and registered space capabilities. No migration, new connector, environment variable, access rule or production write is included.


CRM follow-up (2026-10-07, local source): contact Places lookups now use Places API (New) searchText and details endpoints, header credentials and explicit field masks. Business-name similarity is scored separately from location search context; ambiguity thresholds stay intact. Manual research combines Google Places listing details with OpenAI cited web sources when configured, records one attempt per provider, and shows unavailable/failed providers alongside successful results. Google errors count as failed enrichment rather than Nothing new found, including responses from older deployments. Scheduled enrichment remains Google-only. crm-enrich-contacts was deployed through the user-authorized Lovable chat; server logs verify version 94 live. Lovable sandbox edge-smoke passed all 47 functions and 3 probes; the local command failed to connect throughout. The authenticated Specs Optical research request reached Places API (New) but returned three equally named matches and HTTP 502 without contact changes. OPENAI_API_KEY is not configured, so no OpenAI call ran. One earlier UI preparation click reached the old legacy endpoint and was denied. No further lookup, Google configuration or credential changes were made. Frontend publication and successful combined-provider verification remain pending.

## Service inventory

| Service | Purpose | Evidence |
|---|---|---|
| GitHub | Canonical source and review workflow | This repository |
| Lovable | Project editing, generation, preview, and publishing workflow | Connected project and repository history |
| Vercel | Hosted application and server-side routes | Connected project and `vercel.json` |
| Supabase | Database, authentication, storage, and functions | `supabase/**` and generated client |
| Higgsfield | Server-side asynchronous video generation | `examples/higgsfield/index.ts` and `@higgsfield/client` |
| OptiLens Local | Private operational integration boundary | `classicitbb/optilens-local` and integration code |
| Chemistrie manufacturer catalog | Public source for Rx clip types, powers, hardware colors and Sun gradients; confirm account availability before commercial ordering | `https://chemistrie.com/pages/order-flow` and `https://chemistrie.com/wp-content/uploads/2021/10/Chemistrie-Retailer-Brochure.pdf` |

Exact account IDs, URLs not intended for customers, credentials, internal hosts, and private access instructions must not be stored here.

## Operating rules

- Advancing GitHub main can publish the production frontend. `.github/workflows/edge-function-release.yml` additionally redeploys all functions and runs a real email smoke submission when its watched paths change. Review the final tree delta and obtain the applicable production/email approval before a push that triggers those actions.

- App email uses Lovable managed email through `_shared/email/managed-send.ts`; compatibility `smtp.ts` sends log as `raw`. The provider requires nonblank `text`, even for image-only HTML. `LOVABLE_API_KEY` and optional `LOVABLE_SEND_URL` stay server-only. A Lovable source read does not prove active Edge deployment; deployed-code inspection was permission-denied in the September 30 review.

- Telnyx voice assistant Iris calls Edge Function `iris-take-message` (take-message tool) with header `X-Iris-Secret`, checked against server-only `IRIS_WEBHOOK_SECRET`. It creates `phone` helpdesk tickets and emails the company feedback address.
- Verify each connector in the current session with a harmless read.
- Lovable intent does not replace repository tests or `STATUS.md`.
- Review Lovable-generated changes before acceptance.
- The connected Lovable workspace read exposes plan and project metadata but
  did not provide a credit balance. Show Build and Run usage categories
  separately; some workspaces share one wallet, so never add two balances.
- AI billing data sources and request paths are inventoried in
  `docs/ai-spend-monitoring-plan.md`. Anthropic is called directly by
  `portal-copilot`; several site functions use the Lovable AI gateway.
- AI request telemetry uses the existing server-side `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` to insert content-free usage events. Provider
  balances and charges are manual snapshots until approved read-only billing
  feeds exist; no provider billing credential is stored in the dashboard.
- Use preview environments before production.
- Preserve function-specific authentication designs; do not apply blanket auth changes.
- Production deployments, migrations, secrets, domains, and authorization changes require the applicable approval.
- Higgsfield's `HF_CREDENTIALS` is loaded only by the local server-side example
  from ignored `.env.local`; it must not be bundled into the Vite client or
  logged. Each run of `npm run higgsfield:seedance` submits a billable request.

## Hosted ↔ Local boundary

- CRM contact address sync remains office-to-cloud only. Website saves do not update Innovations. The receiver accepts `salesperson`, but the office mapping must be verified and extended before it supplies values. See `docs/crm-contact-editor-follow-up.md` for the required revision-checked writeback contract.
- CRM manual public-web research uses server-only `OPENAI_API_KEY` through `crm-enrich-contacts` (`mode: research`), with optional `CRM_RESEARCH_OPENAI_MODEL` (default `gpt-5.5`). OpenAI Responses `web_search` supplies citation metadata; model prose remains a reviewable suggestion. It shares the daily enrichment attempt cap and never automatically writes contacts. Existing Google Places enrichment remains a separate business-details action. This provider replacement is local source pending deployment and live verification.

- Hosted OptiLens exposes customer-safe cloud behavior.
- OptiLens Local owns private operational and legacy-system access.
- Use authenticated, scoped, audited APIs or durable synchronization.
- Use idempotency, correlation IDs, bounded retries, dead-letter handling, and reconciliation.
- Deploy additive provider compatibility before consumer use.
- Access to one repository or connector does not grant access to another.
- The customer-authorized `innovations.customer_orders` response may carry an order ID solely to let the portal locate the customer's matching shipment; it must remain scoped by the existing account authorization.
- Rx Chemistrie selections currently travel as lab instructions through quote notes into the outbound order's `instructions`. Do not turn them into quote lines, SKUs, or provisional charges before the catalogue and fulfillment contract are approved.

## Gatekeeper ↔ Innovations dispatch boundary

- Gatekeeper outbound delivery and status polling require stored production credentials and explicit, independent administrator enablement. Changing credential environment disables both controls; never relabel a staging credential as production access.
- Status polling owns durable failure count, next-attempt time, degraded-since time, and last-success time. Temporary failures use 15, 30, 60, 120, 240, then 360 minute delays; existing Rx statuses are retained and only the transition into degraded state raises an administrator notification.
- An Rx submission may fall back from Gatekeeper to Innovations only while it is still `claimed` and before the Gatekeeper order POST begins. The service-role RPC preserves the frozen submission payload and records the source, reason, and time.
- Stock orders and failures after the POST starts never use automatic fallback. Requeued means pending; only an authoritative OptiLens Local result with `transport = 'file_drop'` proves delivery.

## Canva design-system import — 2026-10-08

The connected Canva connector supports importing local design files and SVG assets, creating folders, and verifying folder contents. The existing `Classic Visions - Design System (README).html` contains a bundled template; extract its static template before import. Its brand palette is navy #0B1E35, teal #1A8A9C, gold #C89130, linen #F4F2ED, with Plus Jakarta Sans. The separate admin workspace may use JetBrains Mono for codes; do not apply that admin exception to the original brand guide. Original logo treatments live in `public/ds/assets/logo_{navy,teal,linen,gold}.svg`.

The user-authorized Canva import created a dedicated folder containing the HTML guide, a text reference, and four SVG logo variants. Folder read-back confirmed all six items. Canva rich-text extraction returned empty for both imported references, so readability/rendering is unverified. No Brand Kits were returned by the connector, and its available tools cannot create/configure Brand Kit colors or fonts. Importing references and assets does not configure automatic brand styling. No new environment variables, credentials, public publishing, or application deployment.

## Atlas shared-page boundary — 2026-10-08 (production release)

An enabled opaque link exposes only an active published page to any non-anonymous authenticated website account holding it. The atlas_open_shared_page RPC performs actor validation, share/live-state checks, an allowlisted content projection and account/page/version/time audit in one transaction. Administrators alone manage sharing with atlas_set_page_sharing and read atlas_page_accesses. Existing staff-table RLS, admin route guards and customer account ownership remain unchanged. No customer financial/account tables are read. The named Atlas sharing migration is applied; hosted grants and unchanged page policies are verified. Account creation and email-confirmation redirects use the existing website flow; the current provider redirect allowlist remains unverified and must not be changed automatically.

Sidebar preferences use browser storage with user-scoped keys and cross-tab events; they do not sync across devices. Page width uses the nullable full_width column after the prepared migration and is projected to the shared reader. ATLAS_SQL_TEST_MODULE_PATH is an optional local module-resolution name for the isolated PostgreSQL test harness, not a secret or runtime application setting. The verified managed-project connector applied only the approved Atlas migration and migration-history record; no page, share or audit rows were written. ClickUp import is deferred and its current connector access is unverified.


Production release (2026-10-08): Atlas-only commit 7f2b3d0a was built from the previously deployed main commit cab43199 in an isolated release checkout, preserving the original feature branch and its unrelated commits. Vercel preview and production builds reached READY; the custom-domain production alias serves the Atlas release. Only migration 20261008183727_atlas_shared_pages.sql was applied and recorded in migration history. Hosted metadata confirms nullable boolean full_width, RLS on both new tables, fixed-search-path definer functions, authenticated execution only, no anonymous table reads or direct authenticated writes, and unchanged help_articles policies. No Edge Function source/config changed, no all-functions deployment or email smoke was triggered, and no page sharing was enabled. The sharing and access tables remain empty.

## Public request attachments (2026-10-09, local source)

Contact us and Get support accept browse/paste/drop photos, documents and audio (5 files, 10 MB each). Iris transfers unsent composer files into the request and includes sent chat files on submission. `submitPublicInquiry` retains JSON for text-only clients and sends multipart `submission` + `files` otherwise. `contact-inquiry` bounds actual request bytes, validates files independently, then stores them in private ticket-scoped storage after spam/rate checks and ticket creation. Nullable uploader metadata represents a public inquiry; existing participant INSERT and private read policies stay intact. Migration `20261009141913_public_inquiry_attachments.sql` must precede function/frontend release. Partial upload failure returns `attachmentError` while preserving request success. No deployment or live write performed.

## Iris visitor conversations — 2026-10-09 (production release)

Public starter prompts now give contextual frame/coating/policy guidance and a relevant follow-up instead of account counts or weak product matches. Account lookup requires a record-specific intent; sign-in alone does not identify a public visitor as a dispenser. Generated answers are included in subsequent conversation context. The lens guide retains audience and supplies use-specific education, prescription/measurement limits and retailer links without promising an automated prescription match. Search the site uses the existing grounded companion-assistant path; legacy web action types remain compatible but no longer call the retrieval-free, 400-character companion-web-search endpoint. No new service, environment variable, schema or authorization change. User approved publication; main commit 631870c6 reached Vercel READY and the custom-domain production aliases. Live browser confirms contextual starters, guide, site-search scope and a generated frame conversation with a simplified follow-up. Generated replies can still add unrequested product suggestions and citation-number mismatches; the server endpoint was not changed.

## Portal support sends — 2026-10-09 (local source)

CustomerOrdersPanel life-buoy questions use the signed-in staff owner and the selected contact as partner_contact_id; notification now defaults on. Person/company audience rules remain unchanged. Ticket creation writes helpdesk_tickets directly, followed by a timeline event; helpdesk-email handles optional staff-to-contact notifications. A failed event or notification must not turn a persisted ticket into a failed submission or encourage duplicate creation. Notification errors and skipped recipients now warn visibly. Iris retains failed request drafts, exposes submissionError inline and guards concurrent form sends. Both forms use mobile input text and 44px send controls; the admin dialog bounds height with dynamic viewport units and scrolls.

Hosted read-only inspection confirms ticket/event grants and RLS allow existing staff and eligible self-owned portal creation. No schema, authorization, Edge Function or environment-variable change. The exact original production failure remains unconfirmed without a named approved send; frontend release and actual email delivery still require approval.

Order transmission and supplementary invoices (2026-10-28): unpriced published stock items carry price_pending and lab hold notes; account-only prices, Gatekeeper default and server-driven auto-transmit for new submissions, admin switch with manual mode, and staff-issued itemised BBD invoices payable separately from the customer cart. Website shipping transitions are blocked for unpaid extras/unquoted submissions. Test fixtures and historical drafts are not auto-sent. Existing payment settlement and access controls remain authoritative. See docs/order-transmission-and-extra-invoices.md for operational limits and verification.
