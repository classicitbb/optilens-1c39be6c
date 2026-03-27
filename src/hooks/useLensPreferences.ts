import { useCallback, useMemo, useState } from "react";

export type LensPreference = "liked" | "disliked";

const KEY = "lens_preferences_v1";

const loadPreferences = (): Record<string, LensPreference> => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LensPreference>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value === "liked" || value === "disliked")
    );
  } catch {
    return {};
  }
};

const savePreferences = (next: Record<string, LensPreference>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
};

export const useLensPreferences = () => {
  const [preferences, setPreferences] = useState<Record<string, LensPreference>>(loadPreferences);

  const setPreference = useCallback((lensId: string, preference: LensPreference | null) => {
    setPreferences((prev) => {
      const next = { ...prev };
      if (preference === null) {
        delete next[lensId];
      } else {
        next[lensId] = preference;
      }
      savePreferences(next);
      return next;
    });
  }, []);

  const clearPreferences = useCallback(() => {
    setPreferences({});
    savePreferences({});
  }, []);

  const likedLensIds = useMemo(
    () => new Set(Object.entries(preferences).filter(([, pref]) => pref === "liked").map(([id]) => id)),
    [preferences]
  );

  return {
    preferences,
    setPreference,
    clearPreferences,
    likedLensIds,
  };
};
