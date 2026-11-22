# Classic Visions MCP

Entry: `index.ts`; tools: `tools/`; caller-scoped database client: `supabase.ts`.
Admin resource definitions are shared with Portal Copilot via `adminResources.ts`.
Preserve caller OAuth tokens, RLS, financial capability checks and approval flows.
Do not substitute service-role access or add arbitrary SQL or publishing tools.

Version 0.5.0 adds `review_crm_organization` (28 registered tools total), a bounded
read-only breakdown without names, emails, notes or financial data. Report its
coverage; empty results do not prove the caller has access.

`npm run mcp:generate` emits `supabase/functions/mcp/index.ts` using
`SUPABASE_PROJECT_REF`. Generated code is not hand-edited. The staging mirror is
historical and is not the production release target.
`npm run mcp:check` uses `MCP_SERVER_URL` for anonymous HTTPS metadata and 401
challenge validation. It never proves successful OAuth sign-in or record access.

Focused verification: `npx vitest run --coverage=false src/tests/unit/mcpConnection.test.ts src/tests/unit/mcpContactOrganization.test.ts`.
Connection and Live behavior: `docs/classic-visions-mcp.md`.
Production deployment, sign-in changes and publication need explicit approval.
