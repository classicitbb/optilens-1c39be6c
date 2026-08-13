import { supabase } from "@/integrations/supabase/client";

export type CopilotRun = {
  id: string;
  workflow: "erp_portal_rollout";
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
  };
  requested_by: string;
  created_at: string;
  updated_at: string;
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

export const loadCopilotState = (runId?: string) =>
  invokePortalCopilot({ operation: "get-state", ...(runId ? { runId } : {}) });

export const prepareErpRollout = (input: {
  command: string;
  inputMode: "text" | "voice";
  transcriptConfirmed: boolean;
}) => invokePortalCopilot({ operation: "prepare-erp-rollout", ...input });

export const decideCopilotAction = (actionId: string, decision: "approve" | "reject") =>
  invokePortalCopilot({ operation: "decide-action", actionId, decision });

export const editCopilotAction = (action: CopilotAction, draft: { subject?: string; body?: string; taskContent?: string }) =>
  invokePortalCopilot({ operation: "edit-action", actionId: action.id, ...draft });
