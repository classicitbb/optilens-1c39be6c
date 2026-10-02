import type { ChangeEvent } from "react";

/**
 * onChange helper for free-text order fields: the lab standardises on caps, so
 * typed text is upper-cased as it goes in. Keeps the caret where it was, since
 * React moves it to the end when it rewrites a controlled value.
 */
export function upperCaseInput<T extends HTMLInputElement | HTMLTextAreaElement>(
  e: ChangeEvent<T>,
  set: (value: string) => void,
) {
  const el = e.target;
  const next = el.value.toUpperCase();
  const pos = el.selectionStart;
  set(next);
  if (pos !== null && next !== el.value) requestAnimationFrame(() => el.setSelectionRange(pos, pos));
}
