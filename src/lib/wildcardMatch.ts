import { fuzzyFieldsMatch } from "./fuzzyMatch";

/**
 * Wildcard-aware string matching for search fields.
 * Supports `%` as a wildcard that matches any sequence of characters.
 * If no `%` is present, falls back to standard substring matching (includes).
 *
 * Examples:
 *   wildcardMatch("hello world", "hel%rld")  → true
 *   wildcardMatch("hello world", "%world")   → true
 *   wildcardMatch("hello world", "hello")    → true  (no wildcard = includes)
 */
export function wildcardMatch(text: string, pattern: string): boolean {
  if (!pattern.includes("%")) {
    return text.includes(pattern);
  }
  // Convert the pattern into a regex: split on %, escape each segment, join with .*
  const segments = pattern.split("%").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(segments.join(".*"), "i");
  return regex.test(text);
}

/**
 * Helper: test if ANY of the given fields match the query.
 * If the query contains `%`, uses wildcard matching.
 * Otherwise uses fuzzy matching (Fuse.js) with substring fallback.
 * All comparisons are case-insensitive.
 */
export function fieldsMatch(query: string, ...fields: (string | undefined | null)[]): boolean {
  const q = query.toLowerCase();
  // Explicit wildcard → use wildcard matcher
  if (q.includes("%")) {
    return fields.some((f) => f != null && wildcardMatch(f.toLowerCase(), q));
  }
  // Substring match first (fast path)
  if (fields.some((f) => f != null && f.toLowerCase().includes(q))) {
    return true;
  }
  // Fuzzy fallback
  return fuzzyFieldsMatch(q, ...fields);
}
