// Reads the reason from any release failure, including backend (Postgrest) error objects
// which are plain objects, not Error instances.
export function releaseErrorMessage(e: unknown): string | undefined {
  if (!e) return undefined;
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const o = e as { message?: unknown; details?: unknown };
    const parts = [o.message, o.details].filter((p): p is string => typeof p === "string" && p.trim() !== "");
    if (parts.length) return parts.join(" — ");
  }
  return undefined;
}

export const isNotPricedError = (msg?: string) => !!msg && /not priced/i.test(msg);
