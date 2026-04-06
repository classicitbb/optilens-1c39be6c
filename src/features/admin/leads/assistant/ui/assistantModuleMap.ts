import type { AssistantRole, AnswerMode } from "../types";

export interface AssistantModuleCard {
  module: string;
  responsibility: string;
  ownership: "client-shell" | "server-service";
}

export const ASSISTANT_MODULE_MAP: AssistantModuleCard[] = [
  {
    module: "Assistant UI Shell",
    responsibility: "Role-aware entry points + mode rendering inside existing route groups.",
    ownership: "client-shell",
  },
  {
    module: "Assistant Orchestration Service",
    responsibility: "Composes intent, retrieval, policy, attribution, ticketing, gap logging, analytics.",
    ownership: "server-service",
  },
  {
    module: "Intent Classification",
    responsibility: "Maps user message to supported intent taxonomy with low-latency rules/model.",
    ownership: "server-service",
  },
  {
    module: "Retrieval Service",
    responsibility: "Enforces source precedence: internal/site first, controlled external fallback second.",
    ownership: "server-service",
  },
  {
    module: "Answer Policy Service",
    responsibility: "Selects response mode and blocks unsafe answers when policy confidence is low.",
    ownership: "server-service",
  },
  {
    module: "Source Attribution",
    responsibility: "Returns citations and source-tier audit trail for every response.",
    ownership: "server-service",
  },
  {
    module: "Ticket Handoff",
    responsibility: "Creates role-aware support ticket draft when confidence or authorization is insufficient.",
    ownership: "server-service",
  },
  {
    module: "Gap Logging",
    responsibility: "Captures unanswered intents to feed wiki/content backlog.",
    ownership: "server-service",
  },
  {
    module: "Analytics",
    responsibility: "Tracks answer modes, source tiers, escalation rate, and handoff conversion.",
    ownership: "server-service",
  },
  {
    module: "Web Search (AI-Curated)",
    responsibility: "Accepts a visitor query, generates a curated text response via Lovable AI gateway without external search APIs.",
    ownership: "server-service",
  },
];

export const SUPPORTED_ROLES: AssistantRole[] = ["public", "customer", "staff", "admin"];

export const SUPPORTED_ANSWER_MODES: AnswerMode[] = [
  "direct_answer",
  "guided_navigation",
  "auth_required",
  "ticket_offer",
  "escalate_unknown",
];
