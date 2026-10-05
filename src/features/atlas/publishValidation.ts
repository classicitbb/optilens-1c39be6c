import { validateCanonicalDocument } from "@/lib/wikiCanonical";
import { validateWikiBuildVersionForPublish } from "@/lib/wikiReleaseMetadata";
import { canonicalBodyToMarkdown } from "@/lib/wikiMarkdown";
import type { AtlasDoc, AtlasPage, AtlasStatus } from "./source/types";

export interface Validation {
  valid: boolean;
  message?: string;
}

/**
 * The one gate every write-to-live path passes: the editor's Publish/Update, bulk publish and
 * drag-to-publish on the board. Publishing is blocked unless the document is structurally valid and
 * its build-version metadata is not a placeholder.
 */
export const validateForSave = (entryKind: AtlasPage["entryKind"], doc: AtlasDoc, nextStatus: AtlasStatus): Validation => {
  if (entryKind === "link") return { valid: true };
  const structure = validateCanonicalDocument(doc);
  if (!structure.valid) return structure;
  if (nextStatus === "published") return validateWikiBuildVersionForPublish(canonicalBodyToMarkdown(doc));
  return { valid: true };
};

/** The document a page would publish: its unpublished draft copy when it has one, else the live body. */
export const publishableDoc = (page: AtlasPage): AtlasDoc => page.draftDoc ?? page.doc;
export const publishableTitle = (page: AtlasPage): string => page.draftTitle ?? page.title;

export interface BulkResult {
  ok: string[];
  failed: { id: string; title: string; message: string }[];
}

/** Validate many pages for publishing; failures are reported by title, never silently skipped. */
export const validatePagesForPublish = (pages: AtlasPage[]): BulkResult => {
  const result: BulkResult = { ok: [], failed: [] };
  for (const page of pages) {
    const check = validateForSave(page.entryKind, publishableDoc(page), "published");
    if (check.valid) result.ok.push(page.id);
    else result.failed.push({ id: page.id, title: publishableTitle(page) || "Untitled", message: check.message ?? "Failed validation." });
  }
  return result;
};
