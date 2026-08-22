import { supabase } from "@/integrations/supabase/client";

export type CopilotRun = {
  id: string;
  conversation_id: string | null;
  workflow: "erp_portal_rollout" | "crm_opportunity_scan";
  command_text: string;
  input_mode: "text" | "voice";
  transcript: string | null;
  transcript_confirmed: boolean;
  autonomy_level: number;
  status: "preparing" | "prepared" | "partial" | "completed" | "failed" | "rejected";
  source_system: string;
  source_snapshot_at: string;
  summary: {
    erpCustomers?: number;
    alreadyActive?: number;
    invitationsReady?: number;
    followUpsNeeded?: number;
    provider?: string;
    model?: string | null;
    contactsReviewed?: number;
    orderSignalsReviewed?: number;
    suggestionsPrepared?: number;
    lapsedBuyers?: number;
    overdueNextActions?: number;
    missingContactDetails?: number;
    noActiveOpportunity?: number;
  };
  requested_by: string;
  created_at: string;
  updated_at: string;
};

export type CopilotConversation = {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CopilotMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  attachments: { name: string; kind: "image" | "text" | "pdf" }[];
  created_at: string;
};

export type CopilotActionPayload = {
  customerId?: number;
  contactId?: string | null;
  customerName?: string;
  accountNumber?: string | null;
  recipientEmail?: string;
  recipientName?: string;
  subject?: string;
  body?: string;
  templateKey?: string;
  templateName?: string;
  taskContent?: string;
  opportunityId?: string | null;
  reasonCode?: "lapsed_buyer" | "overdue_next_action" | "missing_contact_details" | "no_active_opportunity";
  priority?: "urgent" | "high" | "normal";
  dueAt?: string;
  evidence?: string[];
  inference?: string;
  recommendedNextAction?: string;
  outreachDraft?: string;
  suggestedOwnerId?: string;
};

export type CopilotAction = {
  id: string;
  run_id: string;
  customer_id: number | null;
  contact_id: string | null;
  action_type: "send_portal_invite" | "create_followup_task";
  risk_level: number;
  status: "pending_approval" | "executing" | "completed" | "failed" | "rejected" | "blocked";
  title: string;
  summary: string;
  payload: CopilotActionPayload;
  result: Record<string, unknown> | null;
  retry_count: number;
  last_error: string | null;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CopilotAuditEvent = {
  id: string;
  run_id: string | null;
  action_id: string | null;
  actor_user_id: string | null;
  event_type: string;
  transcript: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CopilotState = {
  conversations: CopilotConversation[];
  selectedConversationId: string | null;
  messages: CopilotMessage[];
  runs: CopilotRun[];
  selectedRunId: string | null;
  actions: CopilotAction[];
  auditEvents: CopilotAuditEvent[];
  settings: {
    workflow: string;
    provider: "claude";
    model: string | null;
    email_template_key: string;
    email_template_name: string;
    email_subject_pattern: string;
  } | null;
};

export async function invokePortalCopilot(body: Record<string, unknown>): Promise<CopilotState> {
  const { data, error } = await supabase.functions.invoke("portal-copilot", { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
    }
    throw error;
  }
  if (data?.error) throw new Error(String(data.error));
  return data as CopilotState;
}

export const loadCopilotState = (conversationId?: string, runId?: string) =>
  invokePortalCopilot({ operation: "get-state", ...(conversationId ? { conversationId } : {}), ...(runId ? { runId } : {}) });

export const createCopilotConversation = () =>
  invokePortalCopilot({ operation: "create-conversation" });

export const submitCopilotCommand = (input: {
  command: string;
  inputMode: "text" | "voice";
  transcriptConfirmed: boolean;
  conversationId?: string;
}) => invokePortalCopilot({ operation: "submit-command", ...input });

export const prepareErpRollout = submitCopilotCommand;

export const decideCopilotAction = (actionId: string, decision: "approve" | "reject") =>
  invokePortalCopilot({ operation: "decide-action", actionId, decision });

export const editCopilotAction = (action: CopilotAction, draft: { subject?: string; body?: string; taskContent?: string }) =>
  invokePortalCopilot({ operation: "edit-action", actionId: action.id, ...draft });

export type CopilotAttachment = {
  id: string;
  name: string;
  mimeType: string;
  kind: "image" | "text" | "pdf";
  /** base64 payload for images and PDFs */
  data?: string;
  /** plain text payload for text/CSV pastes and files */
  text?: string;
  previewUrl?: string;
};

export async function analyzeCopilotAttachments(input: {
  message: string;
  attachments: CopilotAttachment[];
  conversationId?: string;
}): Promise<CopilotState> {
  const { data, error } = await supabase.functions.invoke("portal-copilot", {
    body: {
      operation: "analyze-attachments",
      message: input.message,
      ...(input.conversationId ? { conversationId: input.conversationId } : {}),
      attachments: input.attachments.map(({ name, mimeType, data: payload, text }) => ({ name, mimeType, data: payload, text })),
    },
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
    }
    throw error;
  }
  if (data?.error) throw new Error(String(data.error));
  return data as CopilotState;
}

