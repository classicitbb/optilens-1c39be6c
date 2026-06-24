import { supabase } from "@/integrations/supabase/client";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";

type PaymentGatewaySettings = {
  status: "not_configured" | "connected" | "error";
  enabled: boolean;
  updated_at: string;
};

// Surfaces the Scotia eCom+ payment-gateway configuration state as an admin
// notification. (Replaces the former Odoo sync-progress source.)
export async function getSyncProgressNotifications(): Promise<AdminNotificationEvent[]> {
  const { data } = await (supabase.from("payment_gateway_settings") as any)
    .select("status,enabled,updated_at")
    .eq("tenant_key", "default")
    .maybeSingle();

  const settings = (data ?? null) as PaymentGatewaySettings | null;
  if (!settings) return [];

  const event: AdminNotificationEvent = {
    id: `payment_gateway:status:${settings.status}:${settings.updated_at}`,
    type: "sync_progress",
    title: "Payment gateway status",
    message:
      settings.status === "connected"
        ? settings.enabled
          ? "Scotia eCom+ is configured and live."
          : "Scotia eCom+ is configured but live processing is disabled."
        : settings.status === "error"
          ? "Payment gateway requires attention."
          : "Payment gateway is not configured.",
    createdAt: settings.updated_at,
    severity:
      settings.status === "error"
        ? "error"
        : settings.status === "connected"
          ? "info"
          : "warning",
    href: "/admin/settings/integrations",
  };

  return [event];
}
