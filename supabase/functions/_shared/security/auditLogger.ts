import { createClient } from "npm:@supabase/supabase-js@2";

type SecurityAuditEventInput = {
  category: "auth" | "privileged_action" | "edge_security" | "incident_response" | "secrets_management";
  eventType: string;
  severity?: "info" | "low" | "medium" | "high" | "critical";
  statusCode?: number;
  actorUserId?: string;
  actorRole?: string;
  sourceFunction: string;
  sourcePath?: string;
  requestId?: string;
  ipHint?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
};

const maskIp = (rawIp: string | null) => {
  if (!rawIp) return null;
  if (rawIp.includes(":")) {
    const parts = rawIp.split(":").filter(Boolean);
    return `${parts.slice(0, 4).join(":")}:*`;
  }
  const parts = rawIp.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
  }
  return rawIp;
};

export const getIpHintFromRequest = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return maskIp(forwardedFor || realIp || null) ?? undefined;
};

export const getUserAgentFromRequest = (req: Request) => req.headers.get("user-agent")?.slice(0, 500) ?? undefined;

export async function logSecurityAuditEvent(input: SecurityAuditEventInput): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn("security audit skipped: missing Supabase env");
    return;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await adminClient.rpc("log_security_event", {
    p_category: input.category,
    p_event_type: input.eventType,
    p_severity: input.severity ?? "info",
    p_status_code: input.statusCode ?? null,
    p_actor_user_id: input.actorUserId ?? null,
    p_actor_role: input.actorRole ?? null,
    p_source_function: input.sourceFunction,
    p_source_path: input.sourcePath ?? null,
    p_request_id: input.requestId ?? null,
    p_ip_hint: input.ipHint ?? null,
    p_user_agent: input.userAgent ?? null,
    p_payload: input.payload ?? {},
    p_occurred_at: input.occurredAt ?? null,
  });

  if (error) {
    console.warn("security audit logging failed", {
      eventType: input.eventType,
      sourceFunction: input.sourceFunction,
      message: error.message,
    });
  }
}
