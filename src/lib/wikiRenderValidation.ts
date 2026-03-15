import { toCanonicalDocument } from "@/lib/wikiCanonical";

export const validateWikiRenderableContent = (rawContent: string) => {
  if (!rawContent.trim()) {
    return { valid: false, reason: "Article content cannot be empty." };
  }

  try {
    const canonical = toCanonicalDocument(rawContent);
    if (!canonical.blocks.length) {
      return { valid: false, reason: "Article content did not produce renderable blocks." };
    }

    return { valid: true as const };
  } catch {
    return { valid: false, reason: "Article content failed render validation." };
  }
};
