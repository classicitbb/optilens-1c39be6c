# Integrations and Cross-Repository Contract

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
