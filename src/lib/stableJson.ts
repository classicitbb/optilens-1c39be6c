/**
 * JSON.stringify with object keys sorted, so two values that are equal compare equal as strings.
 * Needed because Postgres jsonb stores keys in its own order: a document read back from the
 * database never stringifies the same as the one that was written.
 */
export const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const entries = Object.keys(value as Record<string, unknown>)
    .sort()
    .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
  return `{${entries.join(",")}}`;
};

export const sameJson = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);
