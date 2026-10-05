export interface SearchDoc {
  id: string;
  title: string;
  /** Plain block text. */
  body: string;
  spaceId: string;
  status?: string;
  slug?: string | null;
  /** Secondary label shown on the result row (type, section, status). */
  meta?: string;
}

export interface SearchHit extends SearchDoc {
  /** Excerpt around the first body match, when the title did not match. */
  snippet?: string;
  score: number;
}

const SNIPPET_RADIUS = 48;

/**
 * Every whitespace-separated term must appear in the title or body. Title hits
 * outrank body hits; a title that starts with the query ranks first.
 */
export const searchDocs = (docs: SearchDoc[], query: string, limit = 20): SearchHit[] => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const phrase = terms.join(" ");

  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const body = doc.body.toLowerCase();
    if (!terms.every((term) => title.includes(term) || body.includes(term))) continue;

    const titleHasAll = terms.every((term) => title.includes(term));
    let score = 2;
    if (title.startsWith(phrase)) score = 0;
    else if (titleHasAll) score = 1;

    let snippet: string | undefined;
    if (!titleHasAll) {
      const at = body.indexOf(terms.find((term) => body.includes(term)) ?? terms[0]);
      if (at >= 0) {
        const start = Math.max(0, at - SNIPPET_RADIUS);
        const end = Math.min(doc.body.length, at + SNIPPET_RADIUS);
        snippet = `${start > 0 ? "…" : ""}${doc.body.slice(start, end).trim()}${end < doc.body.length ? "…" : ""}`;
      }
    }

    hits.push({ ...doc, snippet, score });
  }

  return hits.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title)).slice(0, limit);
};
