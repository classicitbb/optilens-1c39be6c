import { APP_ROUTE_REGISTRY, type RouteDomain } from "@/config/routeRegistry";

export type AssistantRole = "public" | "customer" | "staff" | "admin";

export type AssistantAnswerMode =
  | "direct_answer"
  | "guided_navigation"
  | "auth_required"
  | "ticket_offer"
  | "escalate_unknown";

export type AssistantSourceTier = "website_content" | "knowledge_base" | "external_web" | "helpdesk_escalation";

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
  moonshotCoach?: MoonshotCoachArchitecture;
}

export interface MoonshotCoachSourceScope {
  allowed: string[];
  blocked: string[];
}

export interface MoonshotCoachArchitecture {
  workspace: {
    product: "moonshot";
    routeDomain: RouteDomain;
    layout: "moonshot-shell";
    boundedContext: string;
  };
  navigation: {
    preserveMoonshotHierarchy: boolean;
    preserveMoonshotUrls: boolean;
  };
  permissions: {
    authRequired: true;
    dataAccessPolicy: string;
  };
  retrieval: {
    scope: MoonshotCoachSourceScope;
    policy: string;
  };
  analytics: {
    namespace: string;
    isolationRule: string;
  };
  coachPolicy: {
    objective: string;
    sharedInfrastructurePattern: string;
    isolationRequirement: string;
  };
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
    tier: "website_content",
    rule: "Published website pages, product catalog, retailer data, and company policy docs are the primary authoritative source.",
  },
  {
    priority: 2,
    tier: "knowledge_base",
    rule: "Internal wiki articles, approved guides, and knowledge-base entries supplement when website content is insufficient.",
  },
  {
    priority: 3,
    tier: "external_web",
    rule: "Controlled external/internet sources fill clearly identified gaps that internal content cannot resolve.",
  },
  {
    priority: 4,
    tier: "helpdesk_escalation",
    rule: "When no source tier can confidently resolve the query, offer helpdesk ticket creation, phone, or email escalation.",
  },
];

const MOONSHOT_COACH_ARCHITECTURE: MoonshotCoachArchitecture = {
  workspace: {
    product: "moonshot",
    routeDomain: "moonshot",
    layout: "moonshot-shell",
    boundedContext: "Leadership and management coaching inside Moonshot as a separate product workspace.",
  },
  navigation: {
    preserveMoonshotHierarchy: true,
    preserveMoonshotUrls: true,
  },
  permissions: {
    authRequired: true,
    dataAccessPolicy: "Moonshot coach requests must only resolve through Moonshot role access and Moonshot workspace entitlements.",
  },
  retrieval: {
    scope: {
      allowed: ["moonshot_meetings", "moonshot_issues", "moonshot_rocks", "moonshot_scorecards", "moonshot_business_plan", "moonshot_strategic_notes"],
      blocked: ["customer_records", "support_tickets", "pricing_catalog", "operations_playbooks"],
    },
    policy: "Use Moonshot-only sources for leadership coaching; block retrieval when evidence includes non-Moonshot domains.",
  },
  analytics: {
    namespace: "moonshot_coach",
    isolationRule: "Track events and quality metrics in a Moonshot-only analytics stream with no joins into customer/support/ops assistant funnels.",
  },
  coachPolicy: {
    objective: "Prepare a future leadership and management coach grounded in Moonshot meetings, issues, rocks, scorecards, business plan, and strategic notes.",
    sharedInfrastructurePattern: "Reuse common assistant orchestration modules while applying Moonshot-specific retrieval filters, policy checks, and attribution boundaries.",
    isolationRequirement: "Never mix Moonshot leadership context with customer, support, pricing, or operational knowledge.",
  },
};

export const KNOWLEDGE_ASSISTANT_ARCHITECTURE: KnowledgeAssistantArchitecture = {
  roleProfiles: ROLE_PROFILES,
  moduleBoundaries: MODULE_BOUNDARIES,
  sourcePrecedence: SOURCE_PRECEDENCE,
  moonshotCoach: MOONSHOT_COACH_ARCHITECTURE,
  guardrails: [
    "All model calls and external API traffic run in server-side modules only.",
    "Assistant UI shell only receives redacted response DTOs and action links.",
    "Preview and production behavior share one orchestration contract per route group.",
    "Policy validation failure blocks publishing answers and forces escalation flow.",
    "Moonshot coaching uses a separate retrieval scope, permission checks, and analytics namespace from customer/support/pricing/ops contexts.",
  ],
};

export const ASSISTANT_ROUTE_DOMAINS = Array.from(new Set(APP_ROUTE_REGISTRY.map((route) => route.domain)));
