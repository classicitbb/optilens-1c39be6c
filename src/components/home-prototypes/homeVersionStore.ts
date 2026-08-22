import { useSyncExternalStore } from "react";

/**
 * Homepage A/B prototype switch.
 *
 * Version A = the shipped homepage (unchanged).
 * Version B = the SEO/AEO + conversion-focused prototype.
 *
 * The preference is persisted per-browser in localStorage and is only
 * exposed through the admin account dropdown, so public visitors always
 * receive Version A until a version is promoted.
 */
export type HomeVersion = "a" | "b";

const STORAGE_KEY = "cv:home-version";
const EVENT_NAME = "cv:home-version-change";
const DEFAULT_VERSION: HomeVersion = "a";

const isHomeVersion = (value: unknown): value is HomeVersion => value === "a" || value === "b";

const readStoredVersion = (): HomeVersion => {
  if (typeof window === "undefined") return DEFAULT_VERSION;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isHomeVersion(stored) ? stored : DEFAULT_VERSION;
  } catch {
    // Private-mode / blocked storage: fall back to the shipped homepage.
    return DEFAULT_VERSION;
  }
};

let currentVersion: HomeVersion = readStoredVersion();

const subscribe = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const handleLocalChange = () => {
    currentVersion = readStoredVersion();
    onStoreChange();
  };

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    handleLocalChange();
  };

  window.addEventListener(EVENT_NAME, handleLocalChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(EVENT_NAME, handleLocalChange);
    window.removeEventListener("storage", handleStorageChange);
  };
};

const getSnapshot = (): HomeVersion => currentVersion;

const getServerSnapshot = (): HomeVersion => DEFAULT_VERSION;

export const setHomeVersion = (version: HomeVersion) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, version);
  } catch {
    // Storage unavailable — still update the in-memory value for this session.
  }

  currentVersion = version;
  window.dispatchEvent(new Event(EVENT_NAME));
};

/** Read the active homepage version and re-render when it changes. */
export const useHomeVersion = (): HomeVersion =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

export const HOME_VERSION_STORAGE_KEY = STORAGE_KEY;
