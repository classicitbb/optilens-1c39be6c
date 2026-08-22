import { supabase } from "@/integrations/supabase/client";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";

export async function getDatabaseNotifications(limit = 8): Promise<AdminNotificationEvent[]> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    let query = (supabase as any)
      .from("admin_notifications")
      .select("id,event_type,severity,title,message,href,metadata,created_at")
      .order("created_at", { ascending: false });
    if (userId) query = query.or(`related_user_id.is.null,related_user_id.eq.${userId}`);
    const { data, error } = await query.limit(limit);

    if (error) throw error;

    return ((data ?? []) as Array<Record<string, any>>).map((row) => ({
      id: String(row.id),
      type: row.event_type === "abandoned_cart" ? "customer_alert" : "task_reminder",
      title: String(row.title ?? "Notification"),
      message: String(row.message ?? ""),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      severity: row.severity === "error" || row.severity === "warning" ? row.severity : "info",
      href: typeof row.href === "string" ? row.href : undefined,
      meta: typeof row.metadata === "object" && row.metadata !== null ? row.metadata : undefined,
    }));
  } catch {
    return [];
  }
}
