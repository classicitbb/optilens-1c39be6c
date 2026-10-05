/**
 * Import adapters turn an outside tool's export into this neutral bundle. Nothing here writes to
 * Atlas: `planImport` only reports what an import would do, and a real import needs the user's
 * explicit go-ahead.
 */
export interface ImportPage {
  /** The source tool's id for the page. */
  externalId: string;
  title: string;
  /** Source id of the parent page, or null for a top-level page of its group. */
  parentExternalId: string | null;
  /** Page body as Markdown. */
  markdown: string;
  updatedAt?: string | null;
}

export interface ImportGroup {
  /** Folder-like grouping that becomes an Atlas section. */
  sectionName: string | null;
  pages: ImportPage[];
}

export interface ImportBundle {
  sourceId: string;
  /** Becomes the Atlas space the pages would land in. */
  spaceName: string;
  groups: ImportGroup[];
  /** Count of source documents, for the report. */
  documentCount: number;
}

export interface ImportSource {
  id: string;
  label: string;
  /** Reads a JSON export. Throws a readable Error when the shape is wrong. */
  parse(input: unknown): ImportBundle;
}

export type LossKind = "table" | "image" | "mention" | "html" | "rule" | "embed" | "nested-list" | "checklist";

export interface LossyItem {
  pageId: string;
  title: string;
  kind: LossKind;
  count: number;
  /** What happens to it on import. */
  effect: string;
  /** "lossy" changes or drops something; "note" is converted but worth knowing. */
  severity: "lossy" | "note";
}

export interface SlugCollision {
  slug: string;
  titles: string[];
  kind: "within-import" | "existing-page";
}

export interface PlannedPage {
  externalId: string;
  title: string;
  slug: string;
  depth: number;
  section: string | null;
  parentExternalId: string | null;
  blocks: number;
  empty: boolean;
}

export interface ImportReport {
  sourceId: string;
  spaceName: string;
  spaceId: string;
  counts: { documents: number; pages: number; sections: number; maxDepth: number; emptyPages: number; pagesWithLoss: number; failedConversions: number };
  pages: PlannedPage[];
  lossy: LossyItem[];
  collisions: SlugCollision[];
  failures: { pageId: string; title: string; message: string }[];
}
