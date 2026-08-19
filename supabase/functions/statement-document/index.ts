import { createClient } from "npm:@supabase/supabase-js@2";
import { downloadOneDrivePdf } from "../_shared/microsoft/graphOneDrive.ts";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const user = (await supabase.auth.getUser(auth.slice(7))).data.user;
  if (!user) return new Response("Unauthorized", { status: 401 });
  const statementId = new URL(req.url).searchParams.get("statement_id");
  if (!statementId) return new Response("statement_id is required", { status: 400 });
  const { data: profile } = await supabase.from("profiles").select("crm_customer_id").eq("user_id", user.id).maybeSingle();
  const { data: job } = await supabase.from("statement_document_jobs").select("one_drive_item_id,pdf_filename").eq("innovations_statement_id", statementId).maybeSingle();
  const { data: statement } = await supabase.from("statements").select("customer_id,void").eq("innovations_statement_id", statementId).maybeSingle();
  if (!profile?.crm_customer_id || !statement || statement.void || statement.customer_id !== profile.crm_customer_id || !job?.one_drive_item_id) return new Response("Not found", { status: 404 });
  const file = await downloadOneDrivePdf(job.one_drive_item_id);
  if (!file.ok || !file.body) return new Response("Document unavailable", { status: 502 });
  return new Response(file.body, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${job.pdf_filename ?? `Statement-${statementId}.pdf`}"`, "cache-control": "private, no-store" } });
});
