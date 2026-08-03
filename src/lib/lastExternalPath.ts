// Tracks the last route visited outside of the customer account section
// (/profile/*), so "Back to Website" links can return the user to wherever
// they actually came from instead of always landing on the homepage.
const STORAGE_KEY = "cv:lastNonProfilePath";

// Paths that should never be treated as "where the user came from" — going
// back to an auth screen or a raw redirect target is never what they want.
const EXCLUDED_PREFIXES = ["/profile", "/auth", "/reset-password", "/unsubscribe"];

export const recordNonProfilePath = (path: string) => {
  if (EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))) {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — safe to ignore.
  }
};

export const getLastNonProfilePath = (): string => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || "/";
  } catch {
    return "/";
  }
};
