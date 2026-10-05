import { canonicalToSearchText } from "@/lib/wikiCanonical";
import { pageInSavedView, type AtlasSavedView } from "../spaces";
import type { AtlasPage, AtlasStatus } from "../source/types";

export type SortKey = "updated" | "title" | "status";
export type StatusFilter = "active" | "all" | AtlasStatus;

export interface DatabaseQuery {
  view?: AtlasSavedView;
  status: StatusFilter;
  q: string;
  sort: SortKey;
}

export const STATUS_ORDER: AtlasStatus[] = ["draft", "published", "archived"];

export const parseSort = (value: string | null): SortKey => (value === "title" || value === "status" ? value : "updated");
export const parseStatusFilter = (value: string | null): StatusFilter =>
  value === "all" || value === "draft" || value === "published" || value === "archived" ? value : "active";

const matchesText = (page: AtlasPage, q: string): boolean => {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = `${page.draftTitle ?? page.title} ${page.title} ${String(page.props.description ?? "")} ${String(page.props.category ?? "")}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
};

/** Rows for a database view: saved-view filter, title/description search, status filter, then sort. */
export const selectRows = (pages: AtlasPage[], query: DatabaseQuery, options: { ignoreStatus?: boolean } = {}): AtlasPage[] => {
  const rows = pages.filter((page) => {
    if (!pageInSavedView(query.view, page)) return false;
    if (!matchesText(page, query.q)) return false;
    if (options.ignoreStatus) return true;
    if (query.status === "all") return true;
    if (query.status === "active") return page.status !== "archived";
    return page.status === query.status;
  });
  const compare: Record<SortKey, (a: AtlasPage, b: AtlasPage) => number> = {
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    title: (a, b) => (a.draftTitle ?? a.title).localeCompare(b.draftTitle ?? b.title),
    status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (a.draftTitle ?? a.title).localeCompare(b.draftTitle ?? b.title),
  };
  return [...rows].sort(compare[query.sort]);
};

export const groupByStatus = (pages: AtlasPage[]): Record<AtlasStatus, AtlasPage[]> => {
  const groups: Record<AtlasStatus, AtlasPage[]> = { draft: [], published: [], archived: [] };
  for (const page of pages) groups[page.status].push(page);
  return groups;
};

export const bodyPreview = (page: AtlasPage, length = 160): string => {
  const text = canonicalToSearchText(page.draftDoc ?? page.doc) || page.summary || String(page.props.description ?? "");
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
};
