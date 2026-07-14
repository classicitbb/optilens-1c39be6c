# CRM Build Plan — Market Capture Engine

**Date:** 2026-07-13 · **Status:** Phase 1 in progress
**Goal:** Outbound CRM for capturing the Caribbean optical market. AI does the clerical work (scheduling, drafting, packaging, chasing); the user initiates, supervises, and acts.

## Locked decisions

1. **Stage lives on the contact** (no separate deal object for capture). `contacts.pipeline` = market motion; `contacts.stage` = journey position.
2. **Pipelines:** `opticals` (live now), `department_stores`, `labs` (future). Stored in `crm_pipelines` lookup so new markets need no migration.
3. **Stages (shared vocabulary across pipelines):** `target → outreach → engaged → qualifying → presenting → trial_offer → trial_active → converting → customer`, plus parallel `nurture` lane (not-now contacts, warm long-game cadence).
4. **Field consolidation:** old `contacts.pipeline_stage` ("New"/"Prospect"/…) and `contacts.status` ("lead"/"contacted"/…) are retired once UI reads the new fields. `is_customer` stays = operational/billing flag (pricelist assignment), distinct from stage.
5. **Plain contacts** (suppliers, freight, personal): `pipeline IS NULL` — never on boards, never in cadences. Supplier/partner labels via existing tags.
6. **Retention rhythm (daily-order wholesale):** week-2 quiet = dashboard flag; week-3 = high-priority personal check-in task (call, never an automated email). Per-account baselines in v1: flag when quiet-days ≥ max(avg_gap_days × 3, 5), hard ceiling 21 days. Confirmed defectors → nurture.
7. **Channels v1:** email (AI draft → outbox → approve → send), WhatsApp (AI-prepared, one-tap wa.me send), call + visit (scheduled tasks with AI briefs). No Instagram DM.
8. **One cockpit:** all customer-facing "what next" lives in this cloud admin. optilens-local = Innovations bridge + internal-only tools. SQL Server = bridge storage only, never a second cloud backend.
9. **Tool migrations from optilens-local → cloud:** Document Creation System (first — cadence dependency), statement template (shared with portal statement print), supplier cost grid (into /admin/pricing), social tools (last).

## Phases & ownership

| Phase | What | Owner |
|---|---|---|
| 1 | Schema: pipeline/stage on contacts, crm_pipelines, cadences, cadence_steps, cadence_enrollments, outreach_outbox, order_activity, customer_order_health view, backfill | **Claude** (this repo) |
| 2 | Pipeline board (kanban by stage, tab per pipeline), contact classification UI, Today queue on CRM dashboard | **Claude** |
| 3 | Cadence engine: enrollment, step scheduler, AI draft edge function, outbox review UI | **Claude** |
| 4 | Document Creation System port (templates: email, letter, invoice/quote/proforma/receipt, statement) | **Codex** — Spec B/C below |
| 5 | order_activity push: local extraction (Codex, Spec A) + innovations-sync edge function entity handler (Claude) | **split** |
| 6 | Retention alarm engine wired into Today queue | **Claude** |

Fastest usable prototype = Phases 1+2 (manual CRM works before automation lands).

## Codex handoff specs

### Spec A — order_activity push (optilens-local repo)
Extend the existing Innovations→cloud push (same mechanism as statements/balances entities) with an `order_activity` entity. For every active LMS customer compute from Innovations order data:

```json
{
  "innovations_customer_id": 12345,
  "last_order_date": "2026-07-11",
  "orders_last_7_days": 9,
  "orders_last_30_days": 41,
  "orders_last_90_days": 122,
  "avg_gap_days": 1.4
}
```

- `avg_gap_days` = mean gap in days between consecutive order dates over the trailing 90 days (null if <3 orders).
- Push at least daily (hourly preferred). Upsert on `innovations_customer_id`.
- Cloud table `public.order_activity` exists after Phase 1; contact linking happens cloud-side via `contacts.innovations_contact_id` / `linked_customer_id`.
- Claude adds the receiving entity handler to the `innovations-sync` edge function (Phase 5) — coordinate on the entity name `order_activity`.

### Spec B — Document Creation System port (into this repo)
Port templates from optilens-local's document system into the cloud admin:
- Target: new `/admin/website/documents` section (or `/admin/settings/documents` — decide with user), CRUD backed by a `document_templates` table (Claude will provide migration when Phase 4 starts).
- Template kinds: `email`, `letter`, `invoice`, `quotation`, `proforma`, `receipt`, `statement`.
- Rendering: browser-side HTML/print (match the existing print/PDF utilities in `src/features/admin/print/`). Use the "Meridian Precision" styling system already in the cloud repo.
- Email templates must expose merge fields (contact name, business, salesperson, etc.) — these feed the cadence engine's AI drafting.

### Spec C — Statement template
The CV-branded statement template becomes ONE shared artifact: used by the portal statement print (`/profile` statements view) and by any emailed/printed statement from admin. Port it as a `statement` kind inside Spec B's system, not as a separate tool.

## Notes
- Old fields `contacts.pipeline_stage` and `contacts.status` must NOT be dropped until Phase 2 UI ships (ERP ContactsPage, Leads pages, portal signup flows still write them).
- Public-facing website is live; everything else is dev/testing — backend changes are low-risk but migrations should stay additive until Phase 2.
