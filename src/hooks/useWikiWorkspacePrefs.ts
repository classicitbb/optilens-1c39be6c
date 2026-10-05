import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Per-browser workspace preferences. Favorites are scoped by user id so two
 * staff on one machine don't share them. Page icon, cover and full-width live
 * here too until the schema has a place for them (they do not sync).
 */
const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: preference is session-only */
  }
};

function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readJson(key, fallback));

  useEffect(() => {
    setValue(readJson(key, fallback));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === "function" ? (next as (c: T) => T)(current) : next;
        writeJson(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
}

export function useWikiFavorites() {
  const { user } = useAuth();
  const [ids, setIds] = useStoredState<string[]>(`wiki-favorites:${user?.id ?? "anon"}`, []);

  const toggle = useCallback(
    (id: string) => setIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id])),
    [setIds],
  );

  return { favoriteIds: ids, isFavorite: (id: string) => ids.includes(id), toggleFavorite: toggle };
}

export interface WikiPageMeta {
  icon?: string;
  cover?: boolean;
  fullWidth?: boolean;
}

export function useWikiPageMeta() {
  const [meta, setMeta] = useStoredState<Record<string, WikiPageMeta>>("wiki-page-meta", {});

  const patch = useCallback(
    (id: string, next: Partial<WikiPageMeta>) => setMeta((current) => ({ ...current, [id]: { ...current[id], ...next } })),
    [setMeta],
  );

  return { pageMeta: meta, patchPageMeta: patch };
}

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 360;
export const SIDEBAR_DEFAULT = 244;

export function useWikiSidebarState() {
  const [width, setWidthRaw] = useStoredState<number>("wiki-sidebar-width", SIDEBAR_DEFAULT);
  const [collapsed, setCollapsed] = useStoredState<boolean>(
    "wiki-sidebar-collapsed",
    typeof window !== "undefined" && window.innerWidth < 768,
  );
  const setWidth = useCallback(
    (next: number) => setWidthRaw(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(next)))),
    [setWidthRaw],
  );
  return { width, setWidth, collapsed, setCollapsed };
}

/** Expanded tree rows persist per browser. */
export function useWikiExpanded() {
  const [ids, setIds] = useStoredState<string[]>("wiki-tree-expanded", []);
  const toggle = useCallback(
    (id: string, force?: boolean) =>
      setIds((current) => {
        const open = force ?? !current.includes(id);
        const without = current.filter((x) => x !== id);
        return open ? [...without, id] : without;
      }),
    [setIds],
  );
  return { expanded: new Set(ids), toggleExpanded: toggle };
}

/** "Updates" badge: pages edited by others since the user last opened the list. */
export function useWikiUpdatesSeen() {
  const { user } = useAuth();
  const [seenAt, setSeenAt] = useStoredState<number>(`wiki-updates-seen:${user?.id ?? "anon"}`, 0);
  return { seenAt, markSeen: () => setSeenAt(Date.now()) };
}
