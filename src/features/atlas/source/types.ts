import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";

/**
 * Atlas talks to storage only through `AtlasSource`. UI code imports these types and never a
 * database client, so a renamed table or a different backend changes one adapter module.
 */

/** Canonical document: the interchange format (alongside Markdown) that lets content leave Atlas. */
export type AtlasDoc = BlogCanonicalContent;

export type AtlasStatus = "draft" | "published" | "archived";

export type AtlasPropValue = string | boolean | number | string[] | null;
export type AtlasProps = Record<string, AtlasPropValue>;

export interface AtlasPage {
  id: string;
  title: string;
  /** Stored slug; null for legacy rows (URLs then use `toPageSlug`). */
  slug: string | null;
  spaceId: string;
  status: AtlasStatus;
  /** "link" entries point at `href` instead of rendering a body. */
  entryKind: "article" | "link";
  href: string;
  summary: string;
  doc: AtlasDoc;
  /** Unpublished edits to a published page (present once the draft-copy columns exist). */
  draftTitle: string | null;
  draftDoc: AtlasDoc | null;
  draftSavedAt: string | null;
  parentId: string | null;
  sectionId: string | null;
  sortOrder: number;
  /** Where the page is assigned to appear (opaque slugs the host defines). */
  contexts: string[];
  /** Schema-driven properties, keyed by the property keys of the page's space. */
  props: AtlasProps;
  authorId: string | null;
  lastEditedBy: string | null;
  version: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AtlasSection {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
}

export interface AtlasVersion {
  id: string;
  pageId: string;
  number: number;
  title: string;
  doc: AtlasDoc;
  savedAt: string;
  savedBy: string | null;
  note: string | null;
}

export interface AtlasHit {
  pageId: string;
  spaceId: string;
  title: string;
  slug: string | null;
  status: AtlasStatus;
  /** Text around the first match, or the summary. */
  snippet: string;
  /** 0 = title match, 1 = summary, 2 = body. Lower sorts first. */
  rank: number;
}

export interface AtlasListing {
  pages: AtlasPage[];
  /** Whether the draft-copy columns exist on the backend (published pages can hold unpublished edits). */
  supportsDrafts: boolean;
}

export interface NewPageInput {
  spaceId: string;
  title: string;
  slug: string;
  summary?: string;
  entryKind?: "article" | "link";
  href?: string;
  doc?: AtlasDoc;
  sectionId?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  status?: AtlasStatus;
  contexts?: string[];
  props?: AtlasProps;
  changeNote?: string;
}

export interface PlacementMove {
  id: string;
  parent_id: string | null;
  section_id: string | null;
  sort_order: number;
}

export interface AutosaveMeta {
  /** Summary, entry kind and link target travel together: send all three when any changed. */
  summary?: string;
  entryKind?: "article" | "link";
  href?: string;
  sectionId?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  slug?: string;
  props?: AtlasProps;
}

export interface AutosaveInput {
  id: string;
  title?: string;
  doc?: AtlasDoc;
  /** Write the body to the draft copy instead of the live page (published pages). */
  asDraft?: boolean;
  meta?: AutosaveMeta;
}

export interface PublishInput {
  /** Existing page id; the page's current `version` is read from `version`. */
  id: string;
  version: number;
  spaceId: string;
  title: string;
  /** Null keeps the stored slug untouched (legacy rows without one are never backfilled). */
  slug: string | null;
  summary: string;
  entryKind: "article" | "link";
  href: string;
  doc: AtlasDoc;
  sectionId: string | null;
  parentId: string | null;
  sortOrder: number;
  status: AtlasStatus;
  contexts: string[];
  props: AtlasProps;
  changeNote?: string;
}

export interface AtlasSource {
  getPageSharing(id: string): Promise<{ token: string; enabled: boolean } | null>;
  setPageSharing(id: string, enabled: boolean): Promise<{ token: string; enabled: boolean }>;
  listPageAccesses(id: string): Promise<{ id: string; userId: string | null; email: string | null; title: string; version: number; accessedAt: string }[]>;
  /** Stable id for cache keys. */
  readonly id: string;
  listPages(): Promise<AtlasListing>;
  listSections(): Promise<AtlasSection[]>;
  createSection(title: string): Promise<void>;
  /** Renames a section; its slug (used for categories and links) is left alone. */
  renameSection(id: string, title: string): Promise<void>;
  /** Retires a section. Its pages are untouched and show at the top level; nothing is hard-deleted. */
  deleteSection(id: string): Promise<void>;
  createPage(input: NewPageInput): Promise<{ id: string; historyRecorded: boolean }>;
  /** Draft/live autosave: never bumps the version, never changes status. */
  autosave(input: AutosaveInput): Promise<void>;
  /** Save as a new version (Publish / Update / Save): bumps `version`, clears the draft copy, records history. */
  saveVersion(input: PublishInput): Promise<{ historyRecorded: boolean }>;
  discardDraft(id: string): Promise<void>;
  movePages(updates: PlacementMove[]): Promise<void>;
  patchPage(id: string, patch: { status?: AtlasStatus; title?: string; props?: AtlasProps }): Promise<void>;
  setContexts(id: string, slugs: string[]): Promise<void>;
  /** Permanent removal. Atlas itself archives; this exists for spaces whose capability map allows it. */
  removePage(id: string): Promise<void>;
  listVersions(id: string): Promise<AtlasVersion[]>;
  restoreVersion(id: string, version: AtlasVersion): Promise<void>;
  /** People who can be @-mentioned or shown as owners. */
  searchPeople(query: string): Promise<{ id: string; name: string }[]>;
  personName(id: string): Promise<string | null>;
  /** Title, summary and body search over pages the caller can read. */
  search(query: string, options?: { spaceIds?: string[]; limit?: number }): Promise<AtlasHit[]>;
}
