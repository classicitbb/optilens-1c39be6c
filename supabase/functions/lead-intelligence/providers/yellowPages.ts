import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getApiKey = (credentials?: Record<string, string>) =>
  credentials?.["yellow_pages"]?.trim() ?? Deno.env.get("YELLOWPAGES_API_KEY")?.trim() ?? "";

const search = async ({ credentials }: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const apiKey = getApiKey(credentials);
  if (!apiKey) {
    throw new Error("NOT_CONFIGURED");
  }

  return [];
};

export const yellowPagesProvider: ProviderAdapter = {
  id: "yellow_pages",
  isConfigured: (credentials) => Boolean(getApiKey(credentials)),
  search,
};
