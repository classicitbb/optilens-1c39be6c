import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";
import {
  buildErpPortalRolloutPlan,
  isErpPortalRolloutCommand,
  type CopilotCustomer,
  type CopilotMembership,
  type CopilotPersonContact,
} from "../_shared/copilot/portalRollout.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  allowMethods: "POST, OPTIONS",
});

type JsonRecord = Record<string, unknown>;

const jsonResponse = (req: Request, status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json" },
  });

const stringValue = (value: unknown, max = 10000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const renderInviteHtml = (payload: JsonRecord, actionLink: string) => {
  const customerName = escapeHtml(stringValue(payload.customerName, 220));
  const body = escapeHtml(stringValue(payload.body, 12000)).replaceAll("\n", "<br />");
  const safeLink = escapeHtml(actionLink);
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f4f2ed;font-family:Arial,sans-serif;color:#0b1e35"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden"><tr><td style="background:#0b1e35;color:#fff;padding:24px 28px;font-size:20px;font-weight:700">Classic Visions</td></tr><tr><td style="padding:30px 28px;font-size:15px;line-height:1.65"><p style="margin-top:0">${body}</p><p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;background:#1a8a9c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Set up portal access</a></p><p style="font-size:12px;color:#657080">This secure link is for ${customerName}. If the button does not work, contact Classic Visions support.</p></td></tr></table></td></tr></table></body></html>`;
};

const audit = async (
  db: any,
  actorUserId: string,
  eventType: string,
  fields: { runId?: string | null; actionId?: string | null; transcript?: string | null; metadata?: JsonRecord } = {},
) => {
  const { error } = await db.from("copilot_audit_events").insert({
    run_id: fields.runId ?? null,
    action_id: fields.actionId ?? null,
    actor_user_id: actorUserId,
    event_type: eventType,
    transcript: fields.transcript ?? null,
    metadata: fields.metadata ?? {},
  });
  if (error) throw error;
};

const classifyWithClaude = async (command: string, configuredModel?: unknown): Promise<boolean> => {
  if (isErpPortalRolloutCommand(command)) return true;
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();
  const model = stringValue(configuredModel, 160) || Deno.env.get("PORTAL_COPILOT_CLAUDE_MODEL")?.trim();
  if (!apiKey || !model) return false;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 80,
      temperature: 0,
      system: "Classify an admin command. Return only ERP_PORTAL_ROLLOUT when it asks to identify ERP/Innovations customers without portal access and prepare onboarding actions. Otherwise return UNSUPPORTED.",
      messages: [{ role: "user", content: command }],
    }),
  });
  if (!response.ok) return false;
  const data = await response.json();
  const text = Array.isArray(data?.content)
    ? data.content.map((part: { text?: string }) => part?.text ?? "").join(" ")
    : "";
  return text.includes("ERP_PORTAL_ROLLOUT");
};

const createConversation = async (db: any, actorUserId: string, title = "New chat") => {
  const { data, error } = await db.from("copilot_conversations").insert({
    title: stringValue(title, 120) || "New chat",
    created_by: actorUserId,
  }).select("id,title,created_by,created_at,updated_at").single();
  if (error) throw error;
  return data;
};

const requireOwnedConversation = async (db: any, actorUserId: string, conversationId?: string) => {
  if (!conversationId) return createConversation(db, actorUserId);
  const { data, error } = await db.from("copilot_conversations")
    .select("id,title,created_by,created_at,updated_at")
    .eq("id", conversationId)
    .eq("created_by", actorUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Copilot conversation was not found");
  return data;
};

const touchConversation = async (db: any, conversationId: string, title?: string) => {
  const changes: JsonRecord = { updated_at: new Date().toISOString() };
  if (title) changes.title = stringValue(title, 120);
  const { error } = await db.from("copilot_conversations").update(changes).eq("id", conversationId);
  if (error) throw error;
};

const loadState = async (db: any, actorUserId: string, conversationId?: string, runId?: string) => {
  const { data: conversations, error: conversationsError } = await db
    .from("copilot_conversations")
    .select("id,title,created_by,created_at,updated_at")
    .eq("created_by", actorUserId)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (conversationsError) throw conversationsError;
  const selectedConversationId = conversationId && conversations?.some((conversation: { id: string }) => conversation.id === conversationId)
    ? conversationId
    : conversations?.[0]?.id;
  const { data: runs, error: runsError } = await db
    .from("copilot_runs")
    .select("id,conversation_id,workflow,command_text,input_mode,transcript,transcript_confirmed,autonomy_level,status,source_system,source_snapshot_at,summary,requested_by,created_at,updated_at")
    .eq("requested_by", actorUserId)
    .eq("conversation_id", selectedConversationId || "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: false })
    .limit(12);
  if (runsError) throw runsError;
  const selectedRunId = runId && runs?.some((run: { id: string }) => run.id === runId)
    ? runId
    : runs?.[0]?.id;
  let actions: unknown[] = [];
  let auditEvents: unknown[] = [];
  let messages: unknown[] = [];
  if (selectedConversationId) {
    const { data, error } = await db.from("copilot_messages")
      .select("id,conversation_id,role,content,attachments,created_at")
      .eq("conversation_id", selectedConversationId)
      .order("created_at");
    if (error) throw error;
    messages = data ?? [];
  }
  if (selectedRunId) {
    const [actionsResult, auditResult] = await Promise.all([
      db.from("copilot_actions")
        .select("id,run_id,customer_id,contact_id,action_type,risk_level,status,title,summary,payload,result,retry_count,last_error,approved_by,approved_at,executed_at,created_at,updated_at")
        .eq("run_id", selectedRunId)
        .order("created_at"),
      db.from("copilot_audit_events")
        .select("id,run_id,action_id,actor_user_id,event_type,transcript,metadata,created_at")
        .eq("run_id", selectedRunId)
        .order("created_at", { ascending: false }),
    ]);
    if (actionsResult.error) throw actionsResult.error;
    if (auditResult.error) throw auditResult.error;
    actions = actionsResult.data ?? [];
    auditEvents = auditResult.data ?? [];
  }
  const { data: settings, error: settingsError } = await db
    .from("copilot_workflow_settings")
    .select("workflow,provider,model,email_template_key,email_template_name,email_subject_pattern")
    .eq("workflow", "erp_portal_rollout")
    .maybeSingle();
  if (settingsError) throw settingsError;
  return {
    conversations: conversations ?? [],
    selectedConversationId: selectedConversationId ?? null,
    messages,
    runs: runs ?? [],
    selectedRunId: selectedRunId ?? null,
    actions,
    auditEvents,
    settings,
  };
};

const refreshRunStatus = async (db: any, runId: string) => {
  const { data, error } = await db.from("copilot_actions").select("status").eq("run_id", runId);
  if (error) throw error;
  const statuses = (data ?? []).map((row: { status: string }) => row.status);
  const hasOpen = statuses.some((status: string) => status === "pending_approval" || status === "executing");
  const hasFailure = statuses.some((status: string) => status === "failed" || status === "blocked");
  const hasCompleted = statuses.some((status: string) => status === "completed");
  const nextStatus = hasFailure ? "partial" : hasOpen ? "prepared" : hasCompleted ? "completed" : "rejected";
  const { error: updateError } = await db.from("copilot_runs").update({ status: nextStatus }).eq("id", runId);
  if (updateError) throw updateError;
};

const invokeFunction = async (req: Request, functionName: string, body: JsonRecord) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured");
  return fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("Authorization") ?? "",
      "x-admin-auth-token": req.headers.get("x-admin-auth-token") ?? "",
      Origin: req.headers.get("Origin") ?? "",
    },
    body: JSON.stringify(body),
  });
};

const provisionPortalAccount = async (req: Request, payload: JsonRecord) => {
  const response = await invokeFunction(req, "admin-user-management", {
    action: "invite-user",
    email: stringValue(payload.recipientEmail, 320),
    customerId: Number(payload.customerId),
    contactId: stringValue(payload.contactId, 80),
    displayName: stringValue(payload.recipientName, 160),
    sendEmail: false,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(stringValue(data?.error) || `Portal provisioning failed (${response.status})`);
  if (!stringValue(data?.actionLink)) throw new Error("Portal access was prepared, but no secure setup link was returned");
  return data as { userId?: string; actionLink: string; alreadyExisted?: boolean };
};

const queueInviteEmail = async (req: Request, payload: JsonRecord, actionLink: string) => {
  let lastError = "Email queue failed";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await invokeFunction(req, "docstudio-api/email/send", {
        to: [stringValue(payload.recipientEmail, 320)],
        subject: stringValue(payload.subject, 240),
        html: renderInviteHtml(payload, actionLink),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data?.ok) return { attempts: attempt, messageIds: data.messageIds ?? [] };
      lastError = stringValue(data?.error) || `Email queue failed (${response.status})`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Email queue failed";
    }
  }
  throw new Error(lastError);
};

const executeAction = async (req: Request, db: any, actorUserId: string, action: any) => {
  const payload = (action.payload ?? {}) as JsonRecord;
  if (action.action_type === "create_followup_task") {
    const taskContent = stringValue(payload.taskContent, 4000);
    const contactId = stringValue(payload.contactId, 80) || null;
    if (!taskContent) throw new Error("The follow-up task has no content");
    const markerContent = `${taskContent}\n\n[Copilot action ${action.id}]`;
    const { data: existing, error: existingError } = await db
      .from("activities")
      .select("id")
      .eq("content", markerContent)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return { activityId: existing.id, reused: true };
    const { data, error } = await db.from("activities").insert({
      contact_id: contactId,
      content: markerContent,
      type: "note",
      activity_type: "erp_portal_rollout_followup",
      status: "inbox",
      priority: "normal",
      created_by: actorUserId,
      owner_id: actorUserId,
    }).select("id").single();
    if (error) throw error;
    return { activityId: data.id, reused: false };
  }

  if (action.action_type === "send_portal_invite") {
    const provisioned = await provisionPortalAccount(req, payload);
    try {
      const email = await queueInviteEmail(req, payload, provisioned.actionLink);
      return {
        portalAccountCreated: true,
        userId: provisioned.userId ?? null,
        alreadyExisted: provisioned.alreadyExisted === true,
        emailQueued: true,
        emailAttempts: email.attempts,
        messageIds: email.messageIds,
      };
    } catch (error) {
      const failure = error instanceof Error ? error.message : "Email queue failed";
      const partial = new Error(failure) as Error & { partialResult?: JsonRecord };
      partial.partialResult = {
        portalAccountCreated: true,
        userId: provisioned.userId ?? null,
        alreadyExisted: provisioned.alreadyExisted === true,
        emailQueued: false,
        emailAttempts: 2,
      };
      throw partial;
    }
  }

  throw new Error(`Unsupported Copilot action: ${action.action_type}`);
};

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy);
  if (originBlocked) return originBlocked;
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "Method not allowed" });

  try {
    const auth = await requirePrivilegedAccess(req, corsHeaders, {
      allowedRoles: ["admin"],
      sourceFunction: "portal-copilot",
    });
    if (auth instanceof Response) return auth;
    const db = auth.supabaseAdminClient;
    const actorUserId = auth.user.id;
    const body = await req.json() as JsonRecord;
    const operation = stringValue(body.operation, 80);

    if (operation === "get-state") {
      return jsonResponse(req, 200, await loadState(
        db,
        actorUserId,
        stringValue(body.conversationId, 80) || undefined,
        stringValue(body.runId, 80) || undefined,
      ));
    }

    if (operation === "create-conversation") {
      const conversation = await createConversation(db, actorUserId);
      return jsonResponse(req, 200, await loadState(db, actorUserId, conversation.id));
    }

    if (operation === "prepare-erp-rollout") {
      const command = stringValue(body.command, 2000);
      const inputMode = body.inputMode === "voice" ? "voice" : "text";
      const transcriptConfirmed = body.transcriptConfirmed === true;
      if (!command) return jsonResponse(req, 400, { error: "Enter or speak a command first" });
      if (inputMode === "voice" && !transcriptConfirmed) {
        return jsonResponse(req, 400, { error: "Review and confirm the transcript before preparing actions" });
      }
      const { data: settings, error: settingsError } = await db
        .from("copilot_workflow_settings")
        .select("email_template_key,email_template_name,email_subject_pattern,provider,model")
        .eq("workflow", "erp_portal_rollout")
        .single();
      if (settingsError) throw settingsError;
      if (!(await classifyWithClaude(command, settings.model))) {
        return jsonResponse(req, 400, { error: "The MVP currently supports only ERP portal rollout commands" });
      }
      const conversation = await requireOwnedConversation(db, actorUserId, stringValue(body.conversationId, 80) || undefined);
      const isUntitled = conversation.title === "New chat";

      const [{ data: customers, error: customerError }, { data: contacts, error: contactError }, { data: memberships, error: membershipError }] = await Promise.all([
        db.from("customers").select("id,name,account_number,email,contact_id,innovations_customer_id").not("innovations_customer_id", "is", null).order("name"),
        db.from("contacts").select("id,name,email,parent_id,linked_customer_id,innovations_parent_customer_id,is_company,is_archived").eq("is_company", false).eq("is_archived", false).limit(10000),
        db.from("portal_account_memberships").select("customer_id,status").eq("status", "active"),
      ]);
      if (customerError) throw customerError;
      if (contactError) throw contactError;
      if (membershipError) throw membershipError;

      const plan = buildErpPortalRolloutPlan(
        (customers ?? []) as CopilotCustomer[],
        (contacts ?? []) as CopilotPersonContact[],
        (memberships ?? []) as CopilotMembership[],
        {
          templateKey: settings.email_template_key,
          templateName: settings.email_template_name,
          subjectPattern: settings.email_subject_pattern,
        },
      );
      const { data: run, error: runError } = await db.from("copilot_runs").insert({
        conversation_id: conversation.id,
        workflow: "erp_portal_rollout",
        command_text: command,
        input_mode: inputMode,
        transcript: inputMode === "voice" ? command : null,
        transcript_confirmed: inputMode === "voice" ? transcriptConfirmed : false,
        autonomy_level: 2,
        status: "preparing",
        source_system: "innovations_sync",
        source_snapshot_at: new Date().toISOString(),
        summary: { ...plan.counts, provider: settings.provider, model: settings.model ?? null },
        requested_by: actorUserId,
      }).select("id").single();
      if (runError) throw runError;
      const { error: messageError } = await db.from("copilot_messages").insert({
        conversation_id: conversation.id,
        role: "user",
        content: command,
      });
      if (messageError) throw messageError;

      if (plan.actions.length > 0) {
        const rows = plan.actions.map((planned) => ({
          run_id: run.id,
          customer_id: planned.customerId,
          contact_id: planned.contactId,
          action_type: planned.actionType,
          risk_level: planned.riskLevel,
          status: planned.status,
          title: planned.title,
          summary: planned.summary,
          payload: planned,
          idempotency_key: `${run.id}:${planned.actionType}:${planned.customerId}`,
        }));
        const { error: actionError } = await db.from("copilot_actions").insert(rows);
        if (actionError) throw actionError;
      }
      const nextStatus = plan.actions.length ? "prepared" : "completed";
      const { error: statusError } = await db.from("copilot_runs").update({ status: nextStatus }).eq("id", run.id);
      if (statusError) throw statusError;
      await audit(db, actorUserId, "erp_rollout_prepared", {
        runId: run.id,
        transcript: inputMode === "voice" ? command : null,
        metadata: { inputMode, transcriptConfirmed, source: "innovations_sync", counts: plan.counts },
      });
      await touchConversation(db, conversation.id, isUntitled ? command : undefined);
      return jsonResponse(req, 200, await loadState(db, actorUserId, conversation.id, run.id));
    }

    if (operation === "edit-action") {
      const actionId = stringValue(body.actionId, 80);
      const { data: action, error } = await db.from("copilot_actions").select("id,run_id,status,action_type,payload").eq("id", actionId).single();
      if (error) throw error;
      if (!action || !["pending_approval", "failed"].includes(action.status)) {
        return jsonResponse(req, 409, { error: "Only pending or failed actions can be edited" });
      }
      const payload = { ...(action.payload ?? {}) } as JsonRecord;
      if (action.action_type === "send_portal_invite") {
        const subject = stringValue(body.subject, 240);
        const emailBody = stringValue(body.body, 12000);
        if (!subject || !emailBody) return jsonResponse(req, 400, { error: "Subject and email body are required" });
        payload.subject = subject;
        payload.body = emailBody;
      } else {
        const taskContent = stringValue(body.taskContent, 4000);
        if (!taskContent) return jsonResponse(req, 400, { error: "Task content is required" });
        payload.taskContent = taskContent;
      }
      const { error: updateError } = await db.from("copilot_actions").update({ payload, last_error: null, status: "pending_approval" }).eq("id", actionId);
      if (updateError) throw updateError;
      await audit(db, actorUserId, "action_edited", { runId: action.run_id, actionId });
      await refreshRunStatus(db, action.run_id);
      const { data: run } = await db.from("copilot_runs").select("conversation_id").eq("id", action.run_id).single();
      return jsonResponse(req, 200, await loadState(db, actorUserId, run?.conversation_id, action.run_id));
    }

    if (operation === "decide-action") {
      const actionId = stringValue(body.actionId, 80);
      const decision = body.decision === "reject" ? "reject" : body.decision === "approve" ? "approve" : "";
      if (!actionId || !decision) return jsonResponse(req, 400, { error: "actionId and approve/reject decision are required" });
      const { data: action, error } = await db.from("copilot_actions").select("*").eq("id", actionId).single();
      if (error) throw error;
      if (!action || !["pending_approval", "failed"].includes(action.status)) {
        return jsonResponse(req, 409, { error: "This action is no longer waiting for a decision" });
      }

      if (decision === "reject") {
        const { error: rejectError } = await db.from("copilot_actions").update({ status: "rejected", approved_by: actorUserId, approved_at: new Date().toISOString() }).eq("id", actionId).eq("status", action.status);
        if (rejectError) throw rejectError;
        await audit(db, actorUserId, "action_rejected", { runId: action.run_id, actionId });
        await refreshRunStatus(db, action.run_id);
        const { data: run } = await db.from("copilot_runs").select("conversation_id").eq("id", action.run_id).single();
        return jsonResponse(req, 200, await loadState(db, actorUserId, run?.conversation_id, action.run_id));
      }

      const { data: claimed, error: claimError } = await db.from("copilot_actions").update({
        status: "executing",
        approved_by: actorUserId,
        approved_at: new Date().toISOString(),
        last_error: null,
      }).eq("id", actionId).eq("status", action.status).select("id").maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) return jsonResponse(req, 409, { error: "Another request already claimed this action" });
      await audit(db, actorUserId, "action_approved", { runId: action.run_id, actionId, metadata: { riskLevel: action.risk_level } });

      try {
        const result = await executeAction(req, db, actorUserId, action);
        const { error: completedError } = await db.from("copilot_actions").update({
          status: "completed",
          result,
          executed_at: new Date().toISOString(),
          last_error: null,
        }).eq("id", actionId);
        if (completedError) throw completedError;
        await audit(db, actorUserId, "action_completed", { runId: action.run_id, actionId, metadata: { result } });
      } catch (executionError) {
        const message = executionError instanceof Error ? executionError.message : "Action failed";
        const partialResult = (executionError as Error & { partialResult?: JsonRecord })?.partialResult ?? null;
        const { error: failedError } = await db.from("copilot_actions").update({
          status: "failed",
          result: partialResult,
          last_error: message,
          retry_count: Number(action.retry_count ?? 0) + 1,
        }).eq("id", actionId);
        if (failedError) throw failedError;
        await audit(db, actorUserId, "action_failed", { runId: action.run_id, actionId, metadata: { error: message, partialResult } });
      }
      await refreshRunStatus(db, action.run_id);
      const { data: run } = await db.from("copilot_runs").select("conversation_id").eq("id", action.run_id).single();
      return jsonResponse(req, 200, await loadState(db, actorUserId, run?.conversation_id, action.run_id));
    }

    if (operation === "analyze-attachments") {
      const message = stringValue(body.message, 4000);
      const rawAttachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 4) : [];
      if (rawAttachments.length === 0) return jsonResponse(req, 400, { error: "Attach a prescription or order file first" });

      const apiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
      if (!apiKey) return jsonResponse(req, 500, { error: "AI is not configured for this environment" });

      const content: JsonRecord[] = [{
        type: "text",
        text: message || "Read the attached prescription or order and summarise it for our team.",
      }];
      const names: string[] = [];
      for (const raw of rawAttachments as JsonRecord[]) {
        const name = stringValue(raw?.name, 200) || "attachment";
        const mimeType = stringValue(raw?.mimeType, 120) || "application/octet-stream";
        const text = stringValue(raw?.text, 20000);
        const data = typeof raw?.data === "string" ? raw.data : "";
        names.push(name);
        if (text) {
          content.push({ type: "text", text: `File: ${name}\n---\n${text}` });
        } else if (data && mimeType.startsWith("image/")) {
          content.push({ type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } });
        } else if (data && mimeType === "application/pdf") {
          content.push({ type: "file", file: { filename: name, file_data: `data:${mimeType};base64,${data}` } });
        }
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: [
            {
              role: "system",
              content: "You are the Classic Visions Portal Copilot assisting an internal admin. Read attached prescriptions, order forms or invoices and extract the key details: patient/customer, Rx values (sphere, cylinder, axis, add, PD, prism), lens type, material, coatings, quantities, and any special instructions. Present a short structured summary, then list anything missing or ambiguous that must be clarified before the order can be placed. Never invent prices, discounts, credit terms or delivery dates. If the file is unreadable, say so plainly.",
            },
            { role: "user", content },
          ],
        }),
      });
      if (aiResponse.status === 429) return jsonResponse(req, 429, { error: "AI rate limit reached. Try again shortly." });
      if (aiResponse.status === 402) return jsonResponse(req, 402, { error: "AI credits exhausted. Add credits to continue." });
      if (!aiResponse.ok) {
        const detail = await aiResponse.text().catch(() => "");
        return jsonResponse(req, 502, { error: `AI could not read the attachment (${aiResponse.status}). ${detail.slice(0, 300)}` });
      }
      const aiData = await aiResponse.json().catch(() => null);
      const reply = stringValue(aiData?.choices?.[0]?.message?.content, 20000);
      if (!reply) return jsonResponse(req, 502, { error: "AI returned an empty response" });

      const conversation = await requireOwnedConversation(db, actorUserId, stringValue(body.conversationId, 80) || undefined);
      const messageRows = [
        {
          conversation_id: conversation.id,
          role: "user",
          content: message,
          attachments: (rawAttachments as JsonRecord[]).map((attachment) => ({
            name: stringValue(attachment.name, 200) || "attachment",
            kind: stringValue(attachment.mimeType, 120).startsWith("image/") ? "image" : stringValue(attachment.mimeType, 120) === "application/pdf" ? "pdf" : "text",
          })),
        },
        { conversation_id: conversation.id, role: "assistant", content: reply, attachments: [] },
      ];
      const { error: messagesError } = await db.from("copilot_messages").insert(messageRows);
      if (messagesError) throw messagesError;
      await touchConversation(db, conversation.id, conversation.title === "New chat" ? message || names.join(", ") : undefined);

      await audit(db, actorUserId, "attachment_analyzed", {
        metadata: { files: names, hasMessage: message.length > 0 },
      });
      return jsonResponse(req, 200, await loadState(db, actorUserId, conversation.id));
    }

    return jsonResponse(req, 400, { error: "Unknown Copilot operation" });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal Copilot failed";
    return jsonResponse(req, 500, { error: message });
  }
});
