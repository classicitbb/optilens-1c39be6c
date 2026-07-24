// Tracks the last route visited outside of the customer account section
// (/profile/*), so "Back to Website" links can return the user to wherever
// they actually came from instead of always landing on the homepage.
const STORAGE_KEY = "cv:lastNonProfilePath";

export const recordNonProfilePath = (path: string) => {
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
