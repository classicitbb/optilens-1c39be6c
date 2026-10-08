import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Per-browser workspace preferences. Favorites are scoped by user id so two
 * staff on one machine don't share them. Page icon, cover and full-width live
 * here too until the schema has a place for them (they do not sync).
 */
const sessionValues = new Map<string, string>();
const PREF_CHANGED = "atlas-preference-changed";
const readRaw = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key) ?? sessionValues.get(key) ?? null;
  } catch {
    return sessionValues.get(key) ?? null;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    sessionValues.delete(key);
  } catch {
    sessionValues.set(key, JSON.stringify(value));
  }
  window.dispatchEvent(new CustomEvent(PREF_CHANGED, { detail: key }));
};

function useStoredState<T>(key: string, fallback: T, legacyKey?: string) {
  // Snapshot strings are stable. Every consumer sees writes in this tab and other tabs;
  // changing accounts reads the new key during render, without exposing the previous value.
  const fallbackRaw = JSON.stringify(fallback);
  const snapshot = useCallback(() => readRaw(key) ?? (legacyKey ? readRaw(legacyKey) : null) ?? fallbackRaw, [key, legacyKey, fallbackRaw]);
  const subscribe = useCallback((notify: () => void) => {
    const changed = (event: Event) => {
      if (event instanceof StorageEvent ? event.key === null || event.key === key || event.key === legacyKey : (event as CustomEvent).detail === key) notify();
    };
    window.addEventListener("storage", changed);
    window.addEventListener(PREF_CHANGED, changed);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener(PREF_CHANGED, changed);
    };
  }, [key, legacyKey]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => fallbackRaw);
  const parse = useCallback((input: string): T => {
    try { return JSON.parse(input) as T; } catch { return JSON.parse(fallbackRaw) as T; }
  }, [fallbackRaw]);
  const value = useMemo(() => parse(raw), [raw, parse]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      const current = parse(snapshot());
      const resolved = typeof next === "function" ? (next as (c: T) => T)(current) : next;
      // Persist before a save/navigation can unmount the consumer.
      writeJson(key, resolved);
    },
    [key, parse, snapshot],
  );

  return [value, update] as const;
}

export function useAtlasFavorites() {
  const { user } = useAuth();
  const [ids, setIds] = useStoredState<string[]>(`atlas-favorites:${user?.id ?? "anon"}`, [], `wiki-favorites:${user?.id ?? "anon"}`);

  const toggle = useCallback(
    (id: string) => setIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id])),
    [setIds],
  );

  return { favoriteIds: ids, isFavorite: (id: string) => ids.includes(id), toggleFavorite: toggle };
}

export interface AtlasPageMeta {
  icon?: string;
  cover?: boolean;
  fullWidth?: boolean;
}

export function useAtlasPageMeta() {
  const [meta, setMeta] = useStoredState<Record<string, AtlasPageMeta>>("atlas-page-meta", {}, "wiki-page-meta");

  const patch = useCallback(
    (id: string, next: Partial<AtlasPageMeta>) => setMeta((current) => ({ ...current, [id]: { ...current[id], ...next } })),
    [setMeta],
  );

  return { pageMeta: meta, patchPageMeta: patch };
}

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 360;
export const SIDEBAR_DEFAULT = 244;

export function useAtlasSidebarState() {
  const { user } = useAuth();
  const owner = user?.id ?? "anon";
  // Shared legacy keys have no owner; importing them would leak another user's settings.
  const [storedWidth, setWidthRaw] = useStoredState<number>(`atlas-sidebar-width:${owner}`, SIDEBAR_DEFAULT);
  const [collapsed, setCollapsed] = useStoredState<boolean>(
    `atlas-sidebar-collapsed:${owner}`,
    typeof window !== "undefined" && window.innerWidth < 768,
  );
  const width = typeof storedWidth === "number" && Number.isFinite(storedWidth)
    ? Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(storedWidth))) : SIDEBAR_DEFAULT;
  const setWidth = useCallback(
    (next: number) => { if (Number.isFinite(next)) setWidthRaw(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(next)))); },
    [setWidthRaw],
  );
  return { width, setWidth, collapsed, setCollapsed };
}

/** Expanded tree rows persist per browser. */
export function useAtlasExpanded() {
  const [ids, setIds] = useStoredState<string[]>("atlas-tree-expanded", [], "wiki-tree-expanded");
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
export function useAtlasUpdatesSeen() {
  const { user } = useAuth();
  const [seenAt, setSeenAt] = useStoredState<number>(`atlas-updates-seen:${user?.id ?? "anon"}`, 0, `wiki-updates-seen:${user?.id ?? "anon"}`);
  return { seenAt, markSeen: () => setSeenAt(Date.now()) };
}
