import { classifyIntent } from "../intent/intentClassifier";
import { buildPolicyBoundAnswer } from "../policy/answerPolicyService";
import { retrieveKnowledge } from "../retrieval/retrievalService";
import { buildSourceAttribution } from "../source-attribution/sourceAttribution";
import { buildKnowledgeGapEvent } from "../gap/gapLogger";
import { createTicketDraft } from "../ticket/ticketHandoff";
import { buildAssistantAnalyticsEvent } from "../analytics/analytics";
import type { AssistantRequest, AssistantResponse } from "../types";

export interface AssistantPipelineResult {
  response: AssistantResponse;
  ticketDraft?: ReturnType<typeof createTicketDraft>;
  gapEvent?: ReturnType<typeof buildKnowledgeGapEvent>;
  analytics: ReturnType<typeof buildAssistantAnalyticsEvent>;
}

/**
 * Server-side orchestration entrypoint.
 * Keep this in server runtime only: no model provider keys or external APIs in client bundles.
 */
export const orchestrateAssistantRequest = (request: AssistantRequest): AssistantPipelineResult => {
  const intent = classifyIntent(request);
  const retrieval = retrieveKnowledge({ intent, role: request.role });
  const attribution = buildSourceAttribution(retrieval);
  const answer = buildPolicyBoundAnswer({ role: request.role, intent, retrieval });

  const response: AssistantResponse = { answer, intent, attribution };
  const analytics = buildAssistantAnalyticsEvent(response);

  const shouldTicket = answer.mode === "ticket_offer" || answer.mode === "escalate_unknown";
  const ticketDraft = shouldTicket ? createTicketDraft(request, answer.message) : undefined;
  const gapEvent = answer.mode === "escalate_unknown" ? buildKnowledgeGapEvent(request, intent, attribution) : undefined;

  return { response, ticketDraft, gapEvent, analytics };
};
