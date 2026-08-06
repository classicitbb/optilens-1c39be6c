import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy();

type ProposedAction = {
  recipe: "draft_customer_email" | "add_participant" | "create_follow_up" | "prepare_activity";
  config?: Record<string, unknown>;
};

serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy);
  if (originBlocked) return originBlocked;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let runId: string | null = null;
  let adminClient: ReturnType<typeof Object> | null = null;
  try {
    const auth = await requirePrivilegedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "operator"],
      sourceFunction: "crm-activity-automation",
    });
    if (auth instanceof Response) return auth;

    ({ runId } = await req.json());
    if (!runId) return json({ error: "runId is required" }, 400);
    const db = auth.supabaseAdminClient;
    adminClient = db;

    const { data: run, error: runError } = await db
      .from("activity_automation_runs")
      .select("id,activity_id,status,proposed_action,idempotency_key")
      .eq("id", runId)
      .single();
    if (runError || !run) return json({ error: "Automation run not found" }, 404);
    if (run.status === "completed") return json({ run, duplicate: true });
    if (run.status === "running") return json({ error: "Automation run is already executing" }, 409);
    if (run.status !== "approval_needed" && run.status !== "needs_attention") {
      return json({ error: `Automation run cannot execute from ${run.status}` }, 409);
    }

    const { data: claimed } = await db
      .from("activity_automation_runs")
      .update({ status: "running", approved_by: auth.user.id, approved_at: new Date().toISOString(), error: null })
      .eq("id", runId)
      .in("status", ["approval_needed", "needs_attention"])
      .select("id")
      .maybeSingle();
    if (!claimed) return json({ error: "Automation run was claimed by another request" }, 409);

    const { data: activity, error: activityError } = await db
      .from("activities")
      .select("id,activity_type,content,contact_id,opportunity_id,owner_id,task_channel,type")
      .eq("id", run.activity_id)
      .single();
    if (activityError || !activity) throw new Error("Source activity not found");

    const action = run.proposed_action as ProposedAction;
    const config = action.config ?? {};
    let result: Record<string, unknown>;

    if (action.recipe === "draft_customer_email") {
      if (!activity.contact_id) throw new Error("A linked contact is required to prepare an email draft");
      const { data: draft, error } = await db.from("outreach_outbox").insert({
        contact_id: activity.contact_id,
        channel: "email",
        subject: String(config.subject || `Following up: ${activity.activity_type}`),
        body: String(config.body || activity.content || "Prepared follow-up — review and personalize before sending."),
        status: "draft",
        generated_by: "crm_focus_desk",
        attachments: [{ source_activity_id: activity.id, automation_run_id: run.id }],
      }).select("id,status").single();
      if (error) throw error;
      result = { outreach_outbox_id: draft.id, status: draft.status };
    } else if (action.recipe === "add_participant") {
      const userId = String(config.user_id || "");
      const role = config.role === "follower" ? "follower" : "helper";
      if (!userId) throw new Error("A staff user is required");
      const { error } = await db.from("activity_participants").upsert(
        { activity_id: activity.id, user_id: userId, role, added_by: auth.user.id },
        { onConflict: "activity_id,user_id,role", ignoreDuplicates: true },
      );
      if (error) throw error;
      result = { participant_user_id: userId, role };
    } else {
      const delayDays = Math.max(0, Number(config.delay_days ?? 3));
      const dueAt = new Date(Date.now() + delayDays * 86_400_000).toISOString();
      const isFollowUp = action.recipe === "create_follow_up";
      const { data: created, error } = await db.from("activities").insert({
        activity_type: String(config.title || (isFollowUp ? `Follow up: ${activity.activity_type}` : `Prepare: ${activity.activity_type}`)),
        content: String(config.notes || `Created from ${activity.activity_type}`),
        due_at: dueAt,
        contact_id: activity.contact_id,
        opportunity_id: activity.opportunity_id,
        owner_id: String(config.owner_id || activity.owner_id || auth.user.id),
        created_by: auth.user.id,
        status: "planned",
        priority: String(config.priority || "normal"),
        task_channel: activity.task_channel,
        type: isFollowUp ? activity.type : String(config.type || "note"),
      }).select("id").single();
      if (error) throw error;
      result = { created_activity_id: created.id, due_at: dueAt };
    }

    const { data: completed, error: completeError } = await db
      .from("activity_automation_runs")
      .update({ status: "completed", executed_at: new Date().toISOString(), result })
      .eq("id", runId)
      .eq("status", "running")
      .select("*")
      .single();
    if (completeError) throw completeError;
    return json({ run: completed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown automation error";
    if (runId && adminClient && "from" in adminClient) {
      try {
        await (adminClient as any).from("activity_automation_runs")
          .update({ status: "needs_attention", error: message }).eq("id", runId).eq("status", "running");
      } catch { /* Preserve the original failure. */ }
    }
    return json({ error: message }, 500);
  }
});
