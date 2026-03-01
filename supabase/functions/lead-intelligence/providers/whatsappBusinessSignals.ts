import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getToken = (credentials?: Record<string, string>) =>
  credentials?.["whatsapp_business_signals"]?.trim() ?? Deno.env.get("WHATSAPP_BUSINESS_TOKEN")?.trim() ?? "";

const search = async ({ credentials }: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const token = getToken(credentials);
  if (!token) {
    throw new Error("NOT_CONFIGURED");
  }

  return [];
};

export const whatsappBusinessSignalsProvider: ProviderAdapter = {
  id: "whatsapp_business_signals",
  isConfigured: (credentials) => Boolean(getToken(credentials)),
  search,
};
