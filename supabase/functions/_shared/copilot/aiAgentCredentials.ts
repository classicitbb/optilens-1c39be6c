// Resolves Portal Copilot's Claude credentials, preferring the admin-managed
// key stored via /admin/settings/integrations (see supabase/migrations/
// 20260818120000_ai_agent_secret_store.sql) over the ANTHROPIC_API_KEY /
// PORTAL_COPILOT_CLAUDE_MODEL Supabase Edge Function secrets, which remain a
// fallback for environments where the DB-managed key hasn't been set up yet.

const stringValue = (value: unknown, max = 500) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export type ClaudeCredentials = { apiKey: string; model: string };

export const resolveClaudeCredentials = async (db: any, fallbackModel?: unknown): Promise<ClaudeCredentials> => {
  const { data, error } = await db.rpc("get_ai_agent_credentials", { p_provider: "anthropic" });
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data;
    const apiKey = stringValue(row?.api_key, 400);
    if (row?.enabled === true && apiKey) {
      const model = stringValue(row?.model, 160) || stringValue(fallbackModel, 160) || Deno.env.get("PORTAL_COPILOT_CLAUDE_MODEL")?.trim() || "";
      return { apiKey, model };
    }
  }
  return {
    apiKey: Deno.env.get("ANTHROPIC_API_KEY")?.trim() || "",
    model: stringValue(fallbackModel, 160) || Deno.env.get("PORTAL_COPILOT_CLAUDE_MODEL")?.trim() || "",
  };
};
