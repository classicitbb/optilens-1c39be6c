import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";
import { getRuntimeErrorNotifications } from "@/features/admin/notifications/sources/runtimeErrorSource";
import { getSyncProgressNotifications } from "@/features/admin/notifications/sources/syncProgressSource";
import { getTaskReminderNotifications } from "@/features/admin/notifications/sources/taskReminderSource";
import { getDatabaseNotifications } from "@/features/admin/notifications/sources/databaseNotificationSource";
import { RUNTIME_ERROR_LOG_EVENT } from "@/lib/runtimeErrorLog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const isBrowser = typeof window !== "undefined";

export function useAdminNotifications() {
  const { user } = useAuth();

  const notificationsQuery = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const runtimeErrors = getRuntimeErrorNotifications(8);
      const [syncProgress, taskReminders, databaseNotifications] = await Promise.all([
        getSyncProgressNotifications(),
        getTaskReminderNotifications(),
        getDatabaseNotifications(),
      ]);
      return [...runtimeErrors, ...syncProgress, ...taskReminders, ...databaseNotifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);
    },
    refetchInterval: 30_000,
  });
  const receiptsQuery = useQuery({
    queryKey: ["admin-notification-receipts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_notification_receipts")
        .select("notification_id,read_at,dismissed_at")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as Array<{ notification_id: string; read_at: string | null; dismissed_at: string | null }>;
    },
    refetchInterval: 30_000,
  });

  const notifications = notificationsQuery.data ?? [];
  const readIds = new Set((receiptsQuery.data ?? []).filter((row) => !!row.read_at).map((row) => row.notification_id));
  const dismissedIds = new Set((receiptsQuery.data ?? []).filter((row) => !!row.dismissed_at).map((row) => row.notification_id));

  useEffect(() => {
    if (!isBrowser) return;

    const onRuntimeErrorLogged = () => {
      notificationsQuery.refetch();
    };

    window.addEventListener(RUNTIME_ERROR_LOG_EVENT, onRuntimeErrorLogged);
    return () => window.removeEventListener(RUNTIME_ERROR_LOG_EVENT, onRuntimeErrorLogged);
  }, [notificationsQuery.refetch]);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => !dismissedIds.has(notification.id)),
    [notifications, dismissedIds],
  );

  const unreadCount = visibleNotifications.filter((notification) => !readIds.has(notification.id)).length;

  const markRead = (id: string) => {
    if (!user) return;
    void (supabase as any)
      .from("admin_notification_receipts")
      .upsert({ user_id: user.id, notification_id: id, read_at: new Date().toISOString() }, { onConflict: "user_id,notification_id" })
      .then(() => receiptsQuery.refetch());
  };

  const markAllRead = () => {
    if (!user) return;
    void Promise.all(
      visibleNotifications.map((notification) =>
        (supabase as any)
          .from("admin_notification_receipts")
          .upsert({ user_id: user.id, notification_id: notification.id, read_at: new Date().toISOString() }, { onConflict: "user_id,notification_id" }),
      ),
    ).then(() => receiptsQuery.refetch());
  };

  const clearNotification = (id: string) => {
    if (!user) return;
    void (supabase as any)
      .from("admin_notification_receipts")
      .upsert({ user_id: user.id, notification_id: id, dismissed_at: new Date().toISOString() }, { onConflict: "user_id,notification_id" })
      .then(() => receiptsQuery.refetch());
  };

  const clearAll = () => {
    if (!user) return;
    void Promise.all(
      visibleNotifications.map((notification) =>
        (supabase as any)
          .from("admin_notification_receipts")
          .upsert({ user_id: user.id, notification_id: notification.id, dismissed_at: new Date().toISOString() }, { onConflict: "user_id,notification_id" }),
      ),
    ).then(() => receiptsQuery.refetch());
  };

  return {
    notifications: visibleNotifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading || receiptsQuery.isLoading,
    markRead,
    markAllRead,
    clearNotification,
    clearAll,
  } satisfies {
    notifications: AdminNotificationEvent[];
    unreadCount: number;
    isLoading: boolean;
    markRead: (id: string) => void;
    markAllRead: () => void;
    clearNotification: (id: string) => void;
    clearAll: () => void;
  };
}
