import BlogPostRenderer from "@/components/blog/BlogPostRenderer";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import { toCanonicalDocument } from "@/lib/wikiCanonical";

export interface WikiRendererInput {
  bodyJson?: BlogCanonicalContent | null;
  legacyContent?: string | null;
}

interface WikiArticleRendererProps {
  bodyJson?: BlogCanonicalContent | null;
  legacyContent?: string;
  className?: string;
  emptyMessage?: string;
}

/**
 * Canonical wiki renderer contract:
 * - Input preference: `bodyJson` first, then `legacyContent`.
 * - Any unsupported/invalid payload falls back to an empty canonical document.
 */
export const toWikiRendererDocument = ({ bodyJson, legacyContent }: WikiRendererInput): BlogCanonicalContent => {
  if (bodyJson) return toCanonicalDocument(bodyJson);
  if (legacyContent) return toCanonicalDocument(legacyContent);
  return toCanonicalDocument(undefined);
};

const WikiArticleRenderer = ({ bodyJson, legacyContent = "", className, emptyMessage }: WikiArticleRendererProps) => {
  const canonical = toWikiRendererDocument({ bodyJson, legacyContent });
  return <BlogPostRenderer content={canonical} className={className} emptyMessage={emptyMessage} />;
};

export default WikiArticleRenderer;
