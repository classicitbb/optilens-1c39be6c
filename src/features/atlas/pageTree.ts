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
  /** Section nodes (with their pages) followed by pages that sit outside any section. */
  roots: TreeNode[];
  nodeById: Map<string, TreeNode>;
  nodeBySlug: Map<string, TreeNode>;
}

/** Existing stored URLs stay intact; legacy pages use their stable opaque database ID. */
export const toPageSlug = (page: Pick<AtlasPage, "id" | "title" | "slug">): string => page.slug ? toWikiArticleSlug(page) : page.id;

const bySort = (a: TreeNode, b: TreeNode) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);

export const buildTree = (sections: AtlasSection[], pages: AtlasPage[]): TreeModel => {
  const sectionNodes: TreeNode[] = sections.map((section) => ({
    id: `${SECTION_PREFIX}${section.id}`,
    title: section.title,
    slug: section.slug,
    kind: "section",
    status: "published",
    sortOrder: section.sortOrder,
    parentId: null,
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
  for (const section of sectionNodes) section.children.sort(bySort);
  loose.sort(bySort);

  return { roots: [...sectionNodes, ...loose], nodeById, nodeBySlug };
};
