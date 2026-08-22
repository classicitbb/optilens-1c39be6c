import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";
import { dispatchAdminResourceTool } from "../adminResources";

export default defineTool({
  name: "admin_write_record",
  title: "Create, update or delete an admin record",
  description:
    "Create, update or delete a record in any admin resource. Ordinary changes execute immediately. Deletes and price-bearing changes are not executed: the tool returns an approval proposal describing exactly what would change, which an admin must approve in the Portal Copilot.",
  inputSchema: {
    resource: z.string().min(1).describe("Resource key from admin_list_resources."),
    operation: z.enum(["create", "update", "delete"]).describe("What to do."),
    id: z.union([z.string().min(1), z.number()]).optional().describe("Record id (required for update and delete)."),
    values: z.record(z.string(), z.any()).optional().describe("Column/value pairs for create and update. Only writable columns are accepted."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ resource, operation, id, values }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const toolName =
      operation === "create" ? "admin_create_record" : operation === "update" ? "admin_update_record" : "admin_delete_record";
    try {
      const result = await dispatchAdminResourceTool(supabaseForUser(ctx), toolName, { resource, id, values });
      return ok(result, {
        status: result.status,
        resource: result.resource,
        operation: result.operation,
        reason: result.reason ?? null,
        proposal: result.proposal ?? null,
        data: result.data ?? null,
      });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Write failed");
    }
  },
});
