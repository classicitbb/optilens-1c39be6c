export type PublicWebSource = { title: string; url: string; snippet: string; emails: string[] };

export function buildResearchQuery(contact: { name: string; business_name?: string | null; city?: string | null; country_code?: string | null }) {
  return [contact.name, contact.business_name, contact.city, contact.country_code].filter(Boolean).join(" ").slice(0, 400);
}

/** Search results are evidence to review, never a verified identity or automatic write. */
export function parseResearchSources(payload: unknown): PublicWebSource[] {
  const data = (payload as { data?: { web?: unknown[] } })?.data;
  const rows = data?.web;
  if (!Array.isArray(rows)) throw new Error("Public search returned an unexpected response.");
  const seen = new Set<string>();
  return rows.slice(0, 8).flatMap((row) => {
    const item = row as Record<string, unknown>;
    if (typeof item.url !== "string") return [];
    let url: URL;
    try { url = new URL(item.url); } catch { return []; }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || seen.has(url.href)) return [];
    seen.add(url.href);
    const text = [item.description, item.markdown].filter((value): value is string => typeof value === "string").join("\n").slice(0, 30000);
    const emails = [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].slice(0, 10);
    return [{ title: typeof item.title === "string" ? item.title.slice(0, 240) : url.hostname,
      url: url.href, snippet: typeof item.description === "string" ? item.description.slice(0, 800) : text.slice(0, 800), emails }];
  });
}

export async function researchPublicWeb(apiKey: string, query: string): Promise<PublicWebSource[]> {
  const response = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 8, sources: ["web"], scrapeOptions: { formats: ["markdown"] }, timeout: 25000 }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Public web search failed (${response.status}).`);
  return parseResearchSources(await response.json());
}
