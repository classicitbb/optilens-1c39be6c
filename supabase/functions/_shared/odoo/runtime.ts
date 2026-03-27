import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { OdooConnection } from "./types.ts";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../http/cors.ts";

const odooCorsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-client-info, apikey, content-type, x-odoo-webhook-token",
  allowMethods: "POST, OPTIONS",
});

export function getOdooCorsHeaders(req: Request) {
  return getCorsHeaders(req, odooCorsPolicy);
}

export function handleOdooCorsPreflight(req: Request): Response | null {
  return handleCorsPreflight(req, odooCorsPolicy);
}

export function rejectDisallowedOdooOrigin(req: Request): Response | null {
  return rejectDisallowedOrigin(req, odooCorsPolicy);
}

export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

export async function loadConnection(connectionId?: string): Promise<OdooConnection> {
  let query = supabaseAdmin
    .from("integration_connections")
    .select("id,tenant_key,base_url,database_name,user_identifier,auth_mode,dry_run_enabled,sync_batch_size,pull_cursor,push_cursor,conflict_policy")
    .eq("provider", "odoo")
    .eq("status", "connected")
    .limit(1);

  if (connectionId) query = query.eq("id", connectionId);
  const { data, error } = await query.single();
  if (error || !data) throw new Error(`Missing active Odoo integration connection: ${error?.message ?? "not found"}`);
  return data as OdooConnection;
}

export async function getConnectionSecret(connectionId: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("get_integration_connection_secret", { p_connection_id: connectionId });
  if (error || !data) throw new Error(`Unable to retrieve secret: ${error?.message ?? "empty"}`);
  return data as string;
}

export async function withBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      const sleepMs = 500 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
    }
  }
  throw lastError;
}

export async function createRunLog(connectionId: string, runType: "pull" | "push" | "webhook") {
  const { data, error } = await supabaseAdmin
    .from("contact_sync_runs")
    .insert({ integration_connection_id: connectionId, run_type: runType, status: "running" })
    .select("id,started_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Unable to create sync run log");
  return data as { id: string; started_at: string };
}

export async function finalizeRunLog(
  runId: string,
  details: { status: "success" | "failed"; pullRecords?: number; pushRecords?: number; failureCount?: number; cursorAdvanced?: boolean; metadata?: Record<string, unknown>; errorSummary?: string },
) {
  const finishedAt = new Date();
  const { data } = await supabaseAdmin.from("contact_sync_runs").select("started_at").eq("id", runId).single();
  const startedAt = data?.started_at ? new Date(String(data.started_at)) : null;
  const durationMs = startedAt ? Math.max(0, finishedAt.getTime() - startedAt.getTime()) : null;

  await supabaseAdmin.from("contact_sync_runs").update({
    status: details.status,
    finished_at: finishedAt.toISOString(),
    duration_ms: durationMs,
    pull_records_processed: details.pullRecords ?? 0,
    push_records_processed: details.pushRecords ?? 0,
    failure_count: details.failureCount ?? 0,
    cursor_advanced: details.cursorAdvanced ?? false,
    metadata: details.metadata ?? {},
    error_summary: details.errorSummary ?? null,
  }).eq("id", runId);
}

export async function deadLetter(input: {
  connectionId: string;
  direction: "pull" | "push";
  externalId?: string | null;
  localContactId?: string | null;
  error: unknown;
  sourcePayload?: Record<string, unknown>;
}) {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  await supabaseAdmin.from("contact_sync_dead_letters").insert({
    integration_connection_id: input.connectionId,
    sync_direction: input.direction,
    external_id: input.externalId ?? null,
    local_contact_id: input.localContactId ?? null,
    attempt_count: 1,
    status: "pending",
    next_retry_at: new Date(Date.now() + 60_000).toISOString(),
    last_error: message,
    error_payload: { error: message, stack: input.error instanceof Error ? input.error.stack : null },
    source_payload: input.sourcePayload ?? {},
  });
}
