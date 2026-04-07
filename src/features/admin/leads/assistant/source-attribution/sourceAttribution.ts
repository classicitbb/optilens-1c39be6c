import type { RetrievalResult, SourceAttribution } from "../types";

export const buildSourceAttribution = (retrieval: RetrievalResult): SourceAttribution => {
  const externalApplied = retrieval.documents.some((doc) => doc.source === "external_web");

  return {
    precedence: ["website_content", "knowledge_base", "external_web", "helpdesk_escalation"],
    appliedSources: retrieval.documents.map(({ id, title, source, url }) => ({ id, title, source, url })),
    externalSuppressedReason: externalApplied
      ? undefined
      : "External fallback was not used because website/knowledge base content satisfied policy confidence.",
  };
};
