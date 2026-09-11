# Project Status

> Agents: read this file first. It tells you what is actively being worked on,
> what is broken, and what must not be touched. Update the "Last updated" line
> whenever you change this file.

Last updated: 2026-09-11

---

## Active work

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
  Gatekeeper route, status polling, and cron remain disabled. Frontend publish
  and production PIN reconnection remain pending; the local Edge smoke run was
  blocked before HTTP by the workstation certificate-revocation chain.

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

- Wiki article renderer — shared renderer in place; preview and published views both use it
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
