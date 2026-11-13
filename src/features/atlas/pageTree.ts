import { toWikiArticleSlug } from "@/lib/wikiArticleRouting";
import { SECTION_PREFIX } from "./components/pageTreeLogic";
import type { AtlasPage, AtlasSection, AtlasStatus } from "./source/types";

export interface TreeNode {
  id: string;
  title: string;
  slug: string;
  kind: "section" | "article" | "link";
  status: AtlasStatus;
  sortOrder: number;
  parentId: string | null;
  children: TreeNode[];
}

export interface TreeModel {
  /** Top-level section nodes (with their subsections and pages) followed by pages that sit outside any section. */
  roots: TreeNode[];
  nodeById: Map<string, TreeNode>;
  nodeBySlug: Map<string, TreeNode>;
}

/** Existing stored URLs stay intact; legacy pages use their stable opaque database ID. */
export const toPageSlug = (page: Pick<AtlasPage, "id" | "title" | "slug">): string => page.slug ? toWikiArticleSlug(page) : page.id;

/** Sidebar and contents order: sections first, then pages, each by position then title. */
export const byTreeOrder = (a: TreeNode, b: TreeNode) =>
  Number(b.kind === "section") - Number(a.kind === "section") || a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);

export const buildTree = (sections: AtlasSection[], pages: AtlasPage[]): TreeModel => {
  const sectionIds = new Set(sections.map((section) => section.id));
  const sectionNodes: TreeNode[] = sections.map((section) => ({
    id: `${SECTION_PREFIX}${section.id}`,
    title: section.title,
    slug: section.slug,
    kind: "section",
    status: "published",
    sortOrder: section.sortOrder,
    // A subsection whose parent was deleted shows at the top level.
    parentId: section.parentId && section.parentId !== section.id && sectionIds.has(section.parentId) ? `${SECTION_PREFIX}${section.parentId}` : null,
    children: [],
  }));
  const pageNodes: TreeNode[] = pages.map((page) => ({
    id: page.id,
    title: page.title,
    slug: toPageSlug(page),
    kind: page.entryKind,
    status: page.status,
    sortOrder: page.sortOrder,
    parentId: page.parentId,
    children: [],
  }));

  const nodeById = new Map<string, TreeNode>();
  const nodeBySlug = new Map<string, TreeNode>();
  for (const node of [...sectionNodes, ...pageNodes]) {
    nodeById.set(node.id, node);
    if (node.kind !== "section") nodeBySlug.set(node.slug, node);
  }
  const sectionNodeId = new Map(sections.map((section) => [section.id, `${SECTION_PREFIX}${section.id}`]));
  const sectionOf = new Map(pages.map((page) => [page.id, page.sectionId]));

  const loose: TreeNode[] = [];
  for (const node of pageNodes) {
    if (node.parentId && nodeById.has(node.parentId)) {
      nodeById.get(node.parentId)!.children.push(node);
      continue;
    }
    const sectionId = sectionOf.get(node.id);
    const parentSection = sectionId ? sectionNodeId.get(sectionId) : undefined;
    if (parentSection && nodeById.has(parentSection)) {
      nodeById.get(parentSection)!.children.push(node);
      continue;
    }
    loose.push(node);
  }
  // Nest subsections. A section that would sit inside its own subtree (bad data) stays at the top level.
  const topSections: TreeNode[] = [];
  for (const node of sectionNodes) {
    let cursor = node.parentId;
    const seen = new Set<string>([node.id]);
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      cursor = nodeById.get(cursor)?.parentId ?? null;
    }
    if (node.parentId && !cursor) nodeById.get(node.parentId)!.children.push(node);
    else {
      node.parentId = null;
      topSections.push(node);
    }
  }
  for (const section of sectionNodes) section.children.sort(byTreeOrder);
  loose.sort(byTreeOrder);

  return { roots: [...topSections.sort(byTreeOrder), ...loose], nodeById, nodeBySlug };
};
