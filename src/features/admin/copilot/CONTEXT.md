# CV Portal Copilot — Context

## What this is

The admin-only operating layer for whitelisted portal workflows. V1 supports
the ERP portal rollout only; it extends the existing Classic Visions MCP and
portal-account APIs rather than creating parallel customer or login systems.

## Hard rules

- `/admin/copilot` is additionally wrapped in `AdminOnlyRoute`; customers,
  prospects, operators and viewers cannot use it.
- Voice transcripts must be visible and explicitly confirmed before a run.
- Customer-facing and financial effects are always Level 4 and require an
  explicit action approval.
- The model never runs SQL. The `portal-copilot` Edge Function owns typed,
  whitelisted operations and durable audit state.
- Never undo a completed prior step after a later partial failure.

## Key files

- `src/pages/admin/PortalCopilotPage.tsx` — full-page command and approvals UI.
- `src/features/admin/copilot/api.ts` — typed Edge Function client.
- `src/features/admin/copilot/usePushToTalk.ts` — browser push-to-talk input.
- `supabase/functions/portal-copilot/index.ts` — server orchestration.
- `supabase/functions/_shared/copilot/portalRollout.ts` — deterministic plan builder.
- `supabase/migrations/20260813130000_portal_copilot_mvp.sql` — run/action/audit data.
