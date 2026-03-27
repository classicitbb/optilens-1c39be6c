import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { pullContacts } from "../_shared/odoo/contactSync.ts";
import { createRunLog, finalizeRunLog, getOdooCorsHeaders, handleOdooCorsPreflight, loadConnection, rejectDisallowedOdooOrigin, supabaseAdmin } from "../_shared/odoo/runtime.ts";

serve(async (req) => {
  const preflight = handleOdooCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getOdooCorsHeaders(req);
  const originBlocked = rejectDisallowedOdooOrigin(req);
  if (originBlocked) return originBlocked;
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const requestedConnectionId = typeof body.connection_id === "string" ? body.connection_id : undefined;
  const connection = await loadConnection(requestedConnectionId);
  const run = await createRunLog(connection.id, "pull");

  try {
    const result = await pullContacts(connection.id);
    await finalizeRunLog(run.id, {
      status: "success",
      pullRecords: result.processed,
      failureCount: result.failures,
      cursorAdvanced: result.cursorAdvanced,
      metadata: { latest_cursor: result.latestCursor },
    });
    await supabaseAdmin.from("integration_connections").update({
      last_sync_import_count: result.processed,
      last_sync_failure_count: result.failures,
      last_sync_finished_at: new Date().toISOString(),
    }).eq("id", connection.id);

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    await finalizeRunLog(run.id, {
      status: "failed",
      failureCount: 1,
      errorSummary: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "pull failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
