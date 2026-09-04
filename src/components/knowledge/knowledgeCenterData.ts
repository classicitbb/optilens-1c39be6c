import { useMemo } from "react";

import {
  CURATED_KNOWLEDGE_ARTICLES,
  KNOWLEDGE_CATEGORY_META,
  type KnowledgeAudience,
  type KnowledgeCategoryId,
} from "@/data/knowledgeCenter";
import { usePublicKnowledge } from "@/hooks/useContentArticles";
import { buildPublicHelpCenterTree, type HelpCenterNode } from "@/lib/helpCenter";

/**
 * The live page builds its tree with buildPublicHelpCenterTree, which folds
 * `audience`, `estimatedReadMinutes` and `featured` into a single sortOrder and
 * then drops them. Every prototype here wants those three facts back, so this
 * adapter re-joins the curated source records onto the tree nodes by id.
 *
 * Kept as a view-layer adapter rather than pushed into helpCenter.ts, because
 * the admin wiki tree shares that builder and has no use for these fields.
 */
export interface EnrichedNode extends HelpCenterNode {
  audience: KnowledgeAudience;
  readMinutes: number;
  featured: boolean;
}

export interface EnrichedSection {
  id: KnowledgeCategoryId;
  title: string;
  description: string;
  slug: string;
  meta: (typeof KNOWLEDGE_CATEGORY_META)[KnowledgeCategoryId];
  children: EnrichedNode[];
}

const curatedById = new Map(CURATED_KNOWLEDGE_ARTICLES.map((article) => [article.id, article]));

/** CMS articles carry no read estimate, so approximate from body length. */
const estimateReadMinutes = (node: HelpCenterNode) => {
  const words = (node.content ?? node.summary ?? "").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

const enrich = (node: HelpCenterNode): EnrichedNode => {
  const curated = curatedById.get(node.id);
  return {
    ...node,
    audience: curated?.audience ?? "all",
    readMinutes: curated?.estimatedReadMinutes ?? estimateReadMinutes(node),
    featured: curated?.featured ?? false,
  };
};

export const nodeHref = (node: HelpCenterNode) =>
  node.kind === "article" ? `/knowledge/${node.slug}` : node.href ?? "/knowledge";

export const matchesQuery = (node: EnrichedNode, query: string) => {
  if (!query) return true;
  return [node.title, node.summary, node.slug, ...(node.keywords ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
};

export const AUDIENCE_LABEL: Record<KnowledgeAudience, string> = {
  all: "Everyone",
  patients: "Patients",
  professionals: "Professionals",
};

/** Shared source of truth for all three prototypes. */
export const useKnowledgeCenterData = () => {
  const { data: articles = [], isLoading } = usePublicKnowledge();

  return useMemo(() => {
    const tree = buildPublicHelpCenterTree(articles);
    const sections: EnrichedSection[] = tree.sections
      .map((section) => ({
        id: section.categoryId,
        title: section.title,
        description: KNOWLEDGE_CATEGORY_META[section.categoryId].description,
        slug: section.slug,
        meta: KNOWLEDGE_CATEGORY_META[section.categoryId],
        children: section.children.map(enrich),
      }))
      .filter((section) => section.children.length > 0);

    const all = sections.flatMap((section) => section.children);

    return {
      isLoading,
      sections,
      all,
      featured: all.filter((node) => node.featured),
      totalCount: all.length,
    };
  }, [articles, isLoading]);
};
