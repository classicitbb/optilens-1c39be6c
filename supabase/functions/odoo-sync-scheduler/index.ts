import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, supabaseAdmin } from "../_shared/odoo/runtime.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

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
