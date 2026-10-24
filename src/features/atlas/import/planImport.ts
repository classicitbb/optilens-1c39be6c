import { toCanonicalDocument } from "@/lib/wikiCanonical";
import { slugifyHelpValue } from "@/lib/helpCenter";
import type { ImportBundle, ImportPage, ImportReport, LossKind, LossyItem, PlannedPage, SlugCollision } from "./types";

const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

/** What in a Markdown page the canonical converter will flatten, drop or leave to review. */
export const detectLoss = (page: Pick<ImportPage, "externalId" | "title" | "markdown">): LossyItem[] => {
  const md = page.markdown;
  const items: LossyItem[] = [];
  const add = (kind: LossKind, n: number, effect: string, severity: LossyItem["severity"]) => {
    if (n > 0) items.push({ pageId: page.externalId, title: page.title || "Untitled", kind, count: n, effect, severity });
  };
  // A table is a header row followed by a separator row of dashes.
  add("table", count(md, /^\s*\|.+\|\s*\n\s*\|[\s:|-]+\|\s*$/gm), "Imported as plain paragraphs, not a table block", "lossy");
  add("image", count(md, /!\[[^\]]*\]\([^)]+\)/g), "Image links are kept as links; files hosted by the source tool may stop loading", "lossy");
  add("mention", count(md, /(^|\s)@[A-Za-z][\w.-]*/g), "People mentions become plain text", "lossy");
  add("html", count(md, /<\/?(br|div|span|table|tr|td|iframe|details|summary|p)\b[^>]*>/gi), "Inline HTML is stripped or shown as text", "lossy");
  add("embed", count(md, /<iframe\b|\b(?:youtube\.com\/watch|youtu\.be\/|vimeo\.com\/)\S*/gi), "Embeds become links", "lossy");
  add("rule", count(md, /^\s*(?:\* \* \*|---+|___+)\s*$/gm), "Horizontal rules become dividers", "note");
  add("nested-list", count(md, /^(?: {4}|\t)+(?:[-*]|\d+\.)\s/gm), "Nested list items keep their depth", "note");
  add("checklist", count(md, /^\s*[-*]\s+\[[ xX]\]\s/gm), "Checklist lines become to-do blocks", "note");
  return items;
};

const depthOf = (id: string, parentOf: Map<string, string | null>): number => {
  let depth = 0;
  let cursor = parentOf.get(id) ?? null;
  const seen = new Set<string>([id]);
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    depth += 1;
    cursor = parentOf.get(cursor) ?? null;
  }
  return depth;
};

/**
 * The dry run: what importing this bundle would create, and what would not survive. Pure and
 * read-only. `existingSlugs` are the slugs already used in Atlas, so collisions are reported
 * instead of silently overwritten (an import would never overwrite a page).
 */
export const planImport = (bundle: ImportBundle, existingSlugs: Iterable<string | null | undefined> = []): ImportReport => {
  const existing = new Set([...existingSlugs].filter((slug): slug is string => Boolean(slug)));
  const planned: PlannedPage[] = [];
  const lossy: LossyItem[] = [];
  const failures: ImportReport["failures"] = [];
  const parentOf = new Map<string, string | null>();
  for (const group of bundle.groups) for (const page of group.pages) parentOf.set(page.externalId, page.parentExternalId);

  const slugOwners = new Map<string, string[]>();
  const withLoss = new Set<string>();
  let emptyPages = 0;

  for (const group of bundle.groups) {
    for (const page of group.pages) {
      const base = slugifyHelpValue(page.title) || "untitled";
      const owners = slugOwners.get(base) ?? [];
      owners.push(page.title || "Untitled");
      slugOwners.set(base, owners);

      let blocks = 0;
      try {
        blocks = toCanonicalDocument(page.markdown).blocks.length;
      } catch (error) {
        failures.push({ pageId: page.externalId, title: page.title || "Untitled", message: error instanceof Error ? error.message : "Conversion failed" });
      }
      const empty = page.markdown.trim().length === 0;
      if (empty) emptyPages += 1;
      const found = detectLoss(page);
      if (found.some((item) => item.severity === "lossy")) withLoss.add(page.externalId);
      lossy.push(...found);

      planned.push({
        externalId: page.externalId,
        title: page.title || "Untitled",
        slug: base,
        depth: depthOf(page.externalId, parentOf),
        section: group.sectionName,
        parentExternalId: page.parentExternalId,
        blocks,
        empty,
      });
    }
  }

  // Give each duplicate a numbered slug (the same rule the editor uses), and report every collision.
  const used = new Set(existing);
  const collisions: SlugCollision[] = [];
  for (const [slug, titles] of slugOwners) {
    if (titles.length > 1) collisions.push({ slug, titles, kind: "within-import" });
    if (existing.has(slug)) collisions.push({ slug, titles, kind: "existing-page" });
  }
  for (const page of planned) {
    let slug = page.slug;
    let n = 2;
    while (used.has(slug)) slug = `${page.slug}-${n++}`;
    used.add(slug);
    page.slug = slug;
  }

  return {
    sourceId: bundle.sourceId,
    spaceName: bundle.spaceName,
    spaceId: slugifyHelpValue(bundle.spaceName) || "imported",
    counts: {
      documents: bundle.documentCount,
      pages: planned.length,
      sections: new Set(bundle.groups.map((group) => group.sectionName).filter(Boolean)).size,
      maxDepth: planned.reduce((max, page) => Math.max(max, page.depth), 0),
      emptyPages,
      pagesWithLoss: withLoss.size,
      failedConversions: failures.length,
    },
    pages: planned,
    lossy,
    collisions,
    failures,
  };
};
