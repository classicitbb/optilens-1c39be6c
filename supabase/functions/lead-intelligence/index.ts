import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { googlePlacesProvider } from "./providers/googlePlaces.ts";
import { firecrawlSearchProvider } from "./providers/firecrawlSearch.ts";
import type { LeadCandidate, ProviderAdapter } from "./providers/types.ts";
import { loadScoringWeights, scoreLead } from "./scoring.ts";
import { buildSearchTasks, dedupeCandidates, type SearchTask } from "./candidates.ts";
import { isAiConfigured } from "./ai/gateway.ts";
import { fallbackPlan, planSearch } from "./ai/planner.ts";
import { qualifyCandidates, type QualifiedLead, type RejectedCandidate } from "./ai/qualifier.ts";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy();

/** Candidates handed to the qualifier in one call. */
const MAX_CANDIDATES_TO_QUALIFY = 40;
const DEFAULT_LEAD_LIMIT = 25;

type ProviderTelemetry = {
  attempted: boolean;
  resultCount: number;
  latencyMs: number;
  errorCode: string | null;
};

type EmptyReason =
  | "no_providers_configured"
  | "provider_failures"
  | "no_matches"
  | "no_qualified_matches";

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
  supabaseClient: any,
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

/**
 * Runs every configured provider across every search task in parallel and
 * merges the telemetry per provider.
 */
async function runProviders(
  providers: ProviderAdapter[],
  tasks: SearchTask[],
  credentials: Record<string, string>,
): Promise<{ candidates: LeadCandidate[]; telemetry: Record<string, ProviderTelemetry> }> {
  const telemetry: Record<string, ProviderTelemetry> = {};
  const candidates: LeadCandidate[] = [];

  for (const provider of providers) {
    const configured = provider.isConfigured(credentials);
    telemetry[provider.id] = {
      attempted: configured,
      resultCount: 0,
      latencyMs: 0,
      errorCode: configured ? null : "NOT_CONFIGURED",
    };
  }

  const runs = providers
    .filter((provider) => provider.isConfigured(credentials))
    .flatMap((provider) =>
      tasks.map(async (task) => {
        const start = performance.now();
        try {
          const result = await provider.search({ ...task, credentials });
          return { providerId: provider.id, latencyMs: Math.round(performance.now() - start), result, error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
          return { providerId: provider.id, latencyMs: Math.round(performance.now() - start), result: [] as LeadCandidate[], error: message };
        }
      })
    );

  for (const outcome of await Promise.all(runs)) {
    const entry = telemetry[outcome.providerId];
    entry.resultCount += outcome.result.length;
    entry.latencyMs = Math.max(entry.latencyMs, outcome.latencyMs);
    // Keep the first error seen for this provider.
    if (outcome.error && !entry.errorCode) entry.errorCode = outcome.error;
    candidates.push(...outcome.result);
  }

  // A provider that returned rows on any task did not fail overall.
  for (const entry of Object.values(telemetry)) {
    if (entry.resultCount > 0) entry.errorCode = null;
  }

  return { candidates, telemetry };
}

async function loadProviderCredentials(
  supabaseClient: any,
): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabaseClient.rpc("get_lead_provider_credentials" as any, {
      p_tenant_key: "default",
    } as any);
    if (error || !data || typeof data !== "object") {
      return {};
    }

    const entries = Object.entries(data as Record<string, unknown>)
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => [key, String(value).trim()]);

    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

const ICP_FALLBACK_SUMMARY =
  "Optical retailers, eye clinics and regional optical chains across the Caribbean and diaspora, " +
  "buying wholesale lenses, coatings and optical supplies on a recurring basis.";

serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy);
  if (originBlocked) return originBlocked;

  try {
    const authContext = await requirePrivilegedAccess(req, corsHeaders, {
      allowedRoles: ["admin"],
      sourceFunction: "lead-intelligence",
    });
    if (authContext instanceof Response) {
      return authContext;
    }
    const supabaseClient = authContext.supabaseUserClient;

    const body = await req.json();
    const { brief, query, pipeline, includeDiagnostics, limit, icpSummary } = body ?? {};

    // `query` is the legacy field name, still used by the CRM name typeahead.
    const rawBrief = typeof brief === "string" && brief.trim().length > 0
      ? brief.trim()
      : typeof query === "string" ? query.trim() : "";

    if (!rawBrief) {
      return new Response(JSON.stringify({ error: "Describe the leads you are looking for." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // "lookup" is the cheap path used by typeahead: providers only, no AI.
    const searchPipeline: "brief" | "lookup" = pipeline === "lookup" ? "lookup" : "brief";
    const leadLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(50, Number(limit))) : DEFAULT_LEAD_LIMIT;

    const compliance = validateTargetingInput(rawBrief);
    if (compliance.blocked) {
      await logBlockedLeadEvent(supabaseClient, {
        source: "lead_intelligence",
        blocked_category: compliance.category,
        matched_term: compliance.matchedTerm,
        query: rawBrief,
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

    const aiConfigured = isAiConfigured();
    const aiStatus: { plannerUsed: boolean; qualifierUsed: boolean; error: string | null } = {
      plannerUsed: false,
      qualifierUsed: false,
      error: aiConfigured ? null : "AI_NOT_CONFIGURED",
    };

    // Step 1 - understand the brief.
    let plan = fallbackPlan(rawBrief);
    if (searchPipeline === "brief" && aiConfigured) {
      try {
        const icpContext = typeof icpSummary === "string" && icpSummary.trim().length > 0
          ? icpSummary.trim()
          : ICP_FALLBACK_SUMMARY;
        plan = await planSearch(rawBrief, icpContext);
        aiStatus.plannerUsed = true;
      } catch (error) {
        aiStatus.error = error instanceof Error ? error.message : "AI_PLANNER_FAILED";
      }
    }

    // A planned query can introduce terms the operator's brief did not contain.
    const blockedPlannedQuery = plan.searchQueries
      .map((planned) => ({ planned, result: validateTargetingInput(planned) }))
      .find((entry) => entry.result.blocked);
    if (blockedPlannedQuery) {
      await logBlockedLeadEvent(supabaseClient, {
        source: "lead_intelligence",
        blocked_category: blockedPlannedQuery.result.category,
        matched_term: blockedPlannedQuery.result.matchedTerm,
        query: blockedPlannedQuery.planned,
      });
      return new Response(JSON.stringify({
        error: formatComplianceError("Lead search request", blockedPlannedQuery.result),
        compliant_alternatives: blockedPlannedQuery.result.alternatives,
        blocked_category: blockedPlannedQuery.result.category,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2 - fetch grounded results.
    const providerCredentials = await loadProviderCredentials(supabaseClient);
    const providers: ProviderAdapter[] = [googlePlacesProvider, firecrawlSearchProvider];
    const providerStatus = {
      googlePlacesConfigured: googlePlacesProvider.isConfigured(providerCredentials),
      firecrawlSearchConfigured: firecrawlSearchProvider.isConfigured(providerCredentials),
      aiConfigured,
    };

    const tasks = buildSearchTasks(plan);
    const { candidates: rawCandidates, telemetry } = await runProviders(providers, tasks, providerCredentials);
    const candidates = dedupeCandidates(rawCandidates);

    // Step 3 - keep only the rows that are real businesses matching the brief.
    let qualified: QualifiedLead[] = [];
    let rejected: RejectedCandidate[] = [];

    if (searchPipeline === "brief" && aiConfigured && candidates.length > 0) {
      try {
        const result = await qualifyCandidates(
          rawBrief,
          candidates.slice(0, MAX_CANDIDATES_TO_QUALIFY),
          { mustHave: plan.mustHave, exclude: plan.exclude },
        );
        qualified = result.qualified;
        rejected = result.rejected;
        aiStatus.qualifierUsed = true;
      } catch (error) {
        aiStatus.error = error instanceof Error ? error.message : "AI_QUALIFIER_FAILED";
      }
    }

    // Without a qualifier pass, pass provider rows through unjudged rather than
    // returning nothing - a degraded list beats a blank page.
    const unqualified = !aiStatus.qualifierUsed;
    if (unqualified) {
      qualified = candidates.map((candidate) => ({
        ...candidate,
        fit_score: 0,
        fit_reason: "Not AI-qualified; showing the raw provider result.",
      }));
    }

    // Step 4 - score and rank.
    const scoringWeights = await loadScoringWeights(supabaseClient);
    const leads = qualified
      .map((lead) => {
        const scored = scoreLead(lead, scoringWeights, {
          country: lead.country ?? undefined,
          city: lead.city ?? undefined,
          query: rawBrief,
        });
        return {
          ...lead,
          // The AI fit score is the headline when we have one; the factor
          // breakdown still feeds the scoring-outcome reweight loop.
          score: unqualified ? scored.score : lead.fit_score,
          lead_score_breakdown: scored.lead_score_breakdown,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, leadLimit);

    const providersUsed = Object.entries(telemetry)
      .filter(([, data]) => data.attempted && data.resultCount > 0)
      .map(([providerId]) => providerId);

    const telemetryEntries = Object.values(telemetry);
    const attemptedEntries = telemetryEntries.filter((entry) => entry.attempted);
    const attemptedWithFailures = attemptedEntries.filter((entry) => entry.errorCode !== null);

    let emptyReason: EmptyReason | null = null;
    if (leads.length === 0) {
      if (attemptedEntries.length === 0) {
        emptyReason = "no_providers_configured";
      } else if (attemptedWithFailures.length === attemptedEntries.length) {
        emptyReason = "provider_failures";
      } else if (candidates.length > 0) {
        emptyReason = "no_qualified_matches";
      } else {
        emptyReason = "no_matches";
      }
    }

    const diagnostics = {
      pipeline: searchPipeline,
      brief: rawBrief,
      plan: {
        interpretation: plan.interpretation,
        businessTypes: plan.businessTypes,
        locations: plan.locations,
        searchQueries: plan.searchQueries,
        mustHave: plan.mustHave,
        exclude: plan.exclude,
        aiPlanned: plan.aiPlanned,
      },
      aiStatus,
      providerStatus,
      providersUsed,
      providerTelemetry: telemetry,
      candidatesFound: candidates.length,
      qualifiedCount: leads.length,
      rejected: rejected.slice(0, 10),
      emptyReason,
      fetchedAt: new Date().toISOString(),
    };

    let searchRunId: string | null = null;
    try {
      const { data: runData } = await supabaseClient.from("lead_search_runs" as any).insert({
        mode: searchPipeline === "brief" ? "autopilot" : "manual",
        query_input: rawBrief,
        strategy_constraints: { mustHave: plan.mustHave, exclude: plan.exclude, businessTypes: plan.businessTypes },
        selected_intent: {
          interpretation: plan.interpretation,
          searchQueries: plan.searchQueries,
          locations: plan.locations,
          aiPlanned: plan.aiPlanned,
        },
        provider_scope: { tasks },
        providers_used: providersUsed,
        provider_telemetry: telemetry,
        leads_count: leads.length,
      } as any).select("id").single();

      searchRunId = runData?.id ?? null;
    } catch {
      // silently ignore run persistence failures
    }

    const leadsWithRunId = leads.map((lead) => ({ ...lead, search_run_id: searchRunId }));

    return new Response(JSON.stringify({
      leads: leadsWithRunId,
      diagnostics: includeDiagnostics ? { ...diagnostics, searchRunId } : null,
    }), {
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
