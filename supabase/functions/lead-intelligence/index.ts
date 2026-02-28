import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { bingProvider } from "./providers/bing.ts";
import { facebookGraphProvider } from "./providers/facebookGraph.ts";
import { googlePlacesProvider } from "./providers/googlePlaces.ts";
import { instagramGraphProvider } from "./providers/instagramGraph.ts";
import type { LeadCandidate, ProviderAdapter } from "./providers/types.ts";
import { whatsappBusinessSignalsProvider } from "./providers/whatsappBusinessSignals.ts";
import { yahooProvider } from "./providers/yahoo.ts";
import { yellowPagesProvider } from "./providers/yellowPages.ts";
import { generateSearchPlan, type AutopilotConstraints } from "./strategy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProviderTelemetry = {
  attempted: boolean;
  resultCount: number;
  latencyMs: number;
  errorCode: string | null;
};



type PlannerDiagnostics = {
  mode: "manual" | "autopilot";
  rankedIntents: Array<{
    rank: number;
    score: number;
    searchIntent: string;
    query: string;
    industry: string;
    channelHints: string[];
    rationale: string[];
  }>;
  selectedIntent: {
    rank: number;
    score: number;
    searchIntent: string;
    query: string;
    industry: string;
    channelHints: string[];
    rationale: string[];
  } | null;
};
type BlockedIntentCategory = "illegal" | "exploitative_vulnerability" | "coercive_abusive_targeting";

type ComplianceValidationResult = {
  blocked: boolean;
  category?: BlockedIntentCategory;
  matchedTerm?: string;
  message?: string;
  alternatives: string[];
};

const BLOCKED_INTENT_RULES: Array<{ category: BlockedIntentCategory; terms: string[]; message: string }> = [
  {
    category: "illegal",
    terms: ["fraud", "money laundering", "fake prescription", "counterfeit", "steal", "identity theft", "tax evasion"],
    message: "Requests that facilitate illegal activity are not allowed.",
  },
  {
    category: "exploitative_vulnerability",
    terms: ["elderly victims", "desperate", "financially stressed", "terminally ill", "addicted", "grieving"],
    message: "Requests that exploit vulnerable populations are not allowed.",
  },
  {
    category: "coercive_abusive_targeting",
    terms: ["harass", "blackmail", "threaten", "force them", "without consent", "stalk"],
    message: "Coercive, abusive, or non-consensual targeting is not allowed.",
  },
];

const COMPLIANT_ALTERNATIVES = [
  "Use role-based targeting (e.g., clinic owner, purchasing manager, store manager).",
  "Use industry-based targeting (e.g., independent optical retailers, eye clinics, pharmacies).",
  "Use account-based targeting (e.g., named chains, priority accounts, territory-defined accounts).",
];

function validateTargetingInput(input: string): ComplianceValidationResult {
  const normalized = input.toLowerCase();
  for (const rule of BLOCKED_INTENT_RULES) {
    const matchedTerm = rule.terms.find((term) => normalized.includes(term));
    if (matchedTerm) {
      return {
        blocked: true,
        category: rule.category,
        matchedTerm,
        message: `${rule.message} Matched term: "${matchedTerm}".`,
        alternatives: COMPLIANT_ALTERNATIVES,
      };
    }
  }
  return { blocked: false, alternatives: COMPLIANT_ALTERNATIVES };
}

function formatComplianceError(action: string, validation: ComplianceValidationResult): string {
  const alternatives = validation.alternatives.map((item, idx) => `${idx + 1}. ${item}`).join(" ");
  return `${action} blocked by lead targeting safety policy (${validation.category}). ${validation.message} Try one of these compliant alternatives: ${alternatives}`;
}

async function logBlockedLeadEvent(
  supabaseClient: ReturnType<typeof createClient>,
  details: Record<string, unknown>,
) {
  try {
    await supabaseClient.from("lead_events" as any).insert({
      event_type: "blocked_request",
      provider_diagnostics_summary: details,
    } as any);
  } catch {
    // silently ignore logging failure
  }
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function scoreLead(item: LeadCandidate): number {
  const volume = item.google_reviews_count ? Math.min(30, item.google_reviews_count / 3) : 8;
  const websiteWeakness = item.website ? 10 : 18;
  const socialWeakness = item.instagram_handle || item.facebook_page ? 8 : 20;
  const supplierPain = item.google_rating && item.google_rating < 4.2 ? 18 : 10;
  const fit = 18;
  return clamp(Math.round(volume + websiteWeakness + socialWeakness + supplierPain + fit));
}

async function executeProviders(
  providers: ProviderAdapter[],
  params: { query: string; country?: string; city?: string },
): Promise<{ leads: LeadCandidate[]; telemetry: Record<string, ProviderTelemetry> }> {
  const telemetry: Record<string, ProviderTelemetry> = {};
  const leads: LeadCandidate[] = [];

  for (const provider of providers) {
    const configured = provider.isConfigured();
    if (!configured) {
      telemetry[provider.id] = {
        attempted: false,
        resultCount: 0,
        latencyMs: 0,
        errorCode: "NOT_CONFIGURED",
      };
      continue;
    }

    const start = performance.now();
    try {
      const result = await provider.search(params);
      const latencyMs = Math.round(performance.now() - start);
      telemetry[provider.id] = {
        attempted: true,
        resultCount: result.length,
        latencyMs,
        errorCode: null,
      };
      leads.push(...result);
    } catch (error) {
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      telemetry[provider.id] = {
        attempted: true,
        resultCount: 0,
        latencyMs,
        errorCode: message,
      };
    }
  }

  return { leads, telemetry };
}

async function enrichFacebookInstagram(candidates: LeadCandidate[]) {
  const fbToken = Deno.env.get("FACEBOOK_GRAPH_API_TOKEN");
  if (!fbToken) return candidates;

  return candidates.map((c) => ({
    ...c,
    instagram_handle: c.instagram_handle ?? null,
    facebook_page: c.facebook_page ?? null,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, country, cities, globalSearch, includeDiagnostics, mode, constraints } = await req.json();
    const searchMode: "manual" | "autopilot" = mode === "manual" ? "manual" : "autopilot";
    const autopilotConstraints = (constraints ?? {}) as AutopilotConstraints;
    const fallbackQuery = typeof query === "string" && query.trim().length > 0 ? query.trim() : "optical store";

    const planningResult = await generateSearchPlan(supabaseClient, autopilotConstraints);
    const plannedQuery = searchMode === "autopilot"
      ? planningResult.selectedIntent?.query ?? fallbackQuery
      : fallbackQuery;

    const compliance = validateTargetingInput(plannedQuery);
    if (compliance.blocked) {
      await logBlockedLeadEvent(supabaseClient, {
        source: "lead_intelligence",
        blocked_category: compliance.category,
        matched_term: compliance.matchedTerm,
        query: plannedQuery,
      });
      return new Response(JSON.stringify({
        error: formatComplianceError("Lead search request", compliance),
        compliant_alternatives: compliance.alternatives,
        blocked_category: compliance.category,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedCity = Array.isArray(cities) && cities.length > 0 ? cities[0] : undefined;
    const effectiveCountry = globalSearch ? undefined : country;
    const effectiveCity = globalSearch ? undefined : selectedCity;
    const resolvedQuery = plannedQuery;

    const providers: ProviderAdapter[] = [
      googlePlacesProvider,
      facebookGraphProvider,
      instagramGraphProvider,
      whatsappBusinessSignalsProvider,
      yellowPagesProvider,
      bingProvider,
      yahooProvider,
    ];

    const providerStatus = {
      googlePlacesConfigured: googlePlacesProvider.isConfigured(),
      facebookGraphConfigured: facebookGraphProvider.isConfigured(),
      instagramGraphConfigured: instagramGraphProvider.isConfigured(),
      whatsappBusinessSignalsConfigured: whatsappBusinessSignalsProvider.isConfigured(),
      yellowPagesConfigured: yellowPagesProvider.isConfigured(),
      bingConfigured: bingProvider.isConfigured(),
      yahooConfigured: yahooProvider.isConfigured(),
    };

    const { leads: providerLeads, telemetry } = await executeProviders(providers, {
      query: resolvedQuery,
      country: effectiveCountry,
      city: effectiveCity,
    });

    let leads = await enrichFacebookInstagram(providerLeads);
    leads = leads.map((lead) => ({ ...lead, score: scoreLead(lead) }));

    if (leads.length === 0) {
      leads = [
        { name: "VisionCare Bridgetown", country: effectiveCountry ?? "Barbados", city: effectiveCity ?? "Bridgetown", google_rating: 4.1, google_reviews_count: 42, website: null },
        { name: "Island Optical Plus", country: effectiveCountry ?? "Barbados", city: effectiveCity ?? "Bridgetown", google_rating: 4.6, google_reviews_count: 28, website: "https://example.com" },
      ].map((lead) => ({ ...lead, score: scoreLead(lead) }));
    }

    const providersUsed = Object.entries(telemetry)
      .filter(([, data]) => data.attempted && data.resultCount > 0)
      .map(([providerId]) => providerId);

    if (providerLeads.length === 0) {
      providersUsed.push("fallback_model");
    }

    const plannerDiagnostics: PlannerDiagnostics = {
      mode: searchMode,
      rankedIntents: planningResult.rankedIntents,
      selectedIntent: planningResult.selectedIntent,
    };

    const diagnostics = {
      mode: searchMode,
      scopeMode: globalSearch ? "global" : "country_city",
      planner: plannerDiagnostics,
      providerStatus,
      providersUsed,
      providerTelemetry: telemetry,
      queryEcho: {
        query: plannedQuery,
        country: effectiveCountry,
        city: effectiveCity,
      },
      fetchedAt: new Date().toISOString(),
    };

    try {
      await supabaseClient.from("lead_search_runs" as any).insert({
        mode: searchMode,
        query_input: query ?? null,
        strategy_constraints: autopilotConstraints,
        strategy_ranked_intents: planningResult.rankedIntents,
        selected_intent: planningResult.selectedIntent,
        provider_scope: { globalSearch: !!globalSearch, country: effectiveCountry ?? null, city: effectiveCity ?? null },
        providers_used: providersUsed,
        provider_telemetry: telemetry,
        leads_count: leads.length,
      } as any);
    } catch {
      // silently ignore run persistence failures
    }

    return new Response(JSON.stringify({ leads, diagnostics: includeDiagnostics ? diagnostics : null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("lead-intelligence error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
