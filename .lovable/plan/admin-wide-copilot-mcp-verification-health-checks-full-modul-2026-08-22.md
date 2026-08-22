# Admin-wide Copilot & MCP: verification, health checks, full module coverage

## 1. Verify the helpdesk SLA panel

- Open a ticket in the running app with a browser check, confirm the SLA panel loads deadlines (no `policy_id` error), then apply and clear an SLA policy and confirm the panel refreshes.
- If any remaining query still uses the old column name, correct it to `sla_policy_id`.

## 2. Verify the MCP endpoint end-to-end

- Send an `OPTIONS` preflight and a plain `POST` (`initialize`, then `tools/list`) to `/functions/v1/mcp`, confirming 200 responses and that the tool list returned matches the registered tools.
- Confirm the unauthenticated protected-resource discovery document responds, and that a call without a token is rejected cleanly rather than crashing.
- Redeploy the `mcp` function so the regenerated bundle is what the endpoint serves.

## 3. Health check + email alerting

- New scheduled edge function `platform-health-check` that runs every 15 minutes and probes:
  - MCP: preflight + `tools/list`, expecting 200 and a non-empty tool list.
  - Helpdesk SLA: a read against the SLA status table using the same columns the app uses, so a schema drift like the `policy_id` break is caught immediately.
  - Portal Copilot: a lightweight no-op operation.
- Results are written to the existing `edge_function_health` table (visible in admin), and on transition to failure (or a repeated failure) an email goes to the ops/feedback address through the existing transactional email pipeline. Recovery sends a single "resolved" email — no repeat spam while a check stays red.
- A repo script (`npm run qa:mcp-smoke`) runs the same probes on demand for local/CI use.

## 4. Wide admin scope for MCP and Copilot

Both surfaces share one tool registry so the MCP server and the Admin Copilot have identical capability.

**Grounding.** The Copilot system context is extended into a full module map covering every app in the admin launcher — CRM, helpdesk, orders and Rx, catalog and pricing, pricelists, customers and portals, leads, docstudio, shipments, costings, moonshot, settings/integrations — with each module's purpose, key data, and the common workflows an admin performs there. A drift test keeps the map in sync with the launcher config.

**Coverage.** Read plus write tools across all launcher modules: search/inspect anything, and create/update the records the admin asks for (contacts and CRM stages, tickets and replies/assignment/SLA, orders and Rx submissions, quotes, catalog and lens/addon/supply records, pricing rows and pricelist generation, customer accounts and portal access, leads, tasks, shipments, documents).

**Autonomy — execute all, approve only irreversible.** Ordinary reads and writes run immediately with no approval card and no pushback. Only these queue for one-click approval: deletes, price changes and publishing prices, and customer-facing sends (emails, portal invites, order dispatch). Every action — approved or immediate — is written to the copilot audit log with before/after detail.

**Multi-step behaviour.** Complex asks are decomposed and executed to completion in one turn: the loop iterates over lookups and actions until the task is done or an approval gate is reached, then reports what it did. It stops asking clarifying questions when the data lets it decide.

## Technical notes

- Tools live in `src/lib/mcp/tools/`; the Vite MCP plugin regenerates `supabase/functions/mcp/index.ts`, and the Copilot edge function imports the same shared definitions so there is one implementation per capability.
- All writes go through the caller's own token so RLS and the staff/admin role checks stay authoritative; the Copilot keeps `allowedRoles: ["admin"]`.
- Guardrails that stay in force regardless of autonomy: never invent or promise prices, discounts, credit terms, or delivery dates; prices always come from the pricing engine; cost stays hidden from Viewer and Customer.
- New route/tooling ships with tests: MCP manifest extraction, launcher-vs-context drift, approval-gate classification, and the health-check probe contract.
