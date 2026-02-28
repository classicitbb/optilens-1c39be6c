import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getToken = () => Deno.env.get("WHATSAPP_BUSINESS_TOKEN")?.trim() ?? "";

const search = async (_params: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const token = getToken();
  if (!token) {
    throw new Error("NOT_CONFIGURED");
  }

  // Policy-compliant behavior: no personal/profile discovery from WhatsApp data.
  // Only account-owned aggregate signals may be used, so this adapter currently returns no leads.
  return [];
};

export const whatsappBusinessSignalsProvider: ProviderAdapter = {
  id: "whatsapp_business_signals",
  isConfigured: () => Boolean(getToken()),
  search,
};
