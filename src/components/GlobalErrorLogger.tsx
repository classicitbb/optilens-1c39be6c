import { useEffect } from "react";
import { addRuntimeErrorLog } from "@/lib/runtimeErrorLog";

const CHUNK_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Failed to load module script",
  "Cannot find module",
  "Loading chunk",
  "error loading dynamically imported module",
  "dynamically imported module",
];

function isChunkLoadError(message: string) {
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function hardReloadOnce() {
  if (typeof window === "undefined") return;
  const key = "optilens.chunk-reload-done";
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, Date.now().toString());
  } catch {
    // ignore storage errors
  }
  window.location.reload();
}

const normalizeReason = (reason: unknown) => {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "string") return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
};

export default function GlobalErrorLogger() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Resource load errors (img, video, script, link) don't have event.error
      // and target is the element itself, not window.
      if (event.target && event.target !== window) {
        const el = event.target as HTMLElement;
        const src =
          (el as HTMLImageElement).src ||
          (el as HTMLScriptElement).src ||
          (el as HTMLLinkElement).href ||
          el.tagName?.toLowerCase() ||
          "unknown";
        addRuntimeErrorLog({
          source: "window.resource_error",
          title: `Failed to load resource: ${el.tagName?.toLowerCase() ?? "element"}`,
          detail: src,
        });
        return;
      }

      const message = event.message || "Unhandled window error";
      if (isChunkLoadError(message)) {
        addRuntimeErrorLog({
          source: "window.error",
          title: "Stale deploy chunk load error — hard reloading",
          detail: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
        });
        hardReloadOnce();
        return;
      }

      addRuntimeErrorLog({
        source: "window.error",
        title: message,
        detail: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = normalizeReason(event.reason);
      if (isChunkLoadError(reason)) {
        addRuntimeErrorLog({
          source: "window.unhandledrejection",
          title: "Stale deploy chunk load error — hard reloading",
          detail: reason,
        });
        hardReloadOnce();
        return;
      }

      addRuntimeErrorLog({
        source: "window.unhandledrejection",
        title: "Unhandled promise rejection",
        detail: reason,
      });
    };

    // Use capture phase so resource load errors (which don't bubble) are caught too.
    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
