import { publishableDoc, publishableTitle, validatePagesForPublish, type BulkResult } from "../publishValidation";
import type { AtlasPage, PublishInput } from "../source/types";

export const toPublishInput = (page: AtlasPage, changeNote: string): PublishInput => ({
  id: page.id,
  version: page.version,
  spaceId: page.spaceId,
  title: publishableTitle(page),
  slug: page.slug,
  summary: page.summary,
  entryKind: page.entryKind,
  href: page.href,
  doc: publishableDoc(page),
  sectionId: page.sectionId,
  parentId: page.parentId,
  sortOrder: page.sortOrder,
  status: "published",
  contexts: page.contexts,
  props: page.props,
  changeNote,
});

/**
 * Publish many pages. Each row passes the same validators as the editor's Publish button first;
 * rows that fail are reported by title and left untouched. Rows that pass are published one by
 * one, so one failing write never blocks the rest.
 */
export const publishPages = async (
  pages: AtlasPage[],
  saveVersion: (input: PublishInput) => Promise<unknown>,
  changeNote: string,
): Promise<BulkResult> => {
  const result = validatePagesForPublish(pages);
  const byId = new Map(pages.map((page) => [page.id, page]));
  const published: string[] = [];
  for (const id of result.ok) {
    const page = byId.get(id) as AtlasPage;
    try {
      await saveVersion(toPublishInput(page, changeNote));
      published.push(id);
    } catch (error) {
      result.failed.push({ id, title: publishableTitle(page) || "Untitled", message: error instanceof Error ? error.message : "Save failed." });
    }
  }
  return { ok: published, failed: result.failed };
};
