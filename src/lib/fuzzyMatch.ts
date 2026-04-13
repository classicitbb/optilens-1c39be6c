import Fuse from "fuse.js";

/**
 * Fuzzy-match a query against multiple field values.
 * Returns true if the query fuzzy-matches any of the provided fields.
 * Uses Fuse.js with a threshold of 0.3 (fairly strict).
 */
export function fuzzyFieldsMatch(query: string, ...fields: (string | undefined | null)[]): boolean {
  const items = fields
    .filter((f): f is string => f != null && f.length > 0)
    .map((value) => ({ value }));

  if (items.length === 0) return false;

  const fuse = new Fuse(items, {
    keys: ["value"],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });

  return fuse.search(query).length > 0;
}
