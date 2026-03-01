import { getRuntimeErrorLog } from "@/lib/runtimeErrorLog";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";

const SOURCE_LABEL: Record<string, string> = {
  "window.error": "Window error",
  "window.unhandledrejection": "Unhandled rejection",
  toast: "Runtime alert",
};

export function getRuntimeErrorNotifications(limit = 8): AdminNotificationEvent[] {
  return getRuntimeErrorLog()
    .slice(0, limit)
    .map((entry) => ({
      id: `runtime_error:${entry.id}`,
      type: "runtime_error",
      title: entry.title,
      message: `${SOURCE_LABEL[entry.source] ?? entry.source}${entry.detail ? ` · ${entry.detail}` : ""}`,
      createdAt: entry.timestamp,
      severity: "error",
      href: "/admin/settings/runtime-errors",
      meta: {
        source: entry.source,
        route: entry.route,
      },
    }));
}
