import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

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

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  if (!authHeader) {
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
    return createAuthErrorResponse("Unauthorized", 401, corsHeaders);
  }

  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
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
): Promise<true | Response> {
  if (allowedRoles.length === 0) {
    return createAuthErrorResponse("Forbidden", 403, corsHeaders);
  }

  const { data, error } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", allowedRoles)
    .limit(1);

  if (error || !data || data.length === 0) {
    return createAuthErrorResponse("Forbidden", 403, corsHeaders);
  }

  return true;
}
