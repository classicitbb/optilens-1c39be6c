import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  allowMethods: "POST, OPTIONS",
});

const jsonResponse = (req: Request, status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json" },
  });

const allowedActions = new Set([
  "list-users",
  "reset-password",
  "set-password",
  "invite-user",
  "create-user",
]);

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy);
  if (originBlocked) return originBlocked;

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authContext = await requirePrivilegedAccess(req, corsHeaders, {
      allowedRoles: ["admin"],
      sourceFunction: "admin-user-management",
    });
    if (authContext instanceof Response) {
      return authContext;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

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
      const { email } = body;
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
      const { userId, password } = body;
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
      const { email } = body;
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
      if (displayName && newUser?.user) {
        await adminClient
          .from("profiles")
          .update({ display_name: displayName })
          .eq("user_id", newUser.user.id);
      }
      return jsonResponse(req, 200, { success: true, userId: newUser?.user?.id });
    }

    return jsonResponse(req, 400, { error: "Unhandled action" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse(req, 500, { error: message });
  }
});
