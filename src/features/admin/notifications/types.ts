export type AdminNotificationEventType = "runtime_error" | "sync_progress" | "task_reminder";

export type AdminNotificationSeverity = "info" | "warning" | "error";

export interface AdminNotificationEvent {
  id: string;
  type: AdminNotificationEventType;
  title: string;
  message: string;
  createdAt: string;
  severity: AdminNotificationSeverity;
  href?: string;
  meta?: Record<string, unknown>;
}
