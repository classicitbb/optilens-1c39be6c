import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "website_analytics_visitor_id";
const SESSION_KEY = "website_analytics_session";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const EXCLUDED_PREFIXES = ["/admin", "/ops", "/profile", "/auth", "/portal", "/reset-password"];

type SessionState = {
  id: string;
  visitorId: string;
  startedAt: string;
  lastSeenAt: string;
  lastTrackedPath: string | null;
  pageviewCount: number;
  deviceType: string;
  referrerHost: string;
  isReturningVisitor: boolean;
};

type WebVitalPayload = {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating: string;
  pathname: string;
};

const nowIso = () => new Date().toISOString();

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const getReferrerHost = () => {
  if (typeof document === "undefined" || !document.referrer) return "Direct";

  try {
    const referrer = new URL(document.referrer);
    return referrer.hostname || "Direct";
  } catch {
    return "Direct";
  }
};

const getDeviceType = () => {
  if (typeof navigator === "undefined") return "desktop";

  const userAgent = navigator.userAgent.toLowerCase();
  if (/tablet|ipad/.test(userAgent)) return "tablet";
  if (/mobi|iphone|android/.test(userAgent)) return "mobile";
  return "desktop";
};

const ensureVisitorId = () => {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;

  const nextId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_KEY, nextId);
  return nextId;
};

const getStoredSession = () => {
  if (typeof window === "undefined") return null;
  return safeParse<SessionState>(window.sessionStorage.getItem(SESSION_KEY));
};

const persistSession = (session: SessionState) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const sessionIsExpired = (session: SessionState) => {
  const lastSeen = new Date(session.lastSeenAt).getTime();
  return Number.isNaN(lastSeen) || Date.now() - lastSeen > SESSION_TIMEOUT_MS;
};

const buildSession = (): SessionState => {
  const existingVisitorId = window.localStorage.getItem(VISITOR_KEY);
  const visitorId = ensureVisitorId();
  const timestamp = nowIso();

  return {
    id: crypto.randomUUID(),
    visitorId,
    startedAt: timestamp,
    lastSeenAt: timestamp,
    lastTrackedPath: null,
    pageviewCount: 0,
    deviceType: getDeviceType(),
    referrerHost: getReferrerHost(),
    isReturningVisitor: Boolean(existingVisitorId),
  };
};

const getOrCreateSession = () => {
  const stored = getStoredSession();
  if (stored && !sessionIsExpired(stored)) return stored;

  const session = buildSession();
  persistSession(session);
  return session;
};

const shouldTrackPath = (pathname: string) => {
  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  return pathname.startsWith("/");
};

const toSessionRow = (session: SessionState) => {
  const durationSeconds = Math.max(
    0,
    Math.round((new Date(session.lastSeenAt).getTime() - new Date(session.startedAt).getTime()) / 1000),
  );

  return {
    id: session.id,
    visitor_id: session.visitorId,
    started_at: session.startedAt,
    last_seen_at: session.lastSeenAt,
    landing_path: session.lastTrackedPath ?? "/",
    pageview_count: session.pageviewCount,
    duration_seconds: durationSeconds,
    engaged: session.pageviewCount > 1 || durationSeconds >= 10,
    is_returning_visitor: session.isReturningVisitor,
    device_type: session.deviceType,
    referrer_host: session.referrerHost,
    user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
    updated_at: nowIso(),
  };
};

const upsertSession = async (session: SessionState) => {
  await (supabase.from("website_analytics_sessions" as any) as any).upsert(toSessionRow(session), { onConflict: "id" });
};

export const trackPageView = async (pathname: string) => {
  if (typeof window === "undefined" || !shouldTrackPath(pathname)) return;

  const session = getOrCreateSession();
  if (session.lastTrackedPath === pathname) return;

  const timestamp = nowIso();
  session.lastSeenAt = timestamp;
  session.lastTrackedPath = pathname;
  session.pageviewCount += 1;
  persistSession(session);

  await Promise.allSettled([
    upsertSession(session),
    (supabase.from("website_analytics_pageviews" as any) as any).insert({
      session_id: session.id,
      visitor_id: session.visitorId,
      pathname,
      referrer_host: session.referrerHost,
      device_type: session.deviceType,
      occurred_at: timestamp,
    }),
  ]);
};

export const flushTrackedSession = async () => {
  if (typeof window === "undefined") return;

  const session = getStoredSession();
  if (!session || !session.lastTrackedPath) return;

  session.lastSeenAt = nowIso();
  persistSession(session);
  await upsertSession(session);
};

export const trackWebVital = async ({ id, name, value, delta, rating, pathname }: WebVitalPayload) => {
  if (typeof window === "undefined" || !shouldTrackPath(pathname)) return;

  const session = getOrCreateSession();
  session.lastSeenAt = nowIso();
  persistSession(session);

  await Promise.allSettled([
    upsertSession(session),
    (supabase.from("website_analytics_web_vitals" as any) as any).insert({
      session_id: session.id,
      visitor_id: session.visitorId,
      pathname,
      metric_id: id,
      metric_name: name,
      metric_value: value,
      metric_delta: delta,
      metric_rating: rating,
      device_type: session.deviceType,
      occurred_at: nowIso(),
    }),
  ]);
};

export const shouldTrackWebsitePath = shouldTrackPath;
