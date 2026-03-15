export type AssistantRole = "public" | "customer" | "staff" | "admin" | "moonshot";

export type AssistantIntent =
  | "product_lookup"
  | "policy_lookup"
  | "how_to"
  | "account_support"
  | "unknown";

export type AnswerMode =
  | "direct_answer"
  | "guided_navigation"
  | "auth_required"
  | "ticket_offer"
  | "escalate_unknown";

export type SourceTier = "approved_internal" | "site_knowledge" | "controlled_external";

export interface AssistantRequest {
  message: string;
  role: AssistantRole;
  routeGroup: "public" | "account" | "admin" | "moonshot";
  userId?: string;
}

export interface RetrievalDocument {
  id: string;
  title: string;
  excerpt: string;
  source: SourceTier;
  confidence: number;
  url?: string;
}

export interface RetrievalResult {
  documents: RetrievalDocument[];
  usedExternalFallback: boolean;
  policyConflictDetected: boolean;
}

export interface AssistantAnswer {
  mode: AnswerMode;
  message: string;
  citations: string[];
  requiresAuth: boolean;
  ticketOffered: boolean;
}

export interface AssistantResponse {
  answer: AssistantAnswer;
  intent: AssistantIntent;
  attribution: SourceAttribution;
}

export interface SourceAttribution {
  precedence: SourceTier[];
  appliedSources: Array<{ id: string; title: string; source: SourceTier; url?: string }>;
  externalSuppressedReason?: string;
}

export interface TicketDraft {
  queue: "public-support" | "customer-success" | "internal-ops" | "moonshot";
  summary: string;
  context: string;
}
