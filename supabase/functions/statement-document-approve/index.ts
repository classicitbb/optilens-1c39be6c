import { createClient } from "npm:@supabase/supabase-js@2";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

const json = (body: unknown, status: number, headers: Record<string, string>) => new Response(JSON.stringify(body), { status, headers: { ...headers, "content-type": "application/json" } });

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const headers = getCorsHeaders(req, corsPolicy);
  const blocked = rejectDisallowedOrigin(req, corsPolicy);
  if (blocked) return blocked;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);

  const auth = await requirePrivilegedAccess(req, headers, { allowedRoles: ["admin", "operator"], sourceFunction: "statement-document-approve" });
  if (auth instanceof Response) return auth;

  let body: { job_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400, headers); }
  if (!body.job_id) return json({ error: "job_id is required" }, 400, headers);

  const { data: job, error } = await auth.supabaseAdminClient
    .from("statement_document_jobs")
    .update({ email_status: "approved", approved_by: auth.user.id, approved_at: new Date().toISOString(), error_message: null, next_retry_at: new Date().toISOString() })
    .eq("id", body.job_id)
    .eq("status", "uploaded")
    .eq("email_status", "awaiting_approval")
    .select("id,innovations_statement_id,email_status,approved_at")
    .maybeSingle();
  if (error) return json({ error: error.message }, 500, headers);
  if (!job) return json({ error: "Statement is not awaiting approval or its PDF is not uploaded." }, 409, headers);
  return json({ ok: true, job }, 200, headers);
});
