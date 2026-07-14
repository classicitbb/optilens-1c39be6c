import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_products",
  title: "Search store products",
  description:
    "Search the Classic Visions public store catalog by name or description. Returns up to `limit` products.",
  inputSchema: {
    query: z.string().min(1).describe("Search text matched against product name/description."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
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
    const cap = limit ?? 10;
    const like = `%${query.replace(/[%_]/g, "")}%`;
    const { data, error } = await supabase
      .from("store_products")
      .select("id,name,product_type,description")
      .or(`name.ilike.${like},description.ilike.${like}`)
      .limit(cap);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { count: rows.length, results: rows },
    };
  },
});
