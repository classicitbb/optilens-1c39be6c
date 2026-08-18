import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("admin-only CV Portal Copilot", () => {
  it("registers one canonical admin-only route", () => {
    expect(APP_ROUTE_REGISTRY).toContainEqual(expect.objectContaining({
      id: "admin.copilot",
      path: "/admin/copilot",
      audience: "admin",
      authMode: "admin",
    }));

    const routes = read("src/routes/admin/AdminRoutes.tsx");
    expect(routes).toContain('const PortalCopilotPage = lazy(() => import("@/pages/admin/PortalCopilotPage"));');
    expect(routes).toContain('<Route path="copilot" element={<AdminOnlyRoute><PortalCopilotPage /></AdminOnlyRoute>} />');
  });

  it("is discoverable from the admin launcher/sidebar and mapped to a permission feature", () => {
    const apps = read("src/features/admin/core/config/apps.ts");
    const navigation = read("src/config/navigationRegistry.ts");
    const permissions = read("src/hooks/useRolePermissions.ts");
    expect(apps).toContain("'/admin/copilot'");
    expect(navigation).toContain('routeId: "admin.copilot"');
    expect(permissions).toContain('"/admin/copilot": "copilot"');
  });

  it("persists runs, actions and transcript-bearing audit events behind admin RLS", () => {
    const migration = read("supabase/migrations/20260813130000_portal_copilot_mvp.sql");
    expect(migration).toContain("CREATE TABLE public.copilot_runs");
    expect(migration).toContain("CREATE TABLE public.copilot_actions");
    expect(migration).toContain("CREATE TABLE public.copilot_audit_events");
    expect(migration).toContain("public.has_role((SELECT auth.uid()), 'admin')");
    expect(migration).toContain("transcript");
  });

  it("persists multiple user-owned chats and links workflow runs to their conversation", () => {
    const migration = read("supabase/migrations/20260814120000_portal_copilot_conversations.sql");
    const edge = read("supabase/functions/portal-copilot/index.ts");
    const page = read("src/pages/admin/PortalCopilotPage.tsx");

    expect(migration).toContain("CREATE TABLE public.copilot_conversations");
    expect(migration).toContain("CREATE TABLE public.copilot_messages");
    expect(migration).toContain("ADD COLUMN conversation_id");
    expect(migration).toContain("created_by = (SELECT auth.uid())");
    expect(edge).toContain('operation === "create-conversation"');
    expect(edge).toContain('from("copilot_messages")');
    expect(edge).toContain("selectedConversationId");
    expect(edge).toContain("conversations?.some");
    expect(edge).toContain("runs?.some");
    expect(page).toContain("chooseConversation");
    expect(page).toContain("New chat");
    expect(page).toContain("displayedState?.conversations");
  });

  it("extends the existing MCP registry with the rollout and approval tools", () => {
    const mcp = read("src/lib/mcp/index.ts");
    expect(mcp).toContain("prepareErpPortalRolloutTool");
    expect(mcp).toContain("listCopilotApprovalsTool");
    expect(mcp).toContain("decideCopilotActionTool");
  });

  it("keeps authorization, transcript confirmation, approval and partial-failure policy server-side", () => {
    const edge = read("supabase/functions/portal-copilot/index.ts");
    const config = read("supabase/config.toml");
    expect(edge).toContain('allowedRoles: ["admin"]');
    expect(edge).toContain('inputMode === "voice" && !transcriptConfirmed');
    expect(edge).toContain("runCopilotTurn(claudeApiKey, claudeModel, command, history, db)");
    expect(edge).toContain('operation === "decide-action"');
    expect(edge).toContain('from("copilot_audit_events")');
    expect(edge).toContain("actions,");
    expect(edge).toContain("auditEvents,");
    expect(edge).toContain("settings,");
    expect(edge).toContain("for (let attempt = 1; attempt <= 2; attempt += 1)");
    expect(edge).toContain("portalAccountCreated: true");
    expect(edge).toContain('status: "failed"');
    expect(edge).toContain('"erp_portal_rollout_followup"');
    expect(edge).toContain('status: "inbox"');
    expect(edge).toContain('const priority = ["urgent", "high", "normal", "low"].includes');
    expect(config).toContain("[functions.portal-copilot]");
  });

  it("prepares evidence-backed CRM follow-up suggestions without creating live work", () => {
    const migration = read("supabase/migrations/20260814160000_portal_copilot_crm_opportunity_scan.sql");
    const edge = read("supabase/functions/portal-copilot/index.ts");
    const planner = read("supabase/functions/_shared/copilot/crmOpportunityScan.ts");
    const page = read("src/pages/admin/PortalCopilotPage.tsx");

    expect(migration).toContain("crm_opportunity_scan");
    expect(edge).toContain("buildQualifiedCrmPlan");
    expect(edge).toContain("start_crm_opportunity_scan");
    expect(edge).toContain('from("customer_order_health")');
    expect(edge).toContain('from("opportunities")');
    expect(edge).toContain('from("activities")');
    expect(edge).toContain('"crm_opportunity_suggestion"');
    expect(planner).toContain("Evidence:");
    expect(planner).toContain("Inference:");
    expect(page).toContain("Evidence used");
    expect(page).toContain("No CRM task or opportunity has been created yet.");
  });

  it("grounds the Copilot in OpticAdmin's own modules and gives it real read-only lookups", () => {
    const edge = read("supabase/functions/portal-copilot/index.ts");
    const systemContext = read("supabase/functions/_shared/copilot/systemContext.ts");
    const lookupTools = read("supabase/functions/_shared/copilot/lookupTools.ts");
    const apps = read("src/features/admin/core/config/apps.ts");

    expect(edge).toContain('from "../_shared/copilot/systemContext.ts"');
    expect(edge).toContain('from "../_shared/copilot/lookupTools.ts"');
    expect(edge).toContain("COPILOT_SYSTEM_CONTEXT");

    expect(systemContext).toContain("OpticAdmin");
    expect(systemContext).toContain("ERP");
    expect(systemContext).toContain("Google Contacts");

    // Drift guard: every module title in apps.ts (the frontend source of
    // truth) must appear verbatim in the copilot's grounding context, so a
    // renamed or newly added module doesn't silently go unmentioned.
    const titles = [...apps.matchAll(/title:\s*'([^']+)'/g)].map((match) => match[1]);
    expect(titles.length).toBeGreaterThan(0);
    for (const title of titles) {
      expect(systemContext).toContain(title);
    }

    expect(lookupTools).toContain("search_contacts");
    expect(lookupTools).toContain("get_contact");
    expect(lookupTools).toContain("search_web_orders");
    expect(lookupTools).toContain("search_help_articles");
    expect(lookupTools).toContain('from("contacts")');
    expect(lookupTools).toContain('from("orders")');
    expect(lookupTools).toContain('from("help_articles")');
    expect(lookupTools).toContain("dispatchLookupTool");

    expect(edge).toContain("MAX_LOOKUP_ITERATIONS");
    expect(edge).toContain("WORKFLOW_BY_TOOL_NAME");
  });

  it("lets an admin manage the Claude API key from /admin/settings/integrations instead of a raw function secret", () => {
    const migration = read("supabase/migrations/20260818120000_ai_agent_secret_store.sql");
    const edge = read("supabase/functions/portal-copilot/index.ts");
    const credentials = read("supabase/functions/_shared/copilot/aiAgentCredentials.ts");
    const page = read("src/pages/admin/settings/IntegrationsPage.tsx");

    // Settings are readable directly by admins; the encrypted secret table
    // and both credential-touching RPCs are locked down (writes only via
    // upsert_ai_agent_settings, decrypt only via service_role).
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.ai_agent_settings");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.ai_agent_secrets");
    expect(migration).toContain('USING (false) WITH CHECK (false)');
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.upsert_ai_agent_settings");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_ai_agent_credentials");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.record_ai_agent_test");
    expect(migration).toContain("extensions.pgp_sym_encrypt(p_api_key, public.payment_secret_encryption_key())");
    expect(migration).toContain("extensions.pgp_sym_decrypt(sec.encrypted_secret, public.payment_secret_encryption_key())");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.upsert_ai_agent_settings(text, boolean, text, uuid) TO authenticated");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_ai_agent_credentials() FROM PUBLIC");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_ai_agent_credentials() TO service_role");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.record_ai_agent_test(boolean, text, uuid) TO authenticated");

    expect(credentials).toContain('db.rpc("get_ai_agent_credentials")');
    expect(edge).toContain('from "../_shared/copilot/aiAgentCredentials.ts"');
    expect(edge).toContain("resolveClaudeCredentials(db");
    expect(edge).toContain('operation === "test-ai-agent"');
    expect(edge).toContain('db.rpc("record_ai_agent_test"');

    expect(page).toContain("AI Agents");
    expect(page).toContain('from("ai_agent_settings")');
    expect(page).toContain('"upsert_ai_agent_settings"');
    expect(page).toContain('operation: "test-ai-agent"');
  });
});
