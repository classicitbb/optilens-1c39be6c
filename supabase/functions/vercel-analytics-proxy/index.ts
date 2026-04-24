import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createCorsPolicy,
  getCorsHeaders,
  handleCorsPreflight,
  rejectDisallowedOrigin,
} from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

// Vercel REST API base. Endpoints used:
//   GET /web-analytics/summary?projectId=&from=&to=&teamId=
//   GET /speed-insights/data?projectId=&from=&to=&teamId=
// Required Supabase secrets: VERCEL_TOKEN, VERCEL_PROJECT_ID
// Optional Supabase secret:  VERCEL_TEAM_ID
const VERCEL_API = "https://vercel.com/api";

export interface VercelAnalyticsBackup {
  visitors: number | null;
  bounceRate: number | null; // 0–100 percent
  avgSessionSeconds: number | null;
  returningUsers: number | null;
  lcp: number | null; // ms p75
  inp: number | null; // ms p75
  cls: number | null; // score p75
}

const corsPolicy = createCorsPolicy();

serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;

  const originRejection = rejectDisallowedOrigin(req, corsPolicy);
  if (originRejection) return originRejection;

  const corsHeaders = getCorsHeaders(req, corsPolicy);

  const authContext = await requirePrivilegedAccess(req, corsHeaders, {
    allowedRoles: ["admin", "ops"],
    sourceFunction: "vercel-analytics-proxy",
  });
  if (authContext instanceof Response) return authContext;

  try {
    const vercelToken = Deno.env.get("VERCEL_TOKEN");
    const projectId = Deno.env.get("VERCEL_PROJECT_ID");
    const teamId = Deno.env.get("VERCEL_TEAM_ID");

    if (!vercelToken || !projectId) {
      return jsonResponse({ available: false, reason: "vercel_not_configured" }, corsHeaders);
    }

    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const teamParam = teamId ? `&teamId=${encodeURIComponent(teamId)}` : "";
    const baseParams =
      `projectId=${encodeURIComponent(projectId)}` +
      `&from=${encodeURIComponent(from.toISOString())}` +
      `&to=${encodeURIComponent(to.toISOString())}` +
      teamParam;

    const authHeaders: HeadersInit = {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/json",
    };

    const [webResult, vitalsResult] = await Promise.allSettled([
      fetch(`${VERCEL_API}/web-analytics/summary?${baseParams}`, { headers: authHeaders }),
      fetch(`${VERCEL_API}/speed-insights/data?${baseParams}`, { headers: authHeaders }),
    ]);

    // deno-lint-ignore no-explicit-any
    let web: any = null;
    // deno-lint-ignore no-explicit-any
    let vitals: any = null;

    if (webResult.status === "fulfilled" && webResult.value.ok) {
      web = await webResult.value.json().catch(() => null);
    }
    if (vitalsResult.status === "fulfilled" && vitalsResult.value.ok) {
      vitals = await vitalsResult.value.json().catch(() => null);
    }

    // Vercel may nest summary under .summary or return it at the top level.
    // bounceRate is expressed as 0–1 by the API, convert to 0–100 for the UI.
    const summary = web?.summary ?? web ?? null;
    const rawBounce = summary?.bounceRate ?? null;

    const backup: VercelAnalyticsBackup = {
      visitors: summary?.visitors ?? null,
      bounceRate: rawBounce !== null ? Math.round(rawBounce * (rawBounce <= 1 ? 100 : 1) * 10) / 10 : null,
      avgSessionSeconds: summary?.visitDuration ?? null,
      returningUsers: null, // Vercel summary does not expose a returning-visitor count
      lcp: vitals?.data?.lcp?.p75 ?? vitals?.lcp?.p75 ?? null,
      inp: vitals?.data?.inp?.p75 ?? vitals?.inp?.p75 ?? null,
      cls: vitals?.data?.cls?.p75 ?? vitals?.cls?.p75 ?? null,
    };

    return jsonResponse({ available: true, data: backup }, corsHeaders);
  } catch (err) {
    console.error("vercel-analytics-proxy error:", err);
    // Return a non-error status so the dashboard degrades gracefully.
    return jsonResponse({ available: false, reason: "internal_error" }, corsHeaders);
  }
});

function jsonResponse(body: unknown, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
