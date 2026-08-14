# CV Portal Copilot — Context

## What this is

The admin-only operating layer for whitelisted portal and CRM workflows. It
supports the ERP portal rollout and an evidence-backed qualified CRM scan while
extending existing account, activity and opportunity paths rather than creating
parallel systems.

## Hard rules

- `/admin/copilot` is additionally wrapped in `AdminOnlyRoute`; customers,
  prospects, operators and viewers cannot use it.
- Voice transcripts must be visible and explicitly confirmed before a run.
- Customer-facing and financial effects are always Level 4 and require an
  explicit action approval.
- CRM scans may prepare Level 2 task proposals, but may not create live tasks or
  opportunities until an administrator approves the individual action.
- Evidence and inference must be labelled separately. Missing data stays
  unknown; no planner may invent a cause, price, recipient or public-web fact.
- The model never runs SQL. The `portal-copilot` Edge Function owns typed,
  whitelisted operations and durable audit state.
- Never undo a completed prior step after a later partial failure.

## Key files

- `src/pages/admin/PortalCopilotPage.tsx` — full-page command and approvals UI.
- `src/features/admin/copilot/api.ts` — typed Edge Function client.
- `src/features/admin/copilot/usePushToTalk.ts` — browser push-to-talk input.
- `supabase/functions/portal-copilot/index.ts` — server orchestration.
- `supabase/functions/_shared/copilot/portalRollout.ts` — deterministic plan builder.
- `supabase/functions/_shared/copilot/crmOpportunityScan.ts` — deterministic CRM signal planner.
- `supabase/migrations/20260813130000_portal_copilot_mvp.sql` — run/action/audit data.
- `supabase/migrations/20260814160000_portal_copilot_crm_opportunity_scan.sql` — CRM workflow registration.
- `docs/portal-copilot-connected-capabilities.md` — verified CRM, pricing and enrichment seams.
