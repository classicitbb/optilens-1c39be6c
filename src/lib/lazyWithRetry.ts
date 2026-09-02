import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "cv.chunk-reload-at";
const RELOAD_WINDOW_MS = 30_000;

const isChunkLoadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Importing a module script failed")
  );
};

const reloadOnce = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* sessionStorage unavailable — still attempt a single reload */
  }
  window.location.reload();
  return true;
};

/**
 * React.lazy with recovery for stale chunk hashes after a redeploy.
 * Retries once with a cache-busting query, then forces a single page reload.
 */
export const lazyWithRetry = <T extends ComponentType<never>>(
  factory: () => Promise<{ default: T }>,
) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;
      try {
        return await factory();
      } catch (retryError) {
        if (isChunkLoadError(retryError) && reloadOnce()) {
          // Keep the boundary suspended while the page reloads.
          return await new Promise<{ default: T }>(() => {});
        }
        throw retryError;
      }
    }
  });
