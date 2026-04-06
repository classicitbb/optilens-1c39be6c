import type { AssistantIntent, AssistantRole, RetrievalDocument, RetrievalResult } from "../types";

interface RetrievalContext {
  role: AssistantRole;
  intent: AssistantIntent;
}

const WEBSITE_CONTENT: RetrievalDocument[] = [
  {
    id: "kb-wiki-policy-precedence",
    title: "Knowledge Policy: Source Precedence",
    excerpt: "Approved internal and site documentation must be used before any external fallback.",
    source: "website_content",
    confidence: 0.98,
    url: "/admin/knowledge/wiki",
  },
];

const KNOWLEDGE_BASE: RetrievalDocument[] = [
  {
    id: "kb-lens-ordering-guide",
    title: "Lens Ordering Tips",
    excerpt: "Ordering workflow for lenses and route-specific instructions for staff.",
    source: "knowledge_base",
    confidence: 0.9,
    url: "/professionals/lens-ordering-tips",
  },
];

const EXTERNAL_WEB: RetrievalDocument[] = [
  {
    id: "ext-industry-standards",
    title: "Controlled external optical standards summary",
    excerpt: "Industry baseline guidance for optical terminology and lens category definitions.",
    source: "external_web",
    confidence: 0.68,
    url: "https://example.com/optical-standards",
  },
];

const HELPDESK_ESCALATION: RetrievalDocument[] = [
  {
    id: "helpdesk-escalation",
    title: "Helpdesk Escalation",
    excerpt: "Contact support via ticket, phone, or email for issues that cannot be resolved automatically.",
    source: "helpdesk_escalation",
    confidence: 0.5,
    url: "/help/contact",
  },
];

export const retrieveKnowledge = ({ intent, role }: RetrievalContext): RetrievalResult => {
  // Tier 1: Website content
  const website = WEBSITE_CONTENT.filter((doc) => intent === "unknown" || doc.confidence >= 0.88);
  if (website.length > 0) {
    return { documents: website, usedExternalFallback: false, policyConflictDetected: false };
  }

  // Tier 2: Knowledge base
  const kb = KNOWLEDGE_BASE.filter((doc) => intent === "unknown" || doc.confidence >= 0.88);
  if (kb.length > 0) {
    return { documents: kb, usedExternalFallback: false, policyConflictDetected: false };
  }

  // Tier 3: External web (not available to public visitors)
  if (role !== "public") {
    const ext = EXTERNAL_WEB.filter((doc) => doc.confidence >= 0.5);
    if (ext.length > 0) {
      return { documents: ext, usedExternalFallback: true, policyConflictDetected: false };
    }
  }

  // Tier 4: Helpdesk escalation fallback
  return { documents: HELPDESK_ESCALATION, usedExternalFallback: false, policyConflictDetected: false };
};
