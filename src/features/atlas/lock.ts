import { useSyncExternalStore } from "react";
import type { PageLock } from "@/components/blog/BlogPostRenderer";

/**
 * Soft page lock. The password is stored only as a salted PBKDF2 hash on the document, and the page
 * body is hidden until it is entered. The body itself is NOT encrypted: anyone who can read the
 * stored row can still read it. Unlocking lasts for the browser tab (sessionStorage).
 */

const ITERATIONS = 150_000;
const STORAGE_KEY = "atlas.unlocked-pages";

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const derive = async (password: string, salt: Uint8Array, iterations: number): Promise<string> => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return toBase64(new Uint8Array(bits));
};

export const createLock = async (password: string): Promise<PageLock> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toBase64(salt), iterations: ITERATIONS, hash: await derive(password, salt, ITERATIONS) };
};

export const checkPassword = async (lock: PageLock, password: string): Promise<boolean> =>
  (await derive(password, fromBase64(lock.salt), lock.iterations)) === lock.hash;

// ── Per-tab unlock state ───────────────────────────────────────────────────

const readStored = (): string[] => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
};

const unlocked = new Set<string>(readStored());
const listeners = new Set<() => void>();

// Keyed by hash too, so changing a page's password locks it again.
const keyOf = (pageId: string, lock: PageLock) => `${pageId}:${lock.hash}`;

const commit = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  } catch {
    /* unlock simply lasts until the page is reloaded */
  }
  listeners.forEach((listener) => listener());
};

export const unlockPage = (pageId: string, lock: PageLock) => {
  unlocked.add(keyOf(pageId, lock));
  commit();
};

export const lockPage = (pageId: string, lock: PageLock) => {
  unlocked.delete(keyOf(pageId, lock));
  commit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const isPageUnlocked = (pageId: string, lock: PageLock | undefined): boolean => !lock || unlocked.has(keyOf(pageId, lock));

let unlockVersion = 0;
listeners.add(() => {
  unlockVersion += 1;
});

/** Re-renders when any page is locked or unlocked, for views that call isPageUnlocked over many pages. */
export const useUnlockVersion = (): number => useSyncExternalStore(subscribe, () => unlockVersion);

/** True when the page has no lock, or has been unlocked in this tab. */
export const usePageUnlocked = (pageId: string | undefined, lock: PageLock | undefined): boolean =>
  useSyncExternalStore(subscribe, () => !lock || !pageId || unlocked.has(keyOf(pageId, lock)));
