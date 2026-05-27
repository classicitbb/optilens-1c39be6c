import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type VercelAnalyticsBackup = {
  visitors: number | null;
  bounceRate: number | null;
  avgSessionSeconds: number | null;
  returningUsers: number | null;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
};

export interface WebsiteAnalyticsMetric {
  label: string;
  value: string;
  trend: string;
}

export interface WebsiteAnalyticsOverview {
  metrics: WebsiteAnalyticsMetric[];
  webVitals: WebsiteAnalyticsMetric[];
}

type SessionRow = {
  visitor_id: string;
  pageview_count: number;
  duration_seconds: number;
  is_returning_visitor: boolean;
};

type WebVitalRow = {
  metric_name: string;
  metric_value: number;
};

const numberFormatter = new Intl.NumberFormat("en-US");

const formatSignedPercent = (current: number, previous: number, improveWhenLower = false) => {
  if (previous === 0 && current === 0) return "Flat vs last week";
  if (previous === 0) return improveWhenLower ? "New baseline" : "New growth";

  const delta = ((current - previous) / previous) * 100;
  const display = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;

  if (improveWhenLower) {
    return delta <= 0 ? `${display} improvement` : `${display} increase`;
  }

  return `${display} vs last week`;
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";

  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);

  if (minutes === 0) return `${remainder}s`;
  return `${minutes}m ${remainder}s`;
};

const formatDurationTrend = (current: number, previous: number) => {
  const delta = Math.round(current - previous);
  if (delta === 0) return "Flat vs last week";
  return `${delta > 0 ? "+" : ""}${delta} seconds`;
};

const percentile = (values: number[], target: number) => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(target * sorted.length) - 1));
  return sorted[index] ?? null;
};

const buildMetricSnapshot = (sessions: SessionRow[], orderCount: number, abandonedCartCount: number) => {
  const visitorCount = new Set(sessions.map((session) => session.visitor_id)).size;
  const bounceRate = sessions.length
    ? (sessions.filter((session) => Number(session.pageview_count ?? 0) <= 1).length / sessions.length) * 100
    : 0;
  const averageSessionSeconds = sessions.length
    ? sessions.reduce((total, session) => total + Number(session.duration_seconds ?? 0), 0) / sessions.length
    : 0;
  const returningUsers = new Set(
    sessions.filter((session) => Boolean(session.is_returning_visitor)).map((session) => session.visitor_id),
  ).size;
  const conversionRate = sessions.length ? (orderCount / sessions.length) * 100 : 0;

  return {
    visitorCount,
    bounceRate,
    abandonedCartCount,
    conversionRate,
    averageSessionSeconds,
    returningUsers,
  };
};

const formatVitalValue = (metricName: string, value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "No data";
  if (metricName === "CLS") return value.toFixed(3);
  return `${Math.round(value)}ms`;
};

// Fetch Vercel Analytics backup via the edge-function proxy.
// Returns null when the proxy is unavailable or unconfigured.
const fetchVercelBackup = async (): Promise<VercelAnalyticsBackup | null> => {
  try {
    const { data, error } = await (supabase.functions as any).invoke("vercel-analytics-proxy");
    if (error || !data?.available) return null;
    return (data.data as VercelAnalyticsBackup) ?? null;
  } catch {
    return null;
  }
};

export const useWebsiteAnalyticsOverview = () => {
  return useQuery({
    queryKey: ["admin-dashboard", "website-analytics-overview"],
    queryFn: async (): Promise<WebsiteAnalyticsOverview> => {
      const now = new Date();
      const currentStart = subDays(now, 7).toISOString();
      const previousStart = subDays(now, 14).toISOString();

      const [
        currentSessionsResult,
        previousSessionsResult,
        currentOrdersResult,
        previousOrdersResult,
        currentAlertsResult,
        previousAlertsResult,
        currentVitalsResult,
      ] = await Promise.all([
        (supabase.from("website_analytics_sessions") as any)
          .select("visitor_id,pageview_count,duration_seconds,is_returning_visitor")
          .gte("started_at", currentStart),
        (supabase.from("website_analytics_sessions") as any)
          .select("visitor_id,pageview_count,duration_seconds,is_returning_visitor")
          .gte("started_at", previousStart)
          .lt("started_at", currentStart),
        (supabase.from("orders") as any).select("id", { count: "exact", head: true }).gte("created_at", currentStart),
        (supabase.from("orders") as any).select("id", { count: "exact", head: true }).gte("created_at", previousStart).lt("created_at", currentStart),
        (supabase.from("abandoned_cart_alerts") as any).select("id", { count: "exact", head: true }).gte("last_detected_at", currentStart),
        (supabase.from("abandoned_cart_alerts") as any).select("id", { count: "exact", head: true }).gte("last_detected_at", previousStart).lt("last_detected_at", currentStart),
        (supabase.from("website_analytics_web_vitals") as any)
          .select("metric_name,metric_value")
          .gte("occurred_at", currentStart),
      ]);

      if (currentSessionsResult.error) throw currentSessionsResult.error;
      if (previousSessionsResult.error) throw previousSessionsResult.error;
      if (currentOrdersResult.error) throw currentOrdersResult.error;
      if (previousOrdersResult.error) throw previousOrdersResult.error;
      if (currentAlertsResult.error) throw currentAlertsResult.error;
      if (previousAlertsResult.error) throw previousAlertsResult.error;
      if (currentVitalsResult.error) throw currentVitalsResult.error;

      const currentSnapshot = buildMetricSnapshot(
        (currentSessionsResult.data ?? []) as SessionRow[],
        currentOrdersResult.count ?? 0,
        currentAlertsResult.count ?? 0,
      );
      const previousSnapshot = buildMetricSnapshot(
        (previousSessionsResult.data ?? []) as SessionRow[],
        previousOrdersResult.count ?? 0,
        previousAlertsResult.count ?? 0,
      );

      const vitals = (currentVitalsResult.data ?? []) as WebVitalRow[];
      let lcp = percentile(vitals.filter((row) => row.metric_name === "LCP").map((row) => Number(row.metric_value ?? 0)), 0.75);
      let inp = percentile(vitals.filter((row) => row.metric_name === "INP").map((row) => Number(row.metric_value ?? 0)), 0.75);
      let cls = percentile(vitals.filter((row) => row.metric_name === "CLS").map((row) => Number(row.metric_value ?? 0)), 0.75);

      // When Supabase has no session data yet, pull from Vercel Analytics as backup.
      const primaryIsEmpty = currentSnapshot.visitorCount === 0;
      const vitalsEmpty = lcp === null && inp === null && cls === null;

      let vercel: VercelAnalyticsBackup | null = null;
      if (primaryIsEmpty || vitalsEmpty) {
        vercel = await fetchVercelBackup();
      }

      // Fill missing visitor-based metrics from Vercel when Supabase has no sessions.
      const effectiveVisitors = primaryIsEmpty && vercel?.visitors != null ? vercel.visitors : currentSnapshot.visitorCount;
      const effectiveBounceRate = primaryIsEmpty && vercel?.bounceRate != null ? vercel.bounceRate : currentSnapshot.bounceRate;
      const effectiveAvgSession = primaryIsEmpty && vercel?.avgSessionSeconds != null ? vercel.avgSessionSeconds : currentSnapshot.averageSessionSeconds;
      const effectiveReturning = primaryIsEmpty && vercel?.returningUsers != null ? vercel.returningUsers : currentSnapshot.returningUsers;

      // Fill missing web vitals from Vercel when Supabase has no vitals rows.
      if (vitalsEmpty && vercel) {
        lcp = vercel.lcp;
        inp = vercel.inp;
        cls = vercel.cls;
      }

      const usingVercel = primaryIsEmpty && vercel !== null;
      const vercelTrend = "Via Vercel Analytics";

      return {
        metrics: [
          {
            label: "Visitors",
            value: numberFormatter.format(effectiveVisitors),
            trend: usingVercel && vercel?.visitors != null ? vercelTrend : formatSignedPercent(currentSnapshot.visitorCount, previousSnapshot.visitorCount),
          },
          {
            label: "Bounce Rate",
            value: `${effectiveBounceRate.toFixed(1)}%`,
            trend: usingVercel && vercel?.bounceRate != null ? vercelTrend : formatSignedPercent(currentSnapshot.bounceRate, previousSnapshot.bounceRate, true),
          },
          {
            label: "Abandoned Carts",
            value: numberFormatter.format(currentSnapshot.abandonedCartCount),
            trend: formatSignedPercent(currentSnapshot.abandonedCartCount, previousSnapshot.abandonedCartCount, true),
          },
          {
            label: "Conversion Rate",
            value: `${currentSnapshot.conversionRate.toFixed(1)}%`,
            trend: formatSignedPercent(currentSnapshot.conversionRate, previousSnapshot.conversionRate),
          },
          {
            label: "Avg. Session Time",
            value: formatDuration(effectiveAvgSession),
            trend: usingVercel && vercel?.avgSessionSeconds != null ? vercelTrend : formatDurationTrend(currentSnapshot.averageSessionSeconds, previousSnapshot.averageSessionSeconds),
          },
          {
            label: "Returning Users",
            value: numberFormatter.format(effectiveReturning),
            trend: usingVercel && vercel?.returningUsers != null ? vercelTrend : formatSignedPercent(currentSnapshot.returningUsers, previousSnapshot.returningUsers),
          },
        ],
        webVitals: [
          { label: "LCP (p75)", value: formatVitalValue("LCP", lcp), trend: vitalsEmpty && vercel?.lcp != null ? vercelTrend : "Live web metric" },
          { label: "INP (p75)", value: formatVitalValue("INP", inp), trend: vitalsEmpty && vercel?.inp != null ? vercelTrend : "Live web metric" },
          { label: "CLS (p75)", value: formatVitalValue("CLS", cls), trend: vitalsEmpty && vercel?.cls != null ? vercelTrend : "Live web metric" },
        ],
      };
    },
  });
};
