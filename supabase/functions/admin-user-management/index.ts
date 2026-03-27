import { z } from "npm:zod@3.25.76";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const createCorsHeaders = (req: Request) => {
  const requestOrigin = req.headers.get("origin");
  const resolvedOrigin =
    requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0] ?? "null";

  return {
    "Access-Control-Allow-Origin": resolvedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

const jsonResponse = (req: Request, status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...createCorsHeaders(req), "Content-Type": "application/json" },
  });

const allowedActions = new Set([
  "list-users",
  "reset-password",
  "set-password",
  "invite-user",
  "create-user",
]);

Deno.serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(req, 401, { error: "Unauthorized" });
    }

  try {
    const authContext = await requirePrivilegedAccess(req, corsHeaders, {
      allowedRoles: ["admin"],
      sourceFunction: "admin-user-management",
    });
    const {
      data: { user: caller },
    } = await anonClient.auth.getUser();
    if (!caller) {
      return jsonResponse(req, 401, { error: "Unauthorized" });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return jsonResponse(req, 403, { error: "Forbidden" });
    }

    const body = await req.json();
    const { action } = body;
    if (!allowedActions.has(action)) {
      return jsonResponse(req, 400, { error: "Unknown action" });
    }

    if (action === "list-users") {
      const {
        data: { users },
        error,
      } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const result = users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      }));
      return jsonResponse(req, 200, result);
    }

    if (action === "reset-password") {
      const { email } = parsed.data;
      if (!email) {
        return jsonResponse(req, 400, { error: "Email is required" });
      }
      const { error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: "https://optilens.lovable.app/reset-password",
        },
      });
      if (error) throw error;
      return jsonResponse(req, 200, { success: true });
    }

    if (action === "set-password") {
      const { userId, password } = parsed.data;
      if (!userId || !password) {
        return jsonResponse(req, 400, { error: "userId and password are required" });
      }
      if (password.length < 8) {
        return jsonResponse(req, 400, { error: "Password must be at least 8 characters" });
      }
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password,
      });
      if (error) throw error;
      return jsonResponse(req, 200, { success: true });
    }

    if (action === "invite-user") {
      const { email } = parsed.data;
      if (!email) {
        return jsonResponse(req, 400, { error: "Email is required" });
      }
      const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://optilens.lovable.app/reset-password",
      });
      if (error) throw error;
      return jsonResponse(req, 200, { success: true });
    }

    if (action === "create-user") {
      const { email, password, displayName } = body;
      if (!email || !password) {
        return jsonResponse(req, 400, { error: "Email and password are required" });
      }
      if (password.length < 8) {
        return jsonResponse(req, 400, { error: "Password must be at least 8 characters" });
      }
      const { data: newUser, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      // Update display name if provided
      if (displayName && newUser?.user) {
        await adminClient
          .from("profiles")
          .update({ display_name: displayName })
          .eq("user_id", newUser.user.id);
      }
      return jsonResponse(req, 200, { success: true, userId: newUser?.user?.id });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse(req, 500, { error: message });
  }
});
