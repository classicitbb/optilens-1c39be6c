import type { RetrievalResult, SourceAttribution } from "../types";

export const buildSourceAttribution = (retrieval: RetrievalResult): SourceAttribution => {
  const externalApplied = retrieval.documents.some((doc) => doc.source === "controlled_external");

  return {
    precedence: ["approved_internal", "site_knowledge", "controlled_external"],
    appliedSources: retrieval.documents.map(({ id, title, source, url }) => ({ id, title, source, url })),
    externalSuppressedReason: externalApplied
      ? undefined
      : "External fallback was not used because internal/site knowledge satisfied policy confidence.",
  };
};
