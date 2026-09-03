import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, callerCanAccessFinancialData, notAuthenticated, ok, fail } from "../supabase";
import { dispatchAdminResourceTool } from "../adminResources";

export default defineTool({
  name: "admin_get_record",
  title: "Get one admin record",
  description: "Fetch a single record by id from any admin resource (see admin_list_resources for keys).",
  inputSchema: {
    resource: z.string().min(1).describe("Resource key from admin_list_resources."),
    id: z.union([z.string().min(1), z.number()]).describe("Record id."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ resource, id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    try {
      const result = await dispatchAdminResourceTool(supabaseForUser(ctx), "admin_get_record", { resource, id }, undefined, await callerCanAccessFinancialData(ctx));
      return ok(result.data, { resource, record: result.data });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Lookup failed");
    }
  },
});
