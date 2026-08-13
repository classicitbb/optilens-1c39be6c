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
    expect(edge).toContain("classifyWithClaude(command, settings.model)");
    expect(edge).toContain('operation === "decide-action"');
    expect(edge).toContain('from("copilot_audit_events")');
    expect(edge).toContain("actions, auditEvents, settings");
    expect(edge).toContain("for (let attempt = 1; attempt <= 2; attempt += 1)");
    expect(edge).toContain("portalAccountCreated: true");
    expect(edge).toContain('status: "failed"');
    expect(edge).toContain('activity_type: "erp_portal_rollout_followup"');
    expect(edge).toContain('status: "inbox"');
    expect(edge).toContain('priority: "normal"');
    expect(config).toContain("[functions.portal-copilot]");
  });
});
