import { supabase } from "@/integrations/supabase/client";
import type { HelpdeskTicketSubtype } from "@/features/admin/leads/assistant/types";

const db = () => supabase as any;

export interface StructuredTicketInput {
  title: string;
  description: string;
  subtype: HelpdeskTicketSubtype;
  tenantKey?: string;
  sourceChannel?: "manual" | "email" | "phone" | "chat" | "portal" | "api" | "odoo_sync" | "ai_assistant";
  sourceSessionId?: string;
  sourceRoleMode?: string;
  sourceRouteContext?: string;
  sourceAuthenticationRequired?: boolean;
  sourceMetadata?: Record<string, unknown>;
  partnerContactId?: string | null;
  ownerUserId?: string | null;
}

const generateTicketNumber = () => `TCK-${Date.now().toString().slice(-8)}`;

const SUBTYPE_REVIEW_QUEUES: Partial<Record<HelpdeskTicketSubtype, Array<"knowledge_operations" | "repeated_gaps" | "article_improvement">>> = {
  knowledge_gap: ["knowledge_operations", "repeated_gaps"],
  article_issue: ["knowledge_operations", "article_improvement"],
};

const resolveTicketTypeId = async ({
  subtype,
  tenantKey,
}: {
  subtype: HelpdeskTicketSubtype;
  tenantKey: string;
}): Promise<string | null> => {
  const { data, error } = await db()
    .from("helpdesk_ticket_types")
    .select("id")
    .eq("tenant_key", tenantKey)
    .eq("code", subtype)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
};

export const createStructuredHelpdeskTicket = async (input: StructuredTicketInput) => {
  const tenantKey = input.tenantKey ?? "default";
  const ticketTypeId = await resolveTicketTypeId({ subtype: input.subtype, tenantKey });
  const now = new Date().toISOString();

  const { data, error } = await db()
    .from("helpdesk_tickets")
    .insert({
      tenant_key: tenantKey,
      ticket_number: generateTicketNumber(),
      title: input.title.trim(),
      description: input.description.trim(),
      ticket_type_id: ticketTypeId,
      partner_contact_id: input.partnerContactId ?? null,
      owner_user_id: input.ownerUserId ?? null,
      source_channel: input.sourceChannel ?? "manual",
      source_session_id: input.sourceSessionId ?? null,
      source_role_mode: input.sourceRoleMode ?? null,
      source_route_context: input.sourceRouteContext ?? null,
      source_authentication_required: input.sourceAuthenticationRequired ?? false,
      source_metadata: {
        subtype: input.subtype,
        ...(input.sourceMetadata ?? {}),
      },
      opened_at: now,
      assigned_at: input.ownerUserId ? now : null,
    })
    .select("id")
    .single();

  if (error) throw error;

  const ticketId = (data as { id: string }).id;

  const reviewQueues = SUBTYPE_REVIEW_QUEUES[input.subtype] ?? [];
  if (reviewQueues.length > 0) {
    const { error: queueError } = await db().from("helpdesk_ticket_review_queue_items").insert(
      reviewQueues.map((queueName) => ({
        tenant_key: tenantKey,
        ticket_id: ticketId,
        queue_name: queueName,
        source_signal: input.subtype,
        source_reference: input.sourceSessionId ?? null,
      })),
    );

    if (queueError) throw queueError;
  }

  return ticketId;
};
