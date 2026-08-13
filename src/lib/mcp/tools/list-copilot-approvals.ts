import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callPortalCopilot, fail, notAuthenticated, ok } from "../supabase";

export default defineTool({
  name: "list_copilot_approvals",
  title: "List Portal Copilot approvals",
  description: "Admin-only. Lists recent Copilot runs and the action cards for one run, including partial failures and audit-safe execution state.",
  inputSchema: {
    run_id: z.string().uuid().optional().describe("Copilot run id. Defaults to the latest run."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ run_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    try {
      const payload = await callPortalCopilot(ctx, { operation: "get-state", ...(run_id ? { runId: run_id } : {}) });
      return ok(payload, payload);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not load Copilot approvals");
    }
  },
});
