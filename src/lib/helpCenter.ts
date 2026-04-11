import { toWikiRendererDocument } from "@/components/admin/WikiArticleRenderer";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import {
  CURATED_KNOWLEDGE_ARTICLES,
  KNOWLEDGE_CATEGORY_META,
  KNOWLEDGE_CATEGORY_ORDER,
  type CuratedKnowledgeArticle,
  type KnowledgeCategoryId,
  formatKnowledgeCategoryTitle,
  resolveKnowledgeCategoryId,
} from "@/data/knowledgeCenter";
import type { ContentArticle } from "@/hooks/useContentArticles";
import type { HelpArticle } from "@/hooks/useHelpArticles";
import type { WikiHeading } from "@/hooks/useWikiHeadings";

export type HelpCenterKind = "section" | "article" | "link";

export interface HelpCenterMetaSummary {
  kind: Exclude<HelpCenterKind, "section">;
  href?: string;
  summary: string;
}

export interface HelpCenterNode {
  id: string;
  title: string;
  slug: string;
  summary: string;
  kind: HelpCenterKind;
  categoryId: KnowledgeCategoryId;
  parentId: string | null;
  href?: string;
  keywords: string[];
  status: "draft" | "published" | "archived";
  visibility: "public" | "customer" | "internal" | "draft";
  sortOrder: number;
  content?: string;
  bodyJson?: BlogCanonicalContent | null;
  updatedAt?: string;
  children: HelpCenterNode[];
  source: "curated" | "cms" | "heading";
  legacyAnchors: string[];
}

export interface HelpCenterTree {
  sections: HelpCenterNode[];
  nodes: HelpCenterNode[];
  nodeById: Map<string, HelpCenterNode>;
  nodeBySlug: Map<string, HelpCenterNode>;
}

const LINK_PREFIX = "[link:";

export const slugifyHelpValue = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const toKnowledgeArticleSlug = ({
  id,
  title,
  slug,
}: {
  id: string;
  title: string;
  slug?: string | null;
}) => {
  const normalizedSlug = slugifyHelpValue(slug || "");
  if (normalizedSlug) return normalizedSlug;

  const base = slugifyHelpValue(title) || "article";
  const suffix = slugifyHelpValue(id).slice(0, 10) || "entry";
  return `${base}-${suffix}`;
};

export const toKnowledgeArticlePath = (slug: string) => `/knowledge/${slug}`;

export const parseHelpEntrySummary = (summary?: string | null): HelpCenterMetaSummary => {
  const raw = (summary || "").trim();
  if (!raw.startsWith(LINK_PREFIX)) {
    return { kind: "article", summary: raw };
  }

  const match = raw.match(/^\[link:(.+?)\]\s*(.*)$/i);
  if (!match) {
    return { kind: "article", summary: raw };
  }

  return {
    kind: "link",
    href: match[1]?.trim(),
    summary: match[2]?.trim() ?? "",
  };
};

export const composeHelpEntrySummary = ({
  kind,
  href,
  summary,
}: {
  kind: Exclude<HelpCenterKind, "section">;
  href?: string;
  summary: string;
}) => {
  const trimmedSummary = summary.trim();
  if (kind === "link" && href?.trim()) {
    return `[link:${href.trim()}] ${trimmedSummary}`.trim();
  }
  return trimmedSummary;
};

export const extractCanonicalHeadings = (content?: BlogCanonicalContent | null) =>
  (content?.blocks ?? [])
    .filter((block): block is Extract<BlogCanonicalContent["blocks"][number], { type: "heading" }> => block.type === "heading")
    .map((block) => {
      const text = block.children
        .map((child) => {
          if (child.type === "text") return child.text;
          if ("children" in child) {
            return child.children
              .map((nested) => (nested.type === "text" ? nested.text : ""))
              .join("");
          }
          return "";
        })
        .join("")
        .trim();

      return {
        id: slugifyHelpValue(text) || `heading-${block.level}`,
        text,
        level: block.level,
      };
    })
    .filter((heading) => heading.text.length > 0);

const createSectionNode = (categoryId: KnowledgeCategoryId): HelpCenterNode => ({
  id: `section:${categoryId}`,
  title: KNOWLEDGE_CATEGORY_META[categoryId].title,
  slug: categoryId,
  summary: KNOWLEDGE_CATEGORY_META[categoryId].description,
  kind: "section",
  categoryId,
  parentId: null,
  keywords: [KNOWLEDGE_CATEGORY_META[categoryId].title.toLowerCase()],
  status: "published",
  visibility: "public",
  sortOrder: KNOWLEDGE_CATEGORY_ORDER.indexOf(categoryId),
  children: [],
  source: "heading",
  legacyAnchors: [categoryId],
});

const toCuratedNode = (article: CuratedKnowledgeArticle): HelpCenterNode => ({
  id: article.id,
  title: article.title,
  slug: article.id,
  summary: article.description,
  kind: "link",
  categoryId: article.categoryId,
  parentId: null,
  href: article.href,
  keywords: article.keywords,
  status: "published",
  visibility: "public",
  sortOrder: article.featured ? -10 : article.estimatedReadMinutes,
  children: [],
  source: "curated",
  legacyAnchors: [article.id, slugifyHelpValue(article.title)],
});

const toPublicArticleNode = (article: ContentArticle): HelpCenterNode => {
  const meta = parseHelpEntrySummary(article.summary ?? article.description ?? "");
  const slug = toKnowledgeArticleSlug({ id: article.id, title: article.title, slug: article.slug });
  const categoryId = article.content_type === "faq" ? "faq" : resolveKnowledgeCategoryId(article.category);
  return {
    id: article.id,
    title: article.title,
    slug,
    summary: meta.summary || article.description || formatKnowledgeCategoryTitle(article.category || "knowledge"),
    kind: meta.kind,
    categoryId,
    parentId: (article.parent_id as string | null | undefined) ?? null,
    href: meta.href,
    keywords: [
      article.title,
      article.category,
      article.description,
      article.summary,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean),
    status: article.status ?? "published",
    visibility: (article.visibility ?? "public") as HelpCenterNode["visibility"],
    sortOrder: article.sort_order ?? 0,
    content: article.content,
    bodyJson: toWikiRendererDocument({ bodyJson: article.body_json as BlogCanonicalContent | null, legacyContent: article.content }),
    updatedAt: article.updated_at,
    children: [],
    source: "cms",
    legacyAnchors: [
      article.page_slug,
      article.slug,
      slugifyHelpValue(article.title),
      slug,
    ].filter(Boolean) as string[],
  };
};

export const buildPublicHelpCenterTree = (articles: ContentArticle[]): HelpCenterTree => {
  const sections = KNOWLEDGE_CATEGORY_ORDER.map(createSectionNode);
  const nodesByCategory = new Map<KnowledgeCategoryId, HelpCenterNode[]>();

  const dedupe = new Set<string>();
  const candidateNodes = [
    ...CURATED_KNOWLEDGE_ARTICLES.map(toCuratedNode),
    ...articles.map(toPublicArticleNode),
  ].filter((node) => {
    const key = `${node.kind}:${node.slug}:${node.title.trim().toLowerCase()}`;
    if (dedupe.has(key)) return false;
    dedupe.add(key);
    return true;
  });

  for (const node of candidateNodes) {
    const next = nodesByCategory.get(node.categoryId) ?? [];
    next.push(node);
    nodesByCategory.set(node.categoryId, next);
  }

  const nodes: HelpCenterNode[] = [];
  const nodeById = new Map<string, HelpCenterNode>();
  const nodeBySlug = new Map<string, HelpCenterNode>();

  for (const section of sections) {
    section.children = (nodesByCategory.get(section.categoryId) ?? []).sort((left, right) => {
      if (left.source !== right.source) return left.source === "curated" ? -1 : 1;
      return left.sortOrder - right.sortOrder || left.title.localeCompare(right.title);
    });

    nodes.push(section, ...section.children);
  }

  for (const node of nodes) {
    nodeById.set(node.id, node);
    if (node.kind !== "section") {
      nodeBySlug.set(node.slug, node);
    }
  }

  return { sections, nodes, nodeById, nodeBySlug };
};

const toAdminManagedNode = (article: HelpArticle): HelpCenterNode => {
  const meta = parseHelpEntrySummary(article.summary);
  return {
    id: article.id,
    title: article.title,
    slug: toKnowledgeArticleSlug({ id: article.id, title: article.title, slug: article.slug }),
    summary: meta.summary,
    kind: meta.kind,
    categoryId: resolveKnowledgeCategoryId(article.category || "start-here"),
    parentId: article.parent_id ?? null,
    href: meta.href,
    keywords: [article.title, article.summary ?? "", article.slug ?? ""]
      .join(" ")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean),
    status: article.status ?? "draft",
    visibility: article.context_slugs.includes("knowledge/wiki") ? "internal" : "draft",
    sortOrder: article.sort_order ?? 0,
    content: article.content,
    bodyJson: toWikiRendererDocument({ bodyJson: article.body_json, legacyContent: article.content }),
    updatedAt: article.updated_at,
    children: [],
    source: "cms",
    legacyAnchors: [article.slug ?? "", article.id].filter(Boolean),
  };
};

export const buildAdminHelpCenterTree = (headings: WikiHeading[], articles: HelpArticle[]): HelpCenterTree => {
  const headingNodes = headings.map((heading) => ({
    id: `heading:${heading.id}`,
    title: heading.title,
    slug: heading.slug,
    summary: `Section for ${heading.title}`,
    kind: "section" as const,
    categoryId: resolveKnowledgeCategoryId(heading.slug),
    parentId: null,
    keywords: [heading.title.toLowerCase()],
    status: "published" as const,
    visibility: "internal" as const,
    sortOrder: heading.sort_order ?? 0,
    children: [] as HelpCenterNode[],
    source: "heading" as const,
    legacyAnchors: [heading.slug],
  }));

  const articleNodes = articles.map(toAdminManagedNode);
  const nodeById = new Map<string, HelpCenterNode>();
  const nodeBySlug = new Map<string, HelpCenterNode>();
  const headingById = new Map(headings.map((heading) => [heading.id, `heading:${heading.id}`]));

  for (const node of [...headingNodes, ...articleNodes]) {
    nodeById.set(node.id, node);
    if (node.kind !== "section") nodeBySlug.set(node.slug, node);
  }

  const topLevelArticles: HelpCenterNode[] = [];

  for (const node of articleNodes) {
    if (node.parentId && nodeById.has(node.parentId)) {
      nodeById.get(node.parentId)!.children.push(node);
      continue;
    }

    const article = articles.find((item) => item.id === node.id);
    const headingNodeId = article?.section_id ? headingById.get(article.section_id) : undefined;
    if (headingNodeId && nodeById.has(headingNodeId)) {
      nodeById.get(headingNodeId)!.children.push(node);
      continue;
    }

    topLevelArticles.push(node);
  }

  for (const headingNode of headingNodes) {
    headingNode.children.sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
  }

  topLevelArticles.sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));

  const sections = [...headingNodes, ...topLevelArticles];

  return {
    sections,
    nodes: [...headingNodes, ...articleNodes],
    nodeById,
    nodeBySlug,
  };
};
