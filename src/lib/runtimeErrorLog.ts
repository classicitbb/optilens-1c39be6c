import { supabase } from "@/integrations/supabase/client";

export type RuntimeErrorLogEntry = {
  id: string;
  timestamp: string;
  source: "toast" | "window.error" | "window.unhandledrejection" | "window.resource_error" | "react.error_boundary";
  title: string;
  detail?: string;
  route?: string;
};

const STORAGE_KEY = "optilens.runtime_error_log";
const MAX_ENTRIES = 100;
export const RUNTIME_ERROR_LOG_EVENT = "optilens:runtime-error-log:updated";

const isBrowser = typeof window !== "undefined";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readLogEntries(): RuntimeErrorLogEntry[] {
  if (!isBrowser) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RuntimeErrorLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLogEntries(entries: RuntimeErrorLogEntry[]) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // intentionally ignore storage failures
  }
}

function getBrowserName() {
  if (!isBrowser) return undefined;
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "opera";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "safari";
  if (/Chrome/i.test(ua)) return "chrome";
  return "unknown";
}

const postedKeys = new Set<string>();

function dedupeKey(entry: RuntimeErrorLogEntry) {
  return `${entry.source}:${entry.title}:${entry.detail ?? ""}:${entry.route ?? ""}`;
}

function postToServer(entry: RuntimeErrorLogEntry) {
  const key = dedupeKey(entry);
  if (postedKeys.has(key)) return;
  postedKeys.add(key);

  const session = supabase.auth.getSession();
  // Only post server-side when we have a session. Anonymous/public errors stay
  // in localStorage only to avoid opening an unauthenticated write surface.
  session.then(({ data }) => {
    if (!data.session) return;
    (supabase as any)
      .from("runtime_error_events")
      .insert({
        user_id: data.session.user.id,
        route: entry.route,
        source: entry.source,
        title: entry.title,
        detail: entry.detail,
        release_version: import.meta.env.VITE_APP_VERSION,
        user_agent: isBrowser ? navigator.userAgent : undefined,
        browser: getBrowserName(),
        url: isBrowser ? window.location.href : undefined,
      })
      .then(({ error }: { error: Error | null }) => {
        if (error) {
          // Non-blocking: keep localStorage as the durable fallback.
          console.error("[runtime-error] failed to persist to server", error);
        }
      });
  });
}

export function addRuntimeErrorLog(entry: Omit<RuntimeErrorLogEntry, "id" | "timestamp" | "route"> & { route?: string }) {
  const nextEntry: RuntimeErrorLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    route: isBrowser ? window.location.pathname : entry.route,
    ...entry,
  };

  const current = readLogEntries();
  writeLogEntries([nextEntry, ...current]);

  if (isBrowser) {
    window.dispatchEvent(new CustomEvent(RUNTIME_ERROR_LOG_EVENT, { detail: nextEntry }));
  }

  // One-line console diagnostic for test automation/Codex capture.
  console.error(
    `[runtime-error] ${nextEntry.timestamp} | ${nextEntry.source} | ${nextEntry.title} | ${nextEntry.detail ?? ""} | ${nextEntry.route ?? ""}`,
  );

  postToServer(nextEntry);
}

export function getRuntimeErrorLog() {
  return readLogEntries();
}

export function clearRuntimeErrorLog() {
  writeLogEntries([]);
  if (isBrowser) window.dispatchEvent(new CustomEvent(RUNTIME_ERROR_LOG_EVENT));
}

export function clearRuntimeErrorLogEntry(id: string) {
  writeLogEntries(readLogEntries().filter((entry) => entry.id !== id));
  if (isBrowser) window.dispatchEvent(new CustomEvent(RUNTIME_ERROR_LOG_EVENT));
}
