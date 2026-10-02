import { getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin, createCorsPolicy } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "content-type": "application/json" } });

function dateOnly(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const headers = getCorsHeaders(req, corsPolicy);
  const blocked = rejectDisallowedOrigin(req, corsPolicy);
  if (blocked) return blocked;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);

  const auth = await requirePrivilegedAccess(req, headers, {
    allowedRoles: ["admin", "operator"],
    sourceFunction: "statement-document-prepare-period",
  });
  if (auth instanceof Response) return auth;

  let body: { rehearsal?: boolean; from_date?: unknown; to_date?: unknown; dry_run?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400, headers); }
  const fromDate = dateOnly(body.from_date);
  const toDate = dateOnly(body.to_date);
  if (body.rehearsal !== true || !fromDate || !toDate || fromDate > toDate) {
    return json({ error: "rehearsal:true and a valid inclusive from_date/to_date range are required" }, 400, headers);
  }
  const dryRun = body.dry_run !== false;

  const { data: statements, error: statementError } = await auth.supabaseAdminClient
    .from("statements")
    .select("id,innovations_statement_id,from_date,to_date,void")
    .gte("from_date", fromDate)
    .lte("to_date", toDate)
    .or("void.is.false,void.is.null")
    .order("innovations_statement_id", { ascending: true });
  if (statementError) return json({ error: statementError.message }, 500, headers);

  const discovered = (statements ?? []).filter((row) => row.innovations_statement_id != null);
  const ids = discovered.map((row) => row.innovations_statement_id as number);
  const { data: existing, error: jobError } = ids.length
    ? await auth.supabaseAdminClient.from("statement_document_jobs").select("id,innovations_statement_id,status,email_status,storage_path,skip_reason").in("innovations_statement_id", ids)
    : { data: [], error: null };
  if (jobError) return json({ error: jobError.message }, 500, headers);

  const byStatement = new Map((existing ?? []).map((job) => [String(job.innovations_statement_id), job]));
  const missing = discovered.filter((row) => !byStatement.has(String(row.innovations_statement_id)));
  const resettable = (existing ?? []).filter((job) =>
    job.status === "skipped" || (job.status === "failed" && !job.storage_path)
  );
  const preserved = (existing ?? []).filter((job) => !resettable.includes(job));

  if (!dryRun) {
    if (missing.length) {
      const { error } = await auth.supabaseAdminClient.from("statement_document_jobs").upsert(
        missing.map((row) => ({
          innovations_statement_id: row.innovations_statement_id,
          statement_id: row.id,
          idempotency_key: `innovations-statement:${row.innovations_statement_id}`,
          status: "pending",
          upload_status: "pending",
          email_status: "not_sent",
          skip_reason: null,
          next_retry_at: new Date().toISOString(),
        })),
        { onConflict: "innovations_statement_id" },
      );
      if (error) return json({ error: error.message }, 500, headers);
    }
    for (const job of resettable) {
      const { error } = await auth.supabaseAdminClient.from("statement_document_jobs").update({
        status: "pending", skip_reason: null, upload_status: "pending", email_status: "not_sent",
        error_message: null, error_details: null, next_retry_at: new Date().toISOString(),
        completed_at: null, approved_by: null, approved_at: null,
      }).eq("id", job.id);
      if (error) return json({ error: error.message }, 500, headers);
    }
  }

  return json({
    ok: true,
    rehearsal: true,
    dry_run: dryRun,
    from_date: fromDate,
    to_date: toDate,
    discovered_count: discovered.length,
    missing_count: missing.length,
    reset_count: resettable.length,
    preserved_count: preserved.length,
    missing_statement_ids: missing.map((row) => row.innovations_statement_id),
    reset_statement_ids: resettable.map((job) => job.innovations_statement_id),
    preserved_statement_ids: preserved.map((job) => job.innovations_statement_id),
    message: dryRun ? "No database changes made. Re-run with dry_run:false only after review." : "September rehearsal jobs are queued; email remains approval-gated.",
  }, 200, headers);
});
