// Resolves AI provider credentials, preferring the admin-managed key stored via
// /admin/settings/integrations (see supabase/migrations/
// 20260818120000_ai_agent_secret_store.sql) over Edge Function secrets, which
// remain a fallback for environments where the DB-managed key isn't set up.

const stringValue = (value: unknown, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export type ClaudeCredentials = { apiKey: string; model: string };
export type ProviderCredentials = { apiKey: string; model: string; source: "settings" | "env" | "none" };

const ENV_FALLBACK: Record<string, { key: string; model: string }> = {
  anthropic: { key: "ANTHROPIC_API_KEY", model: "PORTAL_COPILOT_CLAUDE_MODEL" },
  openai: { key: "OPENAI_API_KEY", model: "CRM_RESEARCH_OPENAI_MODEL" },
};

export const resolveProviderCredentials = async (
  db: any,
  provider: "anthropic" | "openai",
  fallbackModel?: unknown,
): Promise<ProviderCredentials> => {
  const env = ENV_FALLBACK[provider];
  const envModel = Deno.env.get(env.model)?.trim() || "";
  const { data, error } = await db.rpc("get_ai_agent_credentials", { p_provider: provider });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    const apiKey = stringValue(row?.api_key, 400);
    if (row?.enabled === true && apiKey) {
      return { apiKey, model: stringValue(row?.model, 160) || stringValue(fallbackModel, 160) || envModel, source: "settings" };
    }
  }
  const apiKey = Deno.env.get(env.key)?.trim() || "";
  return { apiKey, model: stringValue(fallbackModel, 160) || envModel, source: apiKey ? "env" : "none" };
};

export const resolveClaudeCredentials = async (db: any, fallbackModel?: unknown): Promise<ClaudeCredentials> => {
  const { apiKey, model } = await resolveProviderCredentials(db, "anthropic", fallbackModel);
  return { apiKey, model };
};
