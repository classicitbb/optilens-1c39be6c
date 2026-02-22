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
 * Helper: test if ANY of the given fields match the query (with wildcard support).
 * All comparisons are case-insensitive.
 */
export function fieldsMatch(query: string, ...fields: (string | undefined | null)[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f != null && wildcardMatch(f.toLowerCase(), q));
}
