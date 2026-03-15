import type { AnswerMode, AssistantAnswer, AssistantIntent, AssistantRole, RetrievalResult } from "../types";

interface PolicyInput {
  role: AssistantRole;
  intent: AssistantIntent;
  retrieval: RetrievalResult;
}

const modeMessage: Record<AnswerMode, string> = {
  direct_answer: "Here is the best answer from approved internal knowledge.",
  guided_navigation: "I found guidance and the fastest route to the right documentation.",
  auth_required: "Please sign in to view this role-protected answer.",
  ticket_offer: "I could not verify enough policy-safe context. I can open a support ticket for follow-up.",
  escalate_unknown: "I cannot confidently answer this yet. Escalating for staff review.",
};

export const buildPolicyBoundAnswer = ({ role, intent, retrieval }: PolicyInput): AssistantAnswer => {
  if (role === "public" && intent === "account_support") {
    return {
      mode: "auth_required",
      message: modeMessage.auth_required,
      citations: [],
      requiresAuth: true,
      ticketOffered: false,
    };
  }

  if (retrieval.documents.length === 0) {
    return {
      mode: intent === "unknown" ? "escalate_unknown" : "ticket_offer",
      message: intent === "unknown" ? modeMessage.escalate_unknown : modeMessage.ticket_offer,
      citations: [],
      requiresAuth: false,
      ticketOffered: true,
    };
  }

  const mode: AnswerMode = intent === "how_to" ? "guided_navigation" : "direct_answer";

  return {
    mode,
    message: modeMessage[mode],
    citations: retrieval.documents.map((doc) => doc.title),
    requiresAuth: false,
    ticketOffered: false,
  };
};
