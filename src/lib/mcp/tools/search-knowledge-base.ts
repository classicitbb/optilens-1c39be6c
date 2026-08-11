import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail, likePattern } from "../supabase";

export default defineTool({
  name: "search_knowledge_base",
  title: "Search help articles",
  description:
    "Search Classic Visions help/wiki articles by title, summary or body. Visibility rules limit results to what the caller may read.",
  inputSchema: {
    query: z.string().min(1).describe("Search text."),
    limit: z.number().int().min(1).max(25).optional().describe("Max articles to return (default 8)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const like = likePattern(query);
    const { data, error } = await supabase
      .from("help_articles")
      .select("id,title,slug,summary,description,category,content_type,page_slug,status,updated_at,content")
      .or(`title.ilike.${like},summary.ilike.${like},description.ilike.${like},content.ilike.${like}`)
      .limit(limit ?? 8);
    if (error) return fail(error.message);
    const rows = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      content: typeof row.content === "string" ? row.content.slice(0, 4000) : row.content,
    }));
    return ok(rows, { count: rows.length, articles: rows });
  },
});
