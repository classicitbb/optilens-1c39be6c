import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  Deno?: { env?: { get?: (name: string) => string | undefined } };
  process?: { env?: Record<string, string | undefined> };
};

function runtimeEnv(name: string): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  return runtime.Deno?.env?.get?.(name) ?? runtime.process?.env?.[name];
}

function configuredEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function supabaseProjectUrl(): string {
  const url = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  if (!url) throw new Error("SUPABASE_URL (or VITE_SUPABASE_URL) is required");
  return url;
}

function supabasePublishableKey(): string {
  const direct = configuredEnv(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys.default, ...Object.values(keys)]
          .find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"))
          ?.trim();
        if (key) return key;
      }
    } catch {
      // fall through to legacy names
    }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]);
  if (legacy) return legacy;
  throw new Error("SUPABASE_PUBLISHABLE_KEY, SUPABASE_PUBLISHABLE_KEYS, or SUPABASE_ANON_KEY is required");
}

/** Forwards the verified bearer token so RLS runs as the signed-in user. */
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("supabaseForUser requires a verified OAuth token");
  return createClient(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * The acting admin's user id. Needed for resources whose NOT NULL ownership
 * columns are stamped server-side (Doc Studio documents), which the model has
 * no way to supply. Unlike the Portal Copilot — which holds a service-role
 * client and knows the actor already — the MCP path only carries the caller's
 * token, so the identity has to be read back from it.
 */
export async function currentUserId(ctx: ToolContext): Promise<string | undefined> {
  const { data } = await supabaseForUser(ctx).auth.getUser();
  return data?.user?.id;
}

/**
 * Resolves the caller's financial-data capability so MCP tools gate financial
 * resources exactly like the Portal Copilot does. Fails closed on any error.
 */
export async function callerCanAccessFinancialData(ctx: ToolContext): Promise<{ canAccessFinancialData: boolean }> {
  try {
    const db = supabaseForUser(ctx);
    const { data: userData } = await db.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return { canAccessFinancialData: false };
    const { data, error } = await db.rpc("can_access_financial_data", { p_user_id: userId });
    if (error) return { canAccessFinancialData: false };
    return { canAccessFinancialData: data === true };
  } catch {
    return { canAccessFinancialData: false };
  }
}

export const notAuthenticated = {
  content: [{ type: "text" as const, text: "Not authenticated." }],
  isError: true as const,
};

export function ok(payload: unknown, structured?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: structured ?? { result: payload },
  };
}

export function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true as const };
}

export function likePattern(query: string) {
  return `%${query.replace(/[%_]/g, "")}%`;
}

/** Calls the admin-only Portal Copilot orchestrator with the MCP caller's OAuth token. */
export async function callPortalCopilot(ctx: ToolContext, body: Record<string, unknown>) {
  const token = ctx.getToken();
  if (!token) throw new Error("callPortalCopilot requires a verified OAuth token");
  const response = await fetch(`${supabaseProjectUrl()}/functions/v1/portal-copilot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabasePublishableKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : `Portal Copilot failed (${response.status})`);
  }
  return payload as Record<string, unknown>;
}
