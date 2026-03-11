import BlogPostRenderer from "@/components/blog/BlogPostRenderer";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import { toCanonicalDocument } from "@/lib/wikiCanonical";

interface WikiArticleRendererProps {
  bodyJson?: BlogCanonicalContent | null;
  legacyContent?: string;
  className?: string;
  emptyMessage?: string;
}

const WikiArticleRenderer = ({ bodyJson, legacyContent = "", className, emptyMessage }: WikiArticleRendererProps) => {
  const canonical = bodyJson ? toCanonicalDocument(bodyJson) : toCanonicalDocument(legacyContent);
  return <BlogPostRenderer content={canonical} className={className} emptyMessage={emptyMessage} />;
};

export default WikiArticleRenderer;
