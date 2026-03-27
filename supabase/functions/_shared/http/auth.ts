import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";
import { getIpHintFromRequest, getUserAgentFromRequest, logSecurityAuditEvent } from "../security/auditLogger.ts";

export type AuthContext = {
  user: User;
  supabaseUserClient: SupabaseClient;
  supabaseAdminClient: SupabaseClient;
};

export function createAuthErrorResponse(message: string, status: 401, headers: Record<string, string>): Response;
export function createAuthErrorResponse(message: string, status: 403, headers: Record<string, string>): Response;
export function createAuthErrorResponse(message: string, status: 401 | 403, headers: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

export async function requireAuthenticatedUser(req: Request, corsHeaders: Record<string, string>): Promise<AuthContext | Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  const sourcePath = new URL(req.url).pathname;
  const requestId = req.headers.get("x-request-id") ?? undefined;
  const ipHint = getIpHintFromRequest(req);
  const userAgent = getUserAgentFromRequest(req);

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  if (!authHeader) {
    await logSecurityAuditEvent({
      category: "auth",
      eventType: "auth.unauthorized",
      severity: "medium",
      statusCode: 401,
      sourceFunction: "shared-http-auth",
      sourcePath,
      requestId,
      ipHint,
      userAgent,
      payload: { reason: "missing_authorization_header" },
    });
    return createAuthErrorResponse("Unauthorized", 401, corsHeaders);
  }

  const supabaseUserClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await supabaseUserClient.auth.getUser();

  if (error || !user) {
    await logSecurityAuditEvent({
      category: "auth",
      eventType: "auth.unauthorized",
      severity: "medium",
      statusCode: 401,
      sourceFunction: "shared-http-auth",
      sourcePath,
      requestId,
      ipHint,
      userAgent,
      payload: { reason: "invalid_user_session", auth_error: error?.message ?? null },
    });
    return createAuthErrorResponse("Unauthorized", 401, corsHeaders);
  }

  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await logSecurityAuditEvent({
    category: "auth",
    eventType: "auth.authenticated",
    severity: "info",
    actorUserId: user.id,
    sourceFunction: "shared-http-auth",
    sourcePath,
    requestId,
    ipHint,
    userAgent,
  });

  return {
    user,
    supabaseUserClient,
    supabaseAdminClient,
  };
}

export async function requireUserRole(
  adminClient: SupabaseClient,
  userId: string,
  allowedRoles: string[],
  corsHeaders: Record<string, string>,
  auditContext?: { sourceFunction?: string; sourcePath?: string; ipHint?: string; userAgent?: string; requestId?: string },
): Promise<true | Response> {
  if (allowedRoles.length === 0) {
    await logSecurityAuditEvent({
      category: "privileged_action",
      eventType: "auth.forbidden",
      severity: "high",
      statusCode: 403,
      actorUserId: userId,
      sourceFunction: auditContext?.sourceFunction ?? "shared-http-auth",
      sourcePath: auditContext?.sourcePath,
      requestId: auditContext?.requestId,
      ipHint: auditContext?.ipHint,
      userAgent: auditContext?.userAgent,
      payload: { reason: "missing_allowed_roles" },
    });
    return createAuthErrorResponse("Forbidden", 403, corsHeaders);
  }

  const { data, error } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", allowedRoles)
    .limit(1);

  if (error || !data || data.length === 0) {
    await logSecurityAuditEvent({
      category: "privileged_action",
      eventType: "auth.forbidden",
      severity: "high",
      statusCode: 403,
      actorUserId: userId,
      sourceFunction: auditContext?.sourceFunction ?? "shared-http-auth",
      sourcePath: auditContext?.sourcePath,
      requestId: auditContext?.requestId,
      ipHint: auditContext?.ipHint,
      userAgent: auditContext?.userAgent,
      payload: { reason: "role_check_failed", allowedRoles },
    });
    return createAuthErrorResponse("Forbidden", 403, corsHeaders);
  }

  await logSecurityAuditEvent({
    category: "privileged_action",
    eventType: "auth.role_granted",
    severity: "info",
    actorUserId: userId,
    sourceFunction: auditContext?.sourceFunction ?? "shared-http-auth",
    sourcePath: auditContext?.sourcePath,
    requestId: auditContext?.requestId,
    ipHint: auditContext?.ipHint,
    userAgent: auditContext?.userAgent,
    payload: { allowedRoles },
  });

  return true;
}

export async function requirePrivilegedAccess(
  req: Request,
  corsHeaders: Record<string, string>,
  options: {
    allowedRoles: string[];
    sourceFunction?: string;
  },
): Promise<AuthContext | Response> {
  const authContext = await requireAuthenticatedUser(req, corsHeaders);
  if (authContext instanceof Response) {
    return authContext;
  }

  const sourcePath = new URL(req.url).pathname;
  const requestId = req.headers.get("x-request-id") ?? undefined;
  const ipHint = getIpHintFromRequest(req);
  const userAgent = getUserAgentFromRequest(req);

  const roleCheck = await requireUserRole(
    authContext.supabaseAdminClient,
    authContext.user.id,
    options.allowedRoles,
    corsHeaders,
    {
      sourceFunction: options.sourceFunction,
      sourcePath,
      requestId,
      ipHint,
      userAgent,
    },
  );

  if (roleCheck instanceof Response) {
    return roleCheck;
  }

  return authContext;
}
