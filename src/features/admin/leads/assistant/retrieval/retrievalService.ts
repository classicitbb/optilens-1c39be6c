import type { AssistantIntent, AssistantRole, RetrievalDocument, RetrievalResult } from "../types";

interface RetrievalContext {
  role: AssistantRole;
  intent: AssistantIntent;
}

const INTERNAL_KB: RetrievalDocument[] = [
  {
    id: "kb-wiki-policy-precedence",
    title: "Knowledge Policy: Source Precedence",
    excerpt: "Approved internal and site documentation must be used before any external fallback.",
    source: "approved_internal",
    confidence: 0.98,
    url: "/admin/knowledge/wiki",
  },
  {
    id: "kb-lens-ordering-guide",
    title: "Lens Ordering Tips",
    excerpt: "Ordering workflow for lenses and route-specific instructions for staff.",
    source: "site_knowledge",
    confidence: 0.9,
    url: "/professionals/lens-ordering-tips",
  },
];

const CONTROLLED_EXTERNAL: RetrievalDocument[] = [
  {
    id: "ext-industry-standards",
    title: "Controlled external optical standards summary",
    excerpt: "Industry baseline guidance for optical terminology and lens category definitions.",
    source: "controlled_external",
    confidence: 0.68,
    url: "https://example.com/optical-standards",
  },
];

export const retrieveKnowledge = ({ intent, role }: RetrievalContext): RetrievalResult => {
  const internal = INTERNAL_KB.filter((doc) => intent === "unknown" || doc.confidence >= 0.88);
  const canUseExternal = role !== "public";

  if (internal.length > 0) {
    return {
      documents: internal,
      usedExternalFallback: false,
      policyConflictDetected: false,
    };
  }

  if (!canUseExternal) {
    return {
      documents: [],
      usedExternalFallback: false,
      policyConflictDetected: false,
    };
  }

  return {
    documents: CONTROLLED_EXTERNAL,
    usedExternalFallback: true,
    policyConflictDetected: false,
  };
};
