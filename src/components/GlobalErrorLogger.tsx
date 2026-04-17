import { useEffect } from "react";
import { addRuntimeErrorLog } from "@/lib/runtimeErrorLog";

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

      addRuntimeErrorLog({
        source: "window.error",
        title: event.message || "Unhandled window error",
        detail: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      addRuntimeErrorLog({
        source: "window.unhandledrejection",
        title: "Unhandled promise rejection",
        detail: normalizeReason(event.reason),
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
