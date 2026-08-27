// ============================================================
// One-time maintenance endpoint: copy the SCOTIA_SHARED_SECRET_PRODUCTION
// function secret into the admin-managed encrypted credential store and flip
// the gateway to production. Deployed, invoked once, then deleted.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("SCOTIA_SHARED_SECRET_PRODUCTION") ?? "";
  if (!secret) {
    return new Response(JSON.stringify({ error: "missing SCOTIA_SHARED_SECRET_PRODUCTION" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data, error } = await admin.rpc("upsert_payment_gateway_settings", {
    p_store_id: "811812100987",
    p_environment: "production",
    p_currency: "840",
    p_timezone: "America/Barbados",
    p_enabled: true,
    p_shared_secret: secret,
    p_actor_user_id: "a73f3436-68c4-46dd-9464-be8125f1d6a1",
  });

  return new Response(JSON.stringify({ ok: !error, settingsId: data, error: error?.message ?? null }), {
    status: error ? 500 : 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
