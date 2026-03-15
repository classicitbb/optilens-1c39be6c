import type { AssistantRequest, TicketDraft } from "../types";

export const createTicketDraft = (request: AssistantRequest, answerMessage: string): TicketDraft => {
  const queue = request.role === "moonshot"
    ? "moonshot"
    : request.role === "public"
      ? "public-support"
      : request.role === "customer"
        ? "customer-success"
        : "internal-ops";

  return {
    queue,
    summary: `Assistant follow-up needed for ${request.role} user`,
    context: `Question: ${request.message}\nAssistant outcome: ${answerMessage}`,
  };
};
