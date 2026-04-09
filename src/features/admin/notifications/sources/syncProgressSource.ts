import { supabase } from "@/integrations/supabase/client";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";

type IntegrationConnection = {
  id: string;
  status: "not_configured" | "connected" | "error";
  updated_at: string;
};

type IntegrationSyncJob = {
  id: string;
  sync_kind: "initial" | "incremental";
  status: "queued" | "running" | "success" | "failed";
  requested_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export async function getSyncProgressNotifications(): Promise<AdminNotificationEvent[]> {
  const { data: connection } = await supabase
    .from("integration_connections")
    .select("id,status,updated_at")
    .eq("provider", "odoo")
    .eq("tenant_key", "default")
    .maybeSingle();

  const typedConnection = (connection ?? null) as IntegrationConnection | null;
  if (!typedConnection) return [];

  const { data: jobs } = await supabase
    .from("integration_sync_jobs")
    .select("id,sync_kind,status,requested_at,completed_at,error_message")
    .eq("integration_connection_id", typedConnection.id)
    .order("requested_at", { ascending: false })
    .limit(5);

  const typedJobs = (jobs ?? []) as IntegrationSyncJob[];

  const connectionEvent: AdminNotificationEvent = {
    id: `sync_progress:connection:${typedConnection.id}:${typedConnection.updated_at}`,
    type: "sync_progress",
    title: "Odoo integration status",
    message:
      typedConnection.status === "connected"
        ? "Connection healthy."
        : typedConnection.status === "error"
          ? "Integration requires attention."
          : "Integration is not configured.",
    createdAt: typedConnection.updated_at,
    severity: typedConnection.status === "error" ? "error" : typedConnection.status === "connected" ? "info" : "warning",
    href: "/admin/settings/integrations",
  };

  const jobEvents = typedJobs.map<AdminNotificationEvent>((job) => ({
    id: `sync_progress:job:${job.id}`,
    type: "sync_progress",
    title: `${job.sync_kind === "initial" ? "Initial" : "Incremental"} sync ${job.status}`,
    message: job.error_message ?? "Recent integration sync activity.",
    createdAt: job.completed_at ?? job.requested_at,
    severity: job.status === "failed" ? "error" : job.status === "running" || job.status === "queued" ? "warning" : "info",
    href: "/admin/settings/integrations",
  }));

  return [connectionEvent, ...jobEvents];
}
