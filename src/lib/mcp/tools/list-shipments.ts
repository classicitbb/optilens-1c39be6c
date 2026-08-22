import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_shipments",
  title: "List inbound shipments",
  description: "List supplier shipments visible to the caller (most recent first). Staff-only in practice under RLS.",
  inputSchema: {
    status: z.string().min(1).optional().describe("Filter by shipment status (draft, reviewed, locked)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("shipments")
      .select("id,type,commodity,po_ref,invoice_number,invoice_date,date_ordered,date_received,currency,invoice_total_foreign,status,freight_provider,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return fail(error.message);
    const rows = data ?? [];
    return ok(rows, { count: rows.length, shipments: rows });
  },
});
