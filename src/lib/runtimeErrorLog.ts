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
}

export function getRuntimeErrorLog() {
  return readLogEntries();
}

export function clearRuntimeErrorLog() {
  writeLogEntries([]);
}
