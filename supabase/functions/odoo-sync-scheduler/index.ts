import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getOdooCorsHeaders, handleOdooCorsPreflight, rejectDisallowedOdooOrigin, supabaseAdmin } from "../_shared/odoo/runtime.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

serve(async (req) => {
  const preflight = handleOdooCorsPreflight(req);
  if (preflight) return preflight;

  const corsHeaders = getOdooCorsHeaders(req);
  const originBlocked = rejectDisallowedOdooOrigin(req);
  if (originBlocked) return originBlocked;
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  const authContext = await requirePrivilegedAccess(req, corsHeaders, {
    allowedRoles: ["admin"],
    sourceFunction: "odoo-sync-scheduler",
  });
  if (authContext instanceof Response) return authContext;

  const { data, error } = await supabaseAdmin.rpc("enqueue_due_odoo_sync_jobs");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ enqueued_jobs: data ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
