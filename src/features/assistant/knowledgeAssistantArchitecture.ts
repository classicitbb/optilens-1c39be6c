import { APP_ROUTE_REGISTRY, type RouteDomain } from "@/config/routeRegistry";

export type AssistantRole = "public" | "customer" | "staff" | "admin" | "moonshot";

export type AssistantAnswerMode =
  | "direct_answer"
  | "guided_navigation"
  | "auth_required"
  | "ticket_offer"
  | "escalate_unknown";

export type AssistantSourceTier = "internal_policy" | "internal_site" | "external_controlled";

export type AssistantModuleId =
  | "assistant_ui_shell"
  | "assistant_orchestration_service"
  | "intent_classification"
  | "retrieval_service"
  | "answer_policy_service"
  | "source_attribution"
  | "ticket_handoff"
  | "gap_logging"
  | "analytics";

export interface AssistantModuleBoundary {
  id: AssistantModuleId;
  owner: "client" | "server";
  responsibility: string;
  inputs: string[];
  outputs: string[];
  notes?: string;
}

export interface AssistantRoleProfile {
  role: AssistantRole;
  label: string;
  routeDomains: RouteDomain[];
  authRequired: boolean;
  allowedAnswerModes: AssistantAnswerMode[];
}

export interface AssistantSourcePrecedenceRule {
  priority: number;
  tier: AssistantSourceTier;
  rule: string;
}

export interface KnowledgeAssistantArchitecture {
  roleProfiles: AssistantRoleProfile[];
  moduleBoundaries: AssistantModuleBoundary[];
  sourcePrecedence: AssistantSourcePrecedenceRule[];
  guardrails: string[];
}

const ROLE_PROFILES: AssistantRoleProfile[] = [
  {
    role: "public",
    label: "Public Visitor",
    routeDomains: ["public-site"],
    authRequired: false,
    allowedAnswerModes: ["direct_answer", "guided_navigation", "auth_required", "ticket_offer", "escalate_unknown"],
  },
  {
    role: "customer",
    label: "Customer",
    routeDomains: ["customer-portal"],
    authRequired: true,
    allowedAnswerModes: ["direct_answer", "guided_navigation", "ticket_offer", "escalate_unknown"],
  },
  {
    role: "staff",
    label: "Staff",
    routeDomains: ["operations-console", "admin-console"],
    authRequired: true,
    allowedAnswerModes: ["direct_answer", "guided_navigation", "ticket_offer", "escalate_unknown"],
  },
  {
    role: "admin",
    label: "Admin",
    routeDomains: ["admin-console"],
    authRequired: true,
    allowedAnswerModes: ["direct_answer", "guided_navigation", "ticket_offer", "escalate_unknown"],
  },
  {
    role: "moonshot",
    label: "Moonshot",
    routeDomains: ["moonshot"],
    authRequired: true,
    allowedAnswerModes: ["direct_answer", "guided_navigation", "ticket_offer", "escalate_unknown"],
  },
];

const MODULE_BOUNDARIES: AssistantModuleBoundary[] = [
  {
    id: "assistant_ui_shell",
    owner: "client",
    responsibility: "Render role-aware assistant surface in existing shell route groups and present answer mode affordances.",
    inputs: ["assistant role profile", "sanitized orchestration response"],
    outputs: ["user query payload", "ui telemetry events"],
    notes: "Never receives API keys or model credentials.",
  },
  {
    id: "assistant_orchestration_service",
    owner: "server",
    responsibility: "Coordinate intent, retrieval, policy, attribution, ticketing, gap logs, and analytics for each turn.",
    inputs: ["assistant query", "session auth context", "role profile"],
    outputs: ["answer payload", "answer mode", "supporting actions"],
  },
  {
    id: "intent_classification",
    owner: "server",
    responsibility: "Map user query to intent families and confidence to guide retrieval depth and escalation thresholds.",
    inputs: ["normalized user utterance", "role context"],
    outputs: ["intent label", "intent confidence", "classification traces"],
  },
  {
    id: "retrieval_service",
    owner: "server",
    responsibility: "Fetch evidence using source precedence: internal policy/site first, controlled external fallback only if needed.",
    inputs: ["intent", "role", "query"],
    outputs: ["ranked source snippets", "coverage score", "fallback_used"],
  },
  {
    id: "answer_policy_service",
    owner: "server",
    responsibility: "Apply policy guardrails, choose answer mode, and block responses that conflict with company policy.",
    inputs: ["retrieved sources", "intent confidence", "auth context"],
    outputs: ["approved answer plan", "selected answer mode", "policy verdict"],
  },
  {
    id: "source_attribution",
    owner: "server",
    responsibility: "Attach policy/site/external citations and reveal provenance in deterministic order.",
    inputs: ["answer plan", "source snippets"],
    outputs: ["attribution bundle", "source tier summary"],
  },
  {
    id: "ticket_handoff",
    owner: "server",
    responsibility: "Offer helpdesk ticket creation and route enriched context when automation confidence is low.",
    inputs: ["answer mode", "session profile", "conversation summary"],
    outputs: ["ticket draft", "handoff action"],
  },
  {
    id: "gap_logging",
    owner: "server",
    responsibility: "Record unresolved or low-confidence intents for knowledge-base backlog and content governance.",
    inputs: ["intent", "coverage score", "final answer mode"],
    outputs: ["gap event"],
  },
  {
    id: "analytics",
    owner: "server",
    responsibility: "Track role-segmented outcomes such as deflection, ticket conversion, and unknown-escalation frequency.",
    inputs: ["role", "answer mode", "latency", "feedback signals"],
    outputs: ["aggregated metrics"],
  },
];

const SOURCE_PRECEDENCE: AssistantSourcePrecedenceRule[] = [
  {
    priority: 1,
    tier: "internal_policy",
    rule: "Approved company policy and controlled internal docs are authoritative and cannot be overridden.",
  },
  {
    priority: 2,
    tier: "internal_site",
    rule: "Published site/wiki knowledge can answer when it does not conflict with internal policy.",
  },
  {
    priority: 3,
    tier: "external_controlled",
    rule: "External retrieval is optional, audited, and only used to fill clearly identified internal gaps.",
  },
];

export const KNOWLEDGE_ASSISTANT_ARCHITECTURE: KnowledgeAssistantArchitecture = {
  roleProfiles: ROLE_PROFILES,
  moduleBoundaries: MODULE_BOUNDARIES,
  sourcePrecedence: SOURCE_PRECEDENCE,
  guardrails: [
    "All model calls and external API traffic run in server-side modules only.",
    "Assistant UI shell only receives redacted response DTOs and action links.",
    "Preview and production behavior share one orchestration contract per route group.",
    "Policy validation failure blocks publishing answers and forces escalation flow.",
  ],
};

export const ASSISTANT_ROUTE_DOMAINS = Array.from(new Set(APP_ROUTE_REGISTRY.map((route) => route.domain)));
