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
    const onWindowError = (event: ErrorEvent) => {
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

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
