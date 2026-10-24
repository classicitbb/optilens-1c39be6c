import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, callerCanAccessFinancialData, notAuthenticated, ok, fail } from "../supabase";
import { dispatchAdminResourceTool } from "../adminResources";

export default defineTool({
  name: "admin_search_records",
  title: "Search admin records",
  description:
    "Search or list records in any admin resource (see admin_list_resources for keys). Row-level security still applies, so only data the caller may see is returned.",
  inputSchema: {
    resource: z.string().min(1).describe("Resource key from admin_list_resources."),
    query: z.string().min(1).optional().describe("Free-text search across the resource's searchable columns."),
    filters: z.record(z.string(), z.any()).optional().describe('Exact-match column filters, e.g. {"status":"open"}.'),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ resource, query, filters, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    try {
      const result = await dispatchAdminResourceTool(supabaseForUser(ctx), "admin_search_records", {
        resource,
        query,
        filters,
        limit,
      }, undefined, await callerCanAccessFinancialData(ctx));
      return ok(result.data, { resource, count: Array.isArray(result.data) ? result.data.length : 0, rows: result.data });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Search failed");
    }
  },
});
