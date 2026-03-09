import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminNotificationEvent } from "@/features/admin/notifications/types";
import { getRuntimeErrorNotifications } from "@/features/admin/notifications/sources/runtimeErrorSource";
import { getSyncProgressNotifications } from "@/features/admin/notifications/sources/syncProgressSource";
import { getTaskReminderNotifications } from "@/features/admin/notifications/sources/taskReminderSource";
import { RUNTIME_ERROR_LOG_EVENT } from "@/lib/runtimeErrorLog";

const READ_STORAGE_KEY = "optilens.admin.notifications.read";
const DISMISSED_STORAGE_KEY = "optilens.admin.notifications.dismissed";

const isBrowser = typeof window !== "undefined";

function readSet(storageKey: string): Set<string> {
  if (!isBrowser) return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeSet(storageKey: string, values: Set<string>) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(values)));
  } catch {
    // Ignore storage write failures (private mode, quota exceeded, blocked policies).
  }
}

export function useAdminNotifications() {
  const [readIds, setReadIds] = useState<Set<string>>(() => readSet(READ_STORAGE_KEY));
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readSet(DISMISSED_STORAGE_KEY));

  const notificationsQuery = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const [runtimeErrors, syncProgress, taskReminders] = await Promise.all([
        Promise.resolve(getRuntimeErrorNotifications(8)),
        getSyncProgressNotifications(),
        getTaskReminderNotifications(),
      ]);
      return [...runtimeErrors, ...syncProgress, ...taskReminders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const notifications = notificationsQuery.data ?? [];

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
    const next = new Set(readIds);
    next.add(id);
    writeSet(READ_STORAGE_KEY, next);
    setReadIds(next);
  };

  const markAllRead = () => {
    const next = new Set(readIds);
    visibleNotifications.forEach((notification) => next.add(notification.id));
    writeSet(READ_STORAGE_KEY, next);
    setReadIds(next);
  };

  const clearNotification = (id: string) => {
    const next = new Set(dismissedIds);
    next.add(id);
    writeSet(DISMISSED_STORAGE_KEY, next);
    setDismissedIds(next);
  };

  const clearAll = () => {
    const next = new Set(dismissedIds);
    visibleNotifications.forEach((notification) => next.add(notification.id));
    writeSet(DISMISSED_STORAGE_KEY, next);
    setDismissedIds(next);
  };

  return {
    notifications: visibleNotifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
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
