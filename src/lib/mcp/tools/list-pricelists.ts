import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_pricelists",
  title: "List pricelists and catalogs",
  description:
    "List pricelist versions and catalog templates the caller may see, to identify which pricelist applies to an account.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max rows per collection (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const cap = limit ?? 20;
    const [versions, templates] = await Promise.all([
      supabase
        .from("pricelist_versions")
        .select("id,name,base_currency,is_template,format_type,updated_at")
        .order("updated_at", { ascending: false })
        .limit(cap),
      supabase
        .from("catalog_templates")
        .select("id,name,status,cover_title,cover_subtitle,updated_at")
        .order("updated_at", { ascending: false })
        .limit(cap),
    ]);
    if (versions.error && templates.error) return fail(versions.error.message);
    const payload = { pricelist_versions: versions.data ?? [], catalog_templates: templates.data ?? [] };
    return ok(payload, payload);
  },
});
