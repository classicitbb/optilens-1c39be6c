import { useCallback, useState } from "react";

const PREFIX = "cv.draft.";

const readDraft = (key: string): string => {
  try {
    return window.localStorage.getItem(PREFIX + key) ?? "";
  } catch {
    return "";
  }
};

/** True when an unsent draft is stored under `key`. */
export const hasStoredDraft = (key: string): boolean => readDraft(key) !== "";

const writeDraft = (key: string, value: string) => {
  try {
    if (value) window.localStorage.setItem(PREFIX + key, value);
    else window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Storage can be blocked or full; the draft then lives in memory only.
  }
};

/** Discard a stored draft without needing the hook that owns it. */
export const clearStoredDraft = (key: string) => writeDraft(key, "");

/**
 * Text state that survives the component remounting, a tab switch or a page
 * refresh. Every change is written to localStorage under `key`; call `clear`
 * once the text has been sent or discarded. `fallback` is the starting value
 * when no draft is stored. Files cannot be persisted.
 */
export const usePersistentDraft = (key: string, fallback = "") => {
  const [value, setValueState] = useState(() => readDraft(key) || fallback);

  const setValue = useCallback((next: string) => {
    setValueState(next);
    writeDraft(key, next);
  }, [key]);

  const clear = useCallback(() => setValue(""), [setValue]);

  return [value, setValue, clear] as const;
};
