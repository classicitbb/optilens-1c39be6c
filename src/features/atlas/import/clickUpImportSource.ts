import type { ImportBundle, ImportGroup, ImportPage, ImportSource } from "./types";

/**
 * Reads a ClickUp export: `{ space: { name }, docs: [{ id, name, folder?: { name }, pages: [...] }] }`,
 * where each page is `{ id, name, content?, parent_page_id?, date_updated?, pages?: [...] }` (pages may
 * be nested, as ClickUp returns them, or flat with `parent_page_id`). Content is Markdown.
 *
 * ClickUp space -> Atlas space, folder -> section, doc -> a top-level page, doc pages -> its children.
 * A doc with a single page becomes that one page.
 */
interface RawPage {
  id?: unknown;
  name?: unknown;
  content?: unknown;
  parent_page_id?: unknown;
  date_updated?: unknown;
  pages?: unknown;
}
interface RawDoc {
  id?: unknown;
  name?: unknown;
  folder?: { name?: unknown } | null;
  pages?: unknown;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const isoOf = (value: unknown): string | null => {
  const ms = typeof value === "number" ? value : Number(value);
  return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
};

const flatten = (pages: unknown, parent: string | null, out: ImportPage[]) => {
  if (!Array.isArray(pages)) return;
  for (const raw of pages as RawPage[]) {
    const id = text(raw.id);
    if (!id) continue;
    out.push({
      externalId: id,
      title: text(raw.name).trim(),
      parentExternalId: text(raw.parent_page_id) || parent,
      markdown: text(raw.content),
      updatedAt: isoOf(raw.date_updated),
    });
    flatten(raw.pages, id, out);
  }
};

export const clickUpImportSource: ImportSource = {
  id: "clickup",
  label: "ClickUp",
  parse(input: unknown): ImportBundle {
    const data = input as { space?: { name?: unknown }; docs?: unknown } | null;
    if (!data || typeof data !== "object" || !Array.isArray(data.docs)) {
      throw new Error("Expected a ClickUp export with a `docs` list.");
    }
    const groups = new Map<string, ImportGroup>();
    for (const doc of data.docs as RawDoc[]) {
      const docId = text(doc.id);
      const docName = text(doc.name).trim() || "Untitled document";
      const section = text(doc.folder?.name).trim() || null;
      const pages: ImportPage[] = [];
      flatten(doc.pages, null, pages);

      const group = groups.get(section ?? "") ?? { sectionName: section, pages: [] };
      groups.set(section ?? "", group);

      // A single-page doc is just that page; otherwise the doc is the parent of its top-level pages.
      if (pages.length === 1) {
        group.pages.push({ ...pages[0], title: pages[0].title || docName, parentExternalId: null });
      } else {
        const rootId = docId || `doc:${docName}`;
        group.pages.push({ externalId: rootId, title: docName, parentExternalId: null, markdown: "", updatedAt: null });
        for (const page of pages) group.pages.push({ ...page, parentExternalId: page.parentExternalId ?? rootId });
      }
    }
    return {
      sourceId: "clickup",
      spaceName: text(data.space?.name).trim() || "Imported",
      groups: [...groups.values()],
      documentCount: (data.docs as unknown[]).length,
    };
  },
};
