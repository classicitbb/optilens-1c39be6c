import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callPortalCopilot, fail, notAuthenticated, ok } from "../supabase";

export default defineTool({
  name: "prepare_erp_portal_rollout",
  title: "Prepare ERP portal rollout",
  description: "Admin-only. Queries live Innovations-synced customers, excludes active portal members, and prepares invite or follow-up action cards. It never sends an email without later explicit approval.",
  inputSchema: {
    command: z.string().trim().min(1).max(2000).optional().describe("The admin's plain-English rollout instruction."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ command }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    try {
      const payload = await callPortalCopilot(ctx, {
        operation: "prepare-erp-rollout",
        command: command ?? "Roll out portal access to all ERP customers",
        inputMode: "text",
        transcriptConfirmed: false,
      });
      return ok(payload, payload);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not prepare the ERP portal rollout");
    }
  },
});
