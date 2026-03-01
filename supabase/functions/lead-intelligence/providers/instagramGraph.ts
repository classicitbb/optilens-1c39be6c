import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getToken = (credentials?: Record<string, string>) =>
  credentials?.["instagram_graph"]?.trim() ?? Deno.env.get("FACEBOOK_GRAPH_API_TOKEN")?.trim() ?? "";

const search = async ({ credentials }: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const token = getToken(credentials);
  if (!token) {
    throw new Error("NOT_CONFIGURED");
  }

  return [];
};

export const instagramGraphProvider: ProviderAdapter = {
  id: "instagram_graph",
  isConfigured: (credentials) => Boolean(getToken(credentials)),
  search,
};
