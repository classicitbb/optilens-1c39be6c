import type { AssistantIntent, AssistantRequest, TicketDraft } from "../types";

const resolveQueue = (request: AssistantRequest): TicketDraft["queue"] => {
  if (request.role === "public") return "public-support";
  if (request.role === "customer") return "customer-success";
  return "internal-ops";
};

const resolveSubtype = (request: AssistantRequest, intent: AssistantIntent): TicketDraft["subtype"] => {
  if (intent === "unknown") return "knowledge_gap";

  const normalizedMessage = request.message.toLowerCase();

  if (intent === "account_support") {
    if (/invoice|statement|bill|billing/.test(normalizedMessage)) return "invoice_statement_request";
    if (/order|job|status|tracking|eta/.test(normalizedMessage)) return "order_job_status_request";
    if (/return|refund|warranty|remake/.test(normalizedMessage)) return "returns_warranty_support";
    return "account_specific_request";
  }

  if (/article|doc|documentation|knowledge base|knowledge article|wiki/.test(normalizedMessage)) {
    return "article_issue";
  }

  return "general_escalation";
};

export const createTicketDraft = (
  request: AssistantRequest,
  answerMessage: string,
  intent: AssistantIntent,
  requiresAuth: boolean,
): TicketDraft => {
  const queue = resolveQueue(request);
  const subtype = resolveSubtype(request, intent);

  return {
    queue,
    subtype,
    summary: `Assistant follow-up needed for ${request.role} user`,
    context: `Question: ${request.message}\nAssistant outcome: ${answerMessage}`,
    sourceChannel: "ai_assistant",
    sourceSessionId: request.sessionId,
    sourceRoleMode: request.role,
    sourceRouteContext: request.routeGroup,
    sourceAuthenticationRequired: requiresAuth,
  };
};
