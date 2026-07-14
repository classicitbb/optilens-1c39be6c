import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_my_orders",
  title: "List my orders",
  description:
    "List the signed-in user's Classic Visions orders (most recent first). RLS restricts results to the caller.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max orders to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase
      .from("orders")
      .select("id,status,total,currency,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { count: rows.length, orders: rows },
    };
  },
});
