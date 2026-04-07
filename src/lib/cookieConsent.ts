export const CONSENT_KEY = "cookie_consent";
export const CONSENT_PREFERENCES_KEY = "cookie_preferences";
export const COOKIE_PREFERENCES_EVENT = "cookie-preferences-changed";

export type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
};

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  functional: false,
};

export const getCookiePreferences = (): CookiePreferences | null => {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(CONSENT_PREFERENCES_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as CookiePreferences;
  } catch {
    return null;
  }
};

export const hasGivenConsent = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CONSENT_KEY) !== null;
};

export const hasAnalyticsConsent = (): boolean => {
  const preferences = getCookiePreferences();
  return Boolean(preferences?.analytics);
};

export const notifyCookiePreferencesChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_EVENT));
};
