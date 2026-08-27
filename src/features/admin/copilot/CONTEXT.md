# CV Portal Copilot — Context

## What this is

The admin-only operating layer for whitelisted portal and CRM workflows. It
supports the ERP portal rollout and an evidence-backed qualified CRM scan while
extending existing account, activity and opportunity paths rather than creating
parallel systems.

## Hard rules

- `/admin/copilot` is additionally wrapped in `AdminOnlyRoute`; customers,
  prospects, operators and viewers cannot use it.
- Voice transcripts return directly to the composer when transcription succeeds; sending the command remains an explicit user action.
- Customer-facing and financial effects are always Level 4 and require an
  explicit action approval.
- CRM scans may prepare Level 2 task proposals, but may not create live tasks or
  opportunities until an administrator approves the individual action.
- Evidence and inference must be labelled separately. Missing data stays
  unknown; no planner may invent a cause, price, recipient or public-web fact.
- The model never runs SQL. The `portal-copilot` Edge Function owns typed,
  whitelisted operations and durable audit state.
- Never undo a completed prior step after a later partial failure.
- Enrichment may fill a BLANK contact field silently, with source URL,
  retrieval date and confidence recorded. It may never overwrite an
  existing value without an approved action. `country` is always an
  approval because its `Barbados` default is indistinguishable from a
  deliberate entry.
- `apply_contact_enrichment` is the only write path for enrichment, and
  the only caller allowed past the Innovations preserve trigger.
- The Copilot's grounding context is generated, never hand-edited. Run
  `npm run copilot:facts` after changing admin routes or the resource
  registry; `qa:pr-checks` fails on a stale artifact.
- `pageContext` arrives from the client and is resolved through the
  generated route table before it reaches the prompt. Never interpolate the
  raw slug.

## Key files

- `src/pages/admin/PortalCopilotPage.tsx` — full-page command and approvals UI.
- `src/features/admin/copilot/api.ts` — typed Edge Function client.
- `src/features/admin/copilot/usePushToTalk.ts` — browser push-to-talk input.
- `src/features/admin/copilot/VoiceSettingsMenu.tsx` — microphone picker shared by both surfaces.
- `src/features/admin/copilot/voicePreferences.ts` — per-browser device and hold-to-record memory.
- `supabase/functions/portal-copilot/index.ts` — server orchestration.
- `supabase/functions/_shared/copilot/platformFacts.generated.ts` — generated grounding context, route table and capability index.
- `supabase/functions/_shared/copilot/platformFacts.source.ts` — the hand-maintained half (terminology, hosting and service facts).
- `supabase/functions/_shared/copilot/platformTools.ts` — `get_platform_facts`, the on-demand capability detail.
- `scripts/generate_copilot_platform_facts.mjs` — the generator behind `npm run copilot:facts`.
- `supabase/functions/_shared/copilot/enrichmentTools.ts` — enrich_contact, list_enrichment_findings, queue_enrichment_approvals.
- `supabase/functions/_shared/enrichment/contactEnrichment.ts` — the shared field policy.
- `supabase/functions/crm-enrich-contacts/index.ts` — scheduled and manual batch driver.
- `supabase/migrations/20260827140000_crm_contact_enrichment.sql` — provenance tables and write RPCs.
- `supabase/functions/_shared/copilot/portalRollout.ts` — deterministic plan builder.
- `supabase/functions/_shared/copilot/crmOpportunityScan.ts` — deterministic CRM signal planner.
- `supabase/migrations/20260813130000_portal_copilot_mvp.sql` — run/action/audit data.
- `supabase/migrations/20260814160000_portal_copilot_crm_opportunity_scan.sql` — CRM workflow registration.
- `docs/portal-copilot-connected-capabilities.md` — verified CRM, pricing and enrichment seams.
