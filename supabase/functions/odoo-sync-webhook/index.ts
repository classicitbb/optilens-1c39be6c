import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { pullContacts } from "../_shared/odoo/contactSync.ts";
import { createRunLog, finalizeRunLog, getOdooCorsHeaders, handleOdooCorsPreflight, loadConnection, rejectDisallowedOdooOrigin } from "../_shared/odoo/runtime.ts";

serve(async (req) => {
  const preflight = handleOdooCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getOdooCorsHeaders(req);
  const originBlocked = rejectDisallowedOdooOrigin(req);
  if (originBlocked) return originBlocked;
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const expectedToken = Deno.env.get("ODOO_WEBHOOK_TOKEN");
  if (expectedToken) {
    const provided = req.headers.get("x-odoo-webhook-token") ?? "";
    if (provided !== expectedToken) {
      return new Response(JSON.stringify({ error: "Unauthorized webhook token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const body = await req.json().catch(() => ({}));
  const connection = await loadConnection(typeof body.connection_id === "string" ? body.connection_id : undefined);
  const run = await createRunLog(connection.id, "webhook");

  try {
    const payloadIds = Array.isArray(body.partner_ids)
      ? body.partner_ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isFinite(id))
      : undefined;

    const result = await pullContacts(connection.id, payloadIds);
    await finalizeRunLog(run.id, {
      status: "success",
      pullRecords: result.processed,
      failureCount: result.failures,
      cursorAdvanced: result.cursorAdvanced,
      metadata: { webhook_received_ids: payloadIds ?? [] },
    });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    await finalizeRunLog(run.id, {
      status: "failed",
      failureCount: 1,
      errorSummary: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "webhook sync failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
