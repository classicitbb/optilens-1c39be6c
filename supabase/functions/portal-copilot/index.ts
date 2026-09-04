import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";
import {
  buildErpPortalRolloutPlan,
  type CopilotCustomer,
  type CopilotMembership,
  type CopilotPersonContact,
} from "../_shared/copilot/portalRollout.ts";
import {
  buildQualifiedCrmPlan,
  type CrmActivitySignal,
  type CrmOpportunitySignal,
  type CrmOrderHealth,
  type CrmScanContact,
} from "../_shared/copilot/crmOpportunityScan.ts";
import { PLATFORM_ROUTES } from "../_shared/copilot/platformFacts.generated.ts";
import { LOOKUP_TOOLS, LOOKUP_TOOL_NAMES, dispatchLookupTool } from "../_shared/copilot/lookupTools.ts";
import { ADMIN_RESOURCE_TOOLS, ADMIN_RESOURCE_TOOL_NAMES, dispatchAdminResourceTool } from "../_shared/copilot/adminResources.ts";
import { DOC_STUDIO_TOOLS, DOC_STUDIO_TOOL_NAMES, dispatchDocStudioTool } from "../_shared/copilot/docStudioTools.ts";
import { PLATFORM_TOOLS, PLATFORM_TOOL_NAMES, dispatchPlatformTool } from "../_shared/copilot/platformTools.ts";
import { ENRICHMENT_TOOLS, ENRICHMENT_TOOL_NAMES, dispatchEnrichmentTool } from "../_shared/copilot/enrichmentTools.ts";
import { resolveClaudeCredentials } from "../_shared/copilot/aiAgentCredentials.ts";
import { identityPreamble } from "../_shared/aiIdentity.ts";
import { ADMIN_COPILOT_SYSTEM_PROMPT } from "../_shared/copilot/prompts.ts";

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

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const callClaude = (apiKey: string, model: string, body: JsonRecord) =>
  fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, ...body }),
  });

const claudeErrorMessage = async (response: Response) => {
  if (response.status === 429) return "AI rate limit reached. Try again shortly.";
  if (response.status === 529) return "AI is temporarily overloaded. Try again shortly.";
  const data = await response.json().catch(() => null) as JsonRecord | null;
  const errorObject = (data?.error ?? null) as JsonRecord | null;
  const detail = stringValue(errorObject?.message, 300);
  return detail ? `AI request failed (${response.status}). ${detail}` : `AI request failed (${response.status}).`;
};

const claudeTextFromContent = (content: unknown) =>
  Array.isArray(content)
    ? (content as JsonRecord[]).map((block) => block?.type === "text" ? stringValue(block.text, 20000) : "").join("").trim()
    : "";

const ROUTER_TOOLS = [
  {
    name: "start_erp_portal_rollout",
    description: "Start the ERP portal rollout workflow. Call this when the admin asks to identify ERP/Innovations customers who do not yet have Classic Visions portal access and prepare onboarding or invitation actions for them — for example \"roll out portal access to ERP customers\" or \"prepare portal invitations for Innovations customers without logins\". Do not call this for questions about existing portal accounts or anything unrelated to preparing new ERP customer invitations.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "start_crm_opportunity_scan",
    description: "Start the qualified CRM opportunity scan workflow. Call this when the admin asks to find lapsed buyers, overdue follow-ups, incomplete contact details, or qualified CRM follow-up opportunities across pipeline contacts — for example \"scan CRM for lapsed buyers\" or \"find qualified follow-up opportunities\". Do not call this for ERP portal access requests or general questions.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
] as const;

const COPILOT_SYSTEM_PROMPT = ADMIN_COPILOT_SYSTEM_PROMPT;

const WORKFLOW_BY_TOOL_NAME: Record<string, "erp_portal_rollout" | "crm_opportunity_scan"> = {
  start_erp_portal_rollout: "erp_portal_rollout",
  start_crm_opportunity_scan: "crm_opportunity_scan",
};

const COPILOT_TOOLS = [...ROUTER_TOOLS, ...LOOKUP_TOOLS, ...ADMIN_RESOURCE_TOOLS, ...DOC_STUDIO_TOOLS, ...PLATFORM_TOOLS, ...ENRICHMENT_TOOLS];
const MAX_LOOKUP_ITERATIONS = 8;

type RouteResult =
  | { kind: "workflow"; workflow: "erp_portal_rollout" | "crm_opportunity_scan" }
  | { kind: "reply"; text: string; runId?: string | null };

const runCopilotTurn = async (
  apiKey: string,
  model: string,
  command: string,
  history: { role: "user" | "assistant"; content: string }[],
  db: any,
  actorUserId: string,
  canAccessFinancialData: boolean,
  sendEmail: (payload: { to: string[]; subject: string; html: string }) => Promise<{ messageIds?: string[] }>,
  pageContext: string | null = null,
): Promise<{ ok: true; result: RouteResult } | { ok: false; status: number; message: string }> => {
  const messages: JsonRecord[] = [...history.slice(-12), { role: "user", content: command }];
  // Set when a tool queues durable approval cards, so the reply can show them.
  let preparedRunId: string | null = null;
  // Appended to the system prompt, never to the user message, so the stored
  // conversation keeps the admin's literal words.
  const system = pageContext ? `${COPILOT_SYSTEM_PROMPT}

${pageContext}` : COPILOT_SYSTEM_PROMPT;

  for (let iteration = 0; iteration < MAX_LOOKUP_ITERATIONS; iteration += 1) {
    const response = await callClaude(apiKey, model, {
      max_tokens: 1024,
      system,
      tools: COPILOT_TOOLS,
      tool_choice: { type: "auto" },
      messages,
    });
    if (!response.ok) return { ok: false, status: response.status, message: await claudeErrorMessage(response) };
    const data = await response.json().catch(() => null) as JsonRecord | null;
    const blocks: JsonRecord[] = Array.isArray(data?.content) ? (data?.content as JsonRecord[]) : [];
    const toolUses = blocks.filter((block) => block?.type === "tool_use");

    const workflowUse = toolUses.find((use) => WORKFLOW_BY_TOOL_NAME[use.name as string]);
    if (workflowUse) {
      // Short-circuit into the deterministic planner. Any lookups made earlier
      // in this turn are discarded — the planners read fresh data themselves
      // and don't consume conversation history.
      return { ok: true, result: { kind: "workflow", workflow: WORKFLOW_BY_TOOL_NAME[workflowUse.name as string] } };
    }

    const lookupUses = toolUses.filter((use) =>
      LOOKUP_TOOL_NAMES.has(use.name as any)
      || ADMIN_RESOURCE_TOOL_NAMES.has(use.name as any)
      || DOC_STUDIO_TOOL_NAMES.has(use.name as any)
      || PLATFORM_TOOL_NAMES.has(use.name as any)
      || ENRICHMENT_TOOL_NAMES.has(use.name as any));
    if (lookupUses.length === 0) {
      const text = claudeTextFromContent(blocks);
      return { ok: true, result: { kind: "reply", text: text || "I'm not sure how to help with that yet — could you rephrase?", runId: preparedRunId } };
    }

    const toolResults = await Promise.all(lookupUses.map(async (use) => {
      try {
        const input = (use.input ?? {}) as Record<string, unknown>;
        const output = PLATFORM_TOOL_NAMES.has(use.name as any)
          ? dispatchPlatformTool(use.name as string, input)
          : ENRICHMENT_TOOL_NAMES.has(use.name as any)
          ? await dispatchEnrichmentTool(db, use.name as string, input, actorUserId)
          : DOC_STUDIO_TOOL_NAMES.has(use.name as any)
          ? await dispatchDocStudioTool(db, use.name as string, input, actorUserId, { sendEmail })
          : ADMIN_RESOURCE_TOOL_NAMES.has(use.name as any)
          ? await dispatchAdminResourceTool(db, use.name as string, input, actorUserId, { canAccessFinancialData })
          : await dispatchLookupTool(db, use.name as string, input);
        const queuedRunId = (output as { runId?: unknown } | null)?.runId;
        if (typeof queuedRunId === "string") preparedRunId = queuedRunId;
        return { type: "tool_result", tool_use_id: use.id, content: JSON.stringify(output) };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Lookup failed";
        return { type: "tool_result", tool_use_id: use.id, content: message, is_error: true };
      }
    }));
    messages.push({ role: "assistant", content: blocks });
    messages.push({ role: "user", content: toolResults });
  }

  // Iteration cap reached — force one final best-effort answer from whatever
  // was gathered rather than looping forever or erroring.
  const finalResponse = await callClaude(apiKey, model, {
    max_tokens: 1024,
    system,
    messages,
  });
  if (!finalResponse.ok) return { ok: false, status: finalResponse.status, message: await claudeErrorMessage(finalResponse) };
  const finalData = await finalResponse.json().catch(() => null) as JsonRecord | null;
  const finalText = claudeTextFromContent(finalData?.content);
  return { ok: true, result: { kind: "reply", text: finalText || "I gathered some information but couldn't finish putting together an answer — could you narrow your question?", runId: preparedRunId } };
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

const loadConversationMessages = async (db: any, conversationId: string) => {
  const { data, error } = await db.from("copilot_messages")
    .select("role,content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).reverse() as { role: "user" | "assistant"; content: string }[];
};

const loadState = async (db: any, actorUserId: string, conversationId?: string, runId?: string | null) => {
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
  // The conversation is the primary view. A null runId is used after a normal
  // chat turn so the thread does not snap back to an older workflow review.
  const selectedRunId = runId === null
    ? undefined
    : runId && runs?.some((run: { id: string }) => run.id === runId)
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
  if (action.action_type === "apply_contact_enrichment") {
    const contactId = stringValue(payload.contactId, 80);
    const findings = Array.isArray(payload.findings) ? payload.findings as JsonRecord[] : [];
    const findingIds = findings
      .map((finding) => stringValue(finding.findingId, 80))
      .filter((id) => id.length > 0);
    if (!contactId || !findingIds.length) throw new Error("This enrichment proposal has no fields to apply");
    // apply_contact_enrichment is the only writer allowed past the
    // preserve-populated-fields trigger, so approved corrections actually land.
    const { data, error } = await db.rpc("apply_contact_enrichment", {
      p_contact_id: contactId,
      p_finding_ids: findingIds,
    });
    if (error) throw new Error(error.message);
    return { contactId, fieldsApplied: data ?? 0, fields: findings.map((finding) => stringValue(finding.field, 60)) };
  }

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
    const priority = ["urgent", "high", "normal", "low"].includes(stringValue(payload.priority, 20))
      ? stringValue(payload.priority, 20)
      : "normal";
    const dueAtText = stringValue(payload.dueAt, 80);
    const dueAt = dueAtText && !Number.isNaN(Date.parse(dueAtText)) ? new Date(dueAtText).toISOString() : null;
    const isCrmSuggestion = stringValue(payload.reasonCode, 80).length > 0;
    const { data, error } = await db.from("activities").insert({
      contact_id: contactId,
      opportunity_id: stringValue(payload.opportunityId, 80) || null,
      content: markerContent,
      type: "note",
      task_channel: "todo",
      activity_type: isCrmSuggestion ? "crm_opportunity_suggestion" : "erp_portal_rollout_followup",
      status: "inbox",
      priority,
      due_at: dueAt,
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

  if (action.action_type === "send_docstudio_email") {
    const recipients = Array.isArray(payload.recipients) ? payload.recipients.map((entry) => stringValue(entry, 320)) : [];
    const subject = stringValue(payload.subject, 240);
    const html = stringValue(payload.body, 500000);
    if (!recipients.length) throw new Error("The approved send has no recipients");
    if (!html) throw new Error("The approved send has no document body");
    // docstudio-api/email/send owns the unsubscribe token and the send log, so
    // routing through it keeps this path identical to every other sender.
    const response = await invokeFunction(req, "docstudio-api/email/send", { to: recipients, subject, html });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) {
      throw new Error(stringValue(data?.error) || `Document send failed (${response.status})`);
    }
    return {
      documentId: stringValue(payload.documentId, 80),
      recipients,
      emailQueued: true,
      messageIds: data.messageIds ?? [],
    };
  }

  throw new Error(`Unsupported Copilot action: ${action.action_type}`);
};

const prepareCrmOpportunityScan = async (
  db: any,
  actorUserId: string,
  command: string,
  inputMode: "text" | "voice",
  transcriptConfirmed: boolean,
  conversationId?: string,
) => {
  const conversation = await requireOwnedConversation(db, actorUserId, conversationId);
  const [{ data: contacts, error: contactsError }, { data: health, error: healthError }, { data: opportunities, error: opportunitiesError }, { data: activities, error: activitiesError }] = await Promise.all([
    db.from("contacts")
      .select("id,name,business_name,email,phone,pipeline,stage,next_action_at,lead_score,is_company,is_archived")
      .not("pipeline", "is", null)
      .eq("is_archived", false)
      .limit(5000),
    db.from("customer_order_health")
      .select("contact_id,last_order_date,quiet_days,avg_gap_days,orders_last_30_days,health")
      .limit(5000),
    db.from("opportunities").select("id,contact_id,title,stage").limit(5000),
    db.from("activities")
      .select("contact_id,status")
      .in("status", ["open", "pending", "inbox", "planned", "in_progress", "waiting"])
      .limit(10000),
  ]);
  if (contactsError) throw contactsError;
  if (healthError) throw healthError;
  if (opportunitiesError) throw opportunitiesError;
  if (activitiesError) throw activitiesError;

  const plan = buildQualifiedCrmPlan(
    (contacts ?? []) as CrmScanContact[],
    (health ?? []) as CrmOrderHealth[],
    (opportunities ?? []) as CrmOpportunitySignal[],
    (activities ?? []) as CrmActivitySignal[],
    new Date(),
  );
  const { data: run, error: runError } = await db.from("copilot_runs").insert({
    conversation_id: conversation.id,
    workflow: "crm_opportunity_scan",
    command_text: command,
    input_mode: inputMode,
    transcript: inputMode === "voice" ? command : null,
    transcript_confirmed: inputMode === "voice" ? transcriptConfirmed : false,
    autonomy_level: 2,
    status: "preparing",
    source_system: "crm_order_activity",
    source_snapshot_at: new Date().toISOString(),
    summary: plan.counts,
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
    const { error: actionError } = await db.from("copilot_actions").insert(plan.actions.map((planned) => ({
      run_id: run.id,
      customer_id: null,
      contact_id: planned.contactId,
      action_type: planned.actionType,
      risk_level: planned.riskLevel,
      status: planned.status,
      title: planned.title,
      summary: planned.summary,
      payload: { ...planned, suggestedOwnerId: actorUserId },
      idempotency_key: `${run.id}:${planned.reasonCode}:${planned.contactId}`,
    })));
    if (actionError) throw actionError;
  }

  const nextStatus = plan.actions.length ? "prepared" : "completed";
  const { error: statusError } = await db.from("copilot_runs").update({ status: nextStatus }).eq("id", run.id);
  if (statusError) throw statusError;
  await audit(db, actorUserId, "crm_opportunity_scan_prepared", {
    runId: run.id,
    transcript: inputMode === "voice" ? command : null,
    metadata: { inputMode, transcriptConfirmed, source: "crm_order_activity", counts: plan.counts },
  });
  await touchConversation(db, conversation.id, conversation.title === "New chat" ? command : undefined);
  return loadState(db, actorUserId, conversation.id, run.id);
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
    const { data: canAccessFinancialData, error: financialAccessError } = await db.rpc("can_access_financial_data", {
      p_user_id: actorUserId,
    });
    if (financialAccessError) throw new Error(`Unable to resolve financial-data access: ${financialAccessError.message}`);
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

    if (operation === "prepare-erp-rollout" || operation === "submit-command") {
      const command = stringValue(body.command, 2000);
      const inputMode = body.inputMode === "voice" ? "voice" : "text";
      const transcriptConfirmed = body.transcriptConfirmed === true;
      // The page the admin is looking at. Client-supplied, so it is resolved
      // through the generated route table and never interpolated raw.
      const requestedPageSlug = stringValue(body.pageContext, 120);
      const currentRoute = requestedPageSlug
        ? PLATFORM_ROUTES.find((route) => route.slug === requestedPageSlug)
        : undefined;
      const pageContext = currentRoute
        ? `The admin is currently viewing "${currentRoute.label}" (${currentRoute.path}) in the ${currentRoute.module} module. When their question is ambiguous, prefer this page's data and terminology, and say so if you answer about something else.`
        : null;
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
      const requestedConversationId = stringValue(body.conversationId, 80) || undefined;
      const existingConversation = requestedConversationId
        ? await requireOwnedConversation(db, actorUserId, requestedConversationId)
        : null;
      const history = existingConversation ? await loadConversationMessages(db, existingConversation.id) : [];

      const { apiKey: claudeApiKey, model: claudeModel } = await resolveClaudeCredentials(db, settings.model);
      const routed = claudeApiKey && claudeModel ? await runCopilotTurn(claudeApiKey, claudeModel, command, history, db, actorUserId, canAccessFinancialData === true, async (payload) => {
        const response = await invokeFunction(req, "docstudio-api/email/send", payload);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok) throw new Error(stringValue(data?.error) || `Email send failed (${response.status})`);
        return { messageIds: data.messageIds ?? [] };
      }, pageContext) : null;
      if (routed && !routed.ok) {
        const status = routed.status === 429 || routed.status === 529 ? routed.status : 502;
        return jsonResponse(req, status, { error: routed.message });
      }
      const route = routed?.result ?? null;

      if (route?.kind === "workflow" && route.workflow === "crm_opportunity_scan") {
        return jsonResponse(req, 200, await prepareCrmOpportunityScan(
          db,
          actorUserId,
          command,
          inputMode,
          transcriptConfirmed,
          requestedConversationId,
        ));
      }

      if (!route || route.kind === "reply") {
        // Not a recognized workflow — answer as a normal chat turn instead of failing.
        const chatConversation = existingConversation ?? await requireOwnedConversation(db, actorUserId);
        const reply = route?.kind === "reply"
          ? route.text
          : "AI chat is not configured in this environment. Set ANTHROPIC_API_KEY and PORTAL_COPILOT_CLAUDE_MODEL to enable it.";
        const { error: chatMessagesError } = await db.from("copilot_messages").insert([
          { conversation_id: chatConversation.id, role: "user", content: command, attachments: [] },
          { conversation_id: chatConversation.id, role: "assistant", content: reply, attachments: [] },
        ]);
        if (chatMessagesError) throw chatMessagesError;
        await touchConversation(db, chatConversation.id, chatConversation.title === "New chat" ? command : undefined);
        // A tool may have queued approval cards on a run that had no
        // conversation yet. Attach it now, or loadState cannot see it.
        const queuedRunId = route?.kind === "reply" ? route.runId ?? null : null;
        if (queuedRunId) {
          await db.from("copilot_runs").update({ conversation_id: chatConversation.id }).eq("id", queuedRunId);
          await audit(db, actorUserId, "crm_enrichment_queued", { runId: queuedRunId });
        }
        return jsonResponse(req, 200, await loadState(db, actorUserId, chatConversation.id, queuedRunId));
      }

      // route.kind === "workflow" && route.workflow === "erp_portal_rollout"
      const conversation = await requireOwnedConversation(db, actorUserId, requestedConversationId);
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
      if (action.action_type === "apply_contact_enrichment") {
        // Enrichment findings are sourced evidence, not a draft. Editing them
        // would break the link to the recorded provenance.
        return jsonResponse(req, 400, { error: "Enrichment findings cannot be edited. Approve or reject them as found." });
      }
      if (action.action_type === "send_portal_invite" || action.action_type === "send_docstudio_email") {
        const subject = stringValue(body.subject, 240);
        const emailBody = stringValue(body.body, 500000);
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
        if (action.action_type === "apply_contact_enrichment") {
          // Otherwise the findings stay pending_review and the nightly sweep
          // keeps re-proposing what an admin has already turned down.
          const rejectedFindingIds = (Array.isArray(action.payload?.findings) ? action.payload.findings as JsonRecord[] : [])
            .map((finding) => stringValue(finding.findingId, 80))
            .filter((id) => id.length > 0);
          if (rejectedFindingIds.length) {
            await db.from("contact_enrichment_findings").update({ disposition: "rejected" }).in("id", rejectedFindingIds);
          }
        }
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

      const { apiKey, model } = await resolveClaudeCredentials(db);
      if (!apiKey || !model) return jsonResponse(req, 500, { error: "AI is not configured for this environment" });

      // Attachments are placed before the text instruction — Claude reads documents/images more
      // reliably when they precede the prompt that references them.
      const content: JsonRecord[] = [];
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
          content.push({ type: "image", source: { type: "base64", media_type: mimeType, data } });
        } else if (data && mimeType === "application/pdf") {
          content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
        }
      }
      content.push({
        type: "text",
        text: message || "Read the attached prescription or order and summarise it for our team.",
      });

      const aiResponse = await callClaude(apiKey, model, {
        max_tokens: 2048,
        system: `${identityPreamble("admin document analysis")}\n\nYour role in this workspace:\n- Read attached prescriptions, order forms or invoices and extract the key details: patient/customer, Rx values (sphere, cylinder, axis, add, PD, prism), lens type, material, coatings, quantities, and any special instructions.\n- Present a short structured summary, then list anything missing or ambiguous that must be clarified before the order can be placed.\n- If the file is unreadable, say so plainly.`,
        messages: [{ role: "user", content }],
      });
      if (!aiResponse.ok) {
        const status = aiResponse.status === 429 || aiResponse.status === 529 ? aiResponse.status : 502;
        return jsonResponse(req, status, { error: await claudeErrorMessage(aiResponse) });
      }
      const aiData = await aiResponse.json().catch(() => null) as JsonRecord | null;
      const reply = claudeTextFromContent(aiData?.content);
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
      return jsonResponse(req, 200, await loadState(db, actorUserId, conversation.id, null));
    }

    if (operation === "test-ai-agent") {
      const recordTest = async (success: boolean, errorMessage: string | null) => {
        const { error: recordError } = await db.rpc("record_ai_agent_test", {
          p_provider: "anthropic",
          p_success: success,
          p_error_message: errorMessage,
        });
        // Never fail the test request just because the audit write failed.
        if (recordError) console.warn("record_ai_agent_test failed", recordError.message ?? recordError);
      };

      const { apiKey, model } = await resolveClaudeCredentials(db);
      if (!apiKey || !model) {
        const message = "No API key or model is configured.";
        await recordTest(false, message);
        return jsonResponse(req, 200, { ok: false, error: message });
      }
      try {
        const response = await callClaude(apiKey, model, {
          max_tokens: 8,
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
        });
        const success = response.ok;
        const errorMessage = success ? null : await claudeErrorMessage(response);
        await recordTest(success, errorMessage);
        return jsonResponse(req, 200, { ok: success, error: errorMessage ?? undefined });
      } catch (providerError) {
        const errorMessage = providerError instanceof Error ? providerError.message : "Provider request failed";
        await recordTest(false, errorMessage);
        return jsonResponse(req, 200, { ok: false, error: errorMessage });
      }
    }

    return jsonResponse(req, 400, { error: "Unknown Copilot operation" });

  } catch (error) {
    const detail = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : JSON.stringify(error);
    console.error("portal-copilot failed", detail);
    return jsonResponse(req, 500, { error: detail || "Portal Copilot failed" });
  }
});

