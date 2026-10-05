/**
 * Pure page-tree logic for the wiki workspace sidebar.
 *
 * Pages live in `help_articles` and nest through `parent_id`; top-level pages
 * group under a section (`wiki_headings`, via `section_id`). A move is planned
 * here and written by `useHelpArticles().moveArticles`, which never bumps
 * `version_number` or writes `help_article_versions` rows.
 */

export interface TreePage {
  id: string;
  title: string;
  parent_id: string | null;
  section_id: string | null;
  sort_order: number;
  status: "draft" | "published" | "archived";
}

export type DropPosition = "before" | "after" | "inside";

/** Ids of section rows are prefixed so they can't collide with article ids. */
export const SECTION_PREFIX = "heading:";
export const isSectionId = (id: string) => id.startsWith(SECTION_PREFIX);
export const sectionIdOf = (id: string) => id.slice(SECTION_PREFIX.length);

export interface PageMoveUpdate {
  id: string;
  parent_id: string | null;
  section_id: string | null;
  sort_order: number;
}

const bySortOrder = (a: TreePage, b: TreePage) =>
  a.sort_order - b.sort_order || a.title.localeCompare(b.title);

/** Pages under `rootId` (exclusive), used to block cycles and carry section ids. */
export const descendantsOf = (pages: TreePage[], rootId: string): TreePage[] => {
  const childrenByParent = new Map<string, TreePage[]>();
  for (const page of pages) {
    if (!page.parent_id) continue;
    const list = childrenByParent.get(page.parent_id) ?? [];
    list.push(page);
    childrenByParent.set(page.parent_id, list);
  }
  const out: TreePage[] = [];
  const seen = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const child of childrenByParent.get(current) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child);
      stack.push(child.id);
    }
  }
  return out;
};

/**
 * Plan a drag. `targetId` is an article id or a section row id
 * (`heading:<id>`). Returns the rows whose parent, section or order change, or
 * `null` when the drop is not allowed (onto itself, into its own subtree, or
 * before/after a section row).
 */
export const planPageMove = (
  pages: TreePage[],
  dragId: string,
  targetId: string,
  position: DropPosition,
): PageMoveUpdate[] | null => {
  const dragged = pages.find((page) => page.id === dragId);
  if (!dragged || dragId === targetId) return null;

  let parentId: string | null;
  let sectionId: string | null;
  let insertAt: "end" | { anchorId: string; after: boolean };

  if (isSectionId(targetId)) {
    if (position !== "inside") return null;
    parentId = null;
    sectionId = sectionIdOf(targetId);
    insertAt = "end";
  } else {
    const target = pages.find((page) => page.id === targetId);
    if (!target) return null;
    if (position === "inside") {
      parentId = target.id;
      sectionId = target.section_id;
      insertAt = "end";
    } else {
      parentId = target.parent_id;
      sectionId = target.section_id;
      insertAt = { anchorId: target.id, after: position === "after" };
    }
  }

  // Block cycles: the new parent may not be the page itself or any descendant.
  if (parentId) {
    if (parentId === dragId) return null;
    if (descendantsOf(pages, dragId).some((page) => page.id === parentId)) return null;
  }

  const siblings = pages
    .filter(
      (page) =>
        page.id !== dragId &&
        page.parent_id === parentId &&
        (parentId !== null || (page.section_id ?? null) === sectionId),
    )
    .sort(bySortOrder);

  let index = siblings.length;
  if (insertAt !== "end") {
    const anchorIndex = siblings.findIndex((page) => page.id === insertAt.anchorId);
    index = anchorIndex < 0 ? siblings.length : anchorIndex + (insertAt.after ? 1 : 0);
  }

  const ordered = [...siblings.slice(0, index), dragged, ...siblings.slice(index)];
  const updates: PageMoveUpdate[] = [];

  ordered.forEach((page, order) => {
    const next = page.id === dragId ? { parent_id: parentId, section_id: sectionId } : null;
    const changed =
      page.sort_order !== order ||
      (next !== null && (page.parent_id !== next.parent_id || (page.section_id ?? null) !== next.section_id));
    if (changed) {
      updates.push({
        id: page.id,
        parent_id: next ? next.parent_id : page.parent_id,
        section_id: next ? next.section_id : page.section_id,
        sort_order: order,
      });
    }
  });

  // Descendants follow the moved page into its new section.
  if ((dragged.section_id ?? null) !== sectionId) {
    for (const descendant of descendantsOf(pages, dragId)) {
      if ((descendant.section_id ?? null) !== sectionId) {
        updates.push({
          id: descendant.id,
          parent_id: descendant.parent_id,
          section_id: sectionId,
          sort_order: descendant.sort_order,
        });
      }
    }
  }

  return updates;
};

/** Parent chain from the root down to (and excluding) `id`, for breadcrumbs. */
export const ancestorsOf = (pages: TreePage[], id: string): TreePage[] => {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const chain: TreePage[] = [];
  const seen = new Set<string>([id]);
  let current = byId.get(id)?.parent_id ?? null;
  while (current && !seen.has(current)) {
    const page = byId.get(current);
    if (!page) break;
    chain.unshift(page);
    seen.add(current);
    current = page.parent_id;
  }
  return chain;
};
