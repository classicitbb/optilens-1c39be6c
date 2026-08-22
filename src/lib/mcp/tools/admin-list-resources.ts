import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, ok } from "../supabase";
import { ADMIN_RESOURCES } from "../adminResources";

export default defineTool({
  name: "admin_list_resources",
  title: "List admin data resources",
  description:
    "List every admin module data resource this server can read or write (CRM, helpdesk, orders, Rx, pricing, catalog, customers, billing, shipments, docs, knowledge, settings), with writable fields and whether writes need approval. Call this first when you are unsure which resource covers a task.",
  inputSchema: {
    module: z.string().min(1).optional().describe('Optional module filter, e.g. "Helpdesk" or "Pricing".'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ module }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const filter = module?.toLowerCase() ?? "";
    const rows = ADMIN_RESOURCES.filter((resource) => !filter || resource.module.toLowerCase().includes(filter)).map(
      (resource) => ({
        key: resource.key,
        module: resource.module,
        description: resource.description,
        writable: resource.writable,
        approvalOnWrite: Boolean(resource.priceSensitive),
      }),
    );
    return ok(rows, { count: rows.length, resources: rows });
  },
});
