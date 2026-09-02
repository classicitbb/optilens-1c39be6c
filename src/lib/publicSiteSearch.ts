import { SITE_SEARCH_INDEX } from "@/lib/siteSearchIndex";
import type { PublicContentEntry } from "@/lib/generated/publicContentIndex";

/**
 * Search across the prose of every public page.
 *
 * The generated index (src/lib/generated/publicContentIndex.ts) holds the real
 * headings, sentences and image alt text lifted from each page component, so a
 * query matches words a visitor can actually see rather than the hand-curated
 * keyword list in siteSearchIndex.ts. That curated list is still used, for the
 * page titles and as an extra keyword haystack.
 *
 * The index is ~175KB, so callers should load it with `loadPublicContentIndex`
 * (a dynamic import) rather than importing it at module scope.
 */

export interface PageSearchHit {
  path: string;
  title: string;
  /** The matching sentence, trimmed to a readable window around the query. */
  snippet: string;
  /** Character offset of the match inside `snippet`, for highlighting. */
  matchStart: number;
  matchLength: number;
  /** How many separate phrases on the page matched. Drives ranking. */
  matchCount: number;
  /** True when the query matched image alt text rather than body copy. */
  viaAltText: boolean;
}

const PHRASE_SEPARATOR = " · ";
const SNIPPET_PADDING = 70;

const curatedByPath = new Map(SITE_SEARCH_INDEX.map((entry) => [entry.path, entry]));

/** Fall back to a readable name when a route has no curated title. */
const prettifyPath = (path: string) => {
  const last = path.split("/").filter(Boolean).pop();
  if (!last) return "Home";
  return last.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export const resolvePageTitle = (entry: PublicContentEntry) =>
  curatedByPath.get(entry.path)?.title ?? entry.headings[0] ?? prettifyPath(entry.path);

/** Trim a long phrase to a window centred on the match. */
const toSnippet = (phrase: string, index: number, queryLength: number) => {
  if (phrase.length <= SNIPPET_PADDING * 2 + queryLength) {
    return { snippet: phrase, matchStart: index };
  }

  const rawStart = Math.max(0, index - SNIPPET_PADDING);
  // Start at a word boundary so the snippet doesn't open mid-word.
  const boundary = rawStart === 0 ? 0 : phrase.indexOf(" ", rawStart);
  const start = boundary >= 0 && boundary < index ? boundary + 1 : rawStart;
  const end = Math.min(phrase.length, index + queryLength + SNIPPET_PADDING);

  const snippet = `${start > 0 ? "..." : ""}${phrase.slice(start, end)}${end < phrase.length ? "..." : ""}`;

  return { snippet, matchStart: index - start + (start > 0 ? 3 : 0) };
};

export const searchPublicPages = (
  index: PublicContentEntry[],
  rawQuery: string,
  limit = 12,
): PageSearchHit[] => {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < 2) return [];

  const hits: PageSearchHit[] = [];

  for (const entry of index) {
    const phrases = entry.text.split(PHRASE_SEPARATOR);
    const altSet = new Set(entry.alts);

    let best: { phrase: string; index: number } | null = null;
    let matchCount = 0;
    let viaAltText = false;

    for (const phrase of phrases) {
      const index = phrase.toLowerCase().indexOf(query);
      if (index < 0) continue;

      matchCount += 1;

      // Prefer the earliest match in the shortest phrase - short phrases are
      // usually headings or labels, which make the most legible snippets.
      if (!best || phrase.length < best.phrase.length) {
        best = { phrase, index };
        viaAltText = altSet.has(phrase);
      }
    }

    // Also match the curated keyword list, so a synonym that never appears
    // verbatim on the page ("b2b", "varifocal") still finds it.
    if (!best) {
      const curated = curatedByPath.get(entry.path);
      const keywordHit = curated?.keywords?.find((keyword) => keyword.toLowerCase().includes(query));
      if (keywordHit) {
        hits.push({
          path: entry.path,
          title: resolvePageTitle(entry),
          snippet: curated?.description ?? "",
          matchStart: -1,
          matchLength: 0,
          matchCount: 1,
          viaAltText: false,
        });
      }
      continue;
    }

    const { snippet, matchStart } = toSnippet(best.phrase, best.index, query.length);

    hits.push({
      path: entry.path,
      title: resolvePageTitle(entry),
      snippet,
      matchStart,
      matchLength: query.length,
      matchCount,
      viaAltText,
    });
  }

  return hits.sort((left, right) => right.matchCount - left.matchCount).slice(0, limit);
};

/**
 * Load the generated index on demand. Keeps ~175KB of page prose out of the
 * initial bundle - it is only needed once someone actually types a query.
 */
let indexPromise: Promise<PublicContentEntry[]> | null = null;

export const loadPublicContentIndex = () => {
  indexPromise ??= import("@/lib/generated/publicContentIndex").then(
    (module) => module.PUBLIC_CONTENT_INDEX,
  );
  return indexPromise;
};
