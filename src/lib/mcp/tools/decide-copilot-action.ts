import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callPortalCopilot, fail, notAuthenticated, ok } from "../supabase";

export default defineTool({
  name: "decide_copilot_action",
  title: "Approve or reject a Portal Copilot action",
  description: "Admin-only. Explicitly approves or rejects one prepared action. Approval can create an internal task or create/link a portal login and queue the customer invitation email.",
  inputSchema: {
    action_id: z.string().uuid().describe("Prepared Copilot action id."),
    decision: z.enum(["approve", "reject"]).describe("The admin's explicit decision."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ action_id, decision }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    try {
      const payload = await callPortalCopilot(ctx, { operation: "decide-action", actionId: action_id, decision });
      return ok(payload, payload);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Could not apply the Copilot decision");
    }
  },
});
