import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, notAuthenticated, ok } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description:
    "Return the signed-in Classic Visions user's id, email, roles, portal profile and linked customer accounts. Call this first to understand what the caller can access.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const [{ data: roles }, { data: profile }, { data: memberships }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("profiles")
        .select("full_name,display_name,organization_name,portal_access_status,crm_customer_id,crm_contact_id,email")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.rpc("get_portal_account_memberships").then((r) => r, () => ({ data: null })),
    ]);
    const summary = {
      user_id: userId,
      email: ctx.getUserEmail(),
      roles: (roles ?? []).map((r: { role: string }) => r.role),
      profile: profile ?? null,
      accounts: memberships ?? null,
    };
    return ok(summary, summary);
  },
});
