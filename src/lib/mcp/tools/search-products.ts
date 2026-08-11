import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

type Row = Record<string, unknown>;

const matches = (row: Row, needle: string) =>
  String(row.name ?? "").toLowerCase().includes(needle) ||
  String(row.description ?? "").toLowerCase().includes(needle) ||
  String(row.sku ?? "").toLowerCase().includes(needle);

export default defineTool({
  name: "search_products",
  title: "Search catalog",
  description:
    "Search the Classic Visions catalog (lenses, supplies, add-ons) by name, SKU or description. Cost data is never returned.",
  inputSchema: {
    query: z.string().min(1).describe("Search text matched against name, SKU or description."),
    category: z
      .enum(["all", "lenses", "supplies", "addons"])
      .optional()
      .describe("Restrict the search to one catalog type (default: all)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows per category (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const cap = limit ?? 10;
    const needle = query.toLowerCase();
    const want = category ?? "all";

    const load = async (rpc: string) => {
      const { data, error } = await supabase.rpc(rpc);
      if (error) throw new Error(`${rpc}: ${error.message}`);
      return ((data ?? []) as Row[]).filter((r) => matches(r, needle)).slice(0, cap);
    };

    try {
      const [lenses, supplies, addons] = await Promise.all([
        want === "all" || want === "lenses" ? load("get_lenses_safe") : Promise.resolve([]),
        want === "all" || want === "supplies" ? load("get_supplies_safe") : Promise.resolve([]),
        want === "all" || want === "addons" ? load("get_addons_safe") : Promise.resolve([]),
      ]);
      const payload = { lenses, supplies, addons };
      return ok(payload, { count: lenses.length + supplies.length + addons.length, ...payload });
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Catalog search failed.");
    }
  },
});
