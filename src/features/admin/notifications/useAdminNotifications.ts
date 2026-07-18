import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";
import { getRuntimeErrorNotifications } from "@/features/admin/notifications/sources/runtimeErrorSource";
import { getSyncProgressNotifications } from "@/features/admin/notifications/sources/syncProgressSource";
import { getTaskReminderNotifications } from "@/features/admin/notifications/sources/taskReminderSource";
import { getDatabaseNotifications } from "@/features/admin/notifications/sources/databaseNotificationSource";
import { clearRuntimeErrorLog, clearRuntimeErrorLogEntry, RUNTIME_ERROR_LOG_EVENT } from "@/lib/runtimeErrorLog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const isBrowser = typeof window !== "undefined";
const LOCAL_RECEIPTS_KEY = "optilens.admin_notification_receipts";
const RUNTIME_ERROR_PREFIX = "runtime_error:";

type LocalReceiptState = Record<string, { read?: boolean; dismissed?: boolean }>;

function getLocalReceipts(): LocalReceiptState {
  if (!isBrowser) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_RECEIPTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed as LocalReceiptState : {};
  } catch {
    return {};
  }
}

function saveLocalReceipts(receipts: LocalReceiptState) {
  if (isBrowser) window.localStorage.setItem(LOCAL_RECEIPTS_KEY, JSON.stringify(receipts));
}

function isPersistedNotification(id: string) {
  return !id.startsWith(RUNTIME_ERROR_PREFIX) && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function useAdminNotifications() {
  const { user } = useAuth();
  const [localReceipts, setLocalReceipts] = useState<LocalReceiptState>(getLocalReceipts);
  const [pendingReceipts, setPendingReceipts] = useState<LocalReceiptState>({});

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
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    staleTime: 60_000,
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
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    staleTime: 60_000,
  });

  const notifications = notificationsQuery.data ?? [];
  const receiptState = useMemo(() => {
    const state: LocalReceiptState = {};
    for (const row of receiptsQuery.data ?? []) {
      state[row.notification_id] = { read: !!row.read_at, dismissed: !!row.dismissed_at };
    }
    return { ...state, ...localReceipts, ...pendingReceipts };
  }, [localReceipts, pendingReceipts, receiptsQuery.data]);
  const readIds = new Set(Object.entries(receiptState).filter(([, receipt]) => receipt.read).map(([id]) => id));
  const dismissedIds = new Set(Object.entries(receiptState).filter(([, receipt]) => receipt.dismissed).map(([id]) => id));

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

  const updateLocalReceipt = useCallback((id: string, change: LocalReceiptState[string]) => {
    setLocalReceipts((current) => {
      const next = { ...current, [id]: { ...current[id], ...change } };
      saveLocalReceipts(next);
      return next;
    });
  }, []);

  const persistReceipt = useCallback(async (id: string, change: LocalReceiptState[string]) => {
    if (!isPersistedNotification(id)) {
      updateLocalReceipt(id, change);
      return true;
    }
    if (!user) return false;

    setPendingReceipts((current) => ({ ...current, [id]: { ...current[id], ...change } }));
    const { error } = await (supabase as any)
      .from("admin_notification_receipts")
      .upsert({ user_id: user.id, notification_id: id, ...(change.read ? { read_at: new Date().toISOString() } : {}), ...(change.dismissed ? { dismissed_at: new Date().toISOString() } : {}) }, { onConflict: "user_id,notification_id" });
    setPendingReceipts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (error) return false;
    await receiptsQuery.refetch();
    return true;
  }, [receiptsQuery, updateLocalReceipt, user]);

  const markRead = useCallback((id: string) => persistReceipt(id, { read: true }), [persistReceipt]);

  const markAllRead = useCallback(async () => {
    const outcomes = await Promise.all(visibleNotifications.map((notification) => persistReceipt(notification.id, { read: true })));
    return outcomes.every(Boolean);
  }, [persistReceipt, visibleNotifications]);

  const clearNotification = useCallback(async (id: string) => {
    if (id.startsWith(RUNTIME_ERROR_PREFIX)) {
      clearRuntimeErrorLogEntry(id.slice(RUNTIME_ERROR_PREFIX.length));
      return true;
    }
    return persistReceipt(id, { dismissed: true });
  }, [persistReceipt]);

  const clearAll = useCallback(async () => {
    const runtimeErrors = visibleNotifications.filter((notification) => notification.id.startsWith(RUNTIME_ERROR_PREFIX));
    if (runtimeErrors.length > 0) clearRuntimeErrorLog();
    const remaining = visibleNotifications.filter((notification) => !notification.id.startsWith(RUNTIME_ERROR_PREFIX));
    const outcomes = await Promise.all(remaining.map((notification) => persistReceipt(notification.id, { dismissed: true })));
    return outcomes.every(Boolean);
  }, [persistReceipt, visibleNotifications]);

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
    markRead: (id: string) => Promise<boolean>;
    markAllRead: () => Promise<boolean>;
    clearNotification: (id: string) => Promise<boolean>;
    clearAll: () => Promise<boolean>;
  };
}
