import { useLayoutEffect, type RefObject } from "react";

/**
 * Sizes a textarea to its content up to `maxLines`, then scrolls. Runs on every
 * value change, so text set programmatically (suggestion chips, dictation,
 * clearing after send) resizes the same as typing.
 */
export function useAutoGrowTextarea(ref: RefObject<HTMLTextAreaElement | null>, value: string, maxLines = 8) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    const style = window.getComputedStyle(element);
    const lineHeight = parseFloat(style.lineHeight) || 24;
    const padding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    const maxHeight = lineHeight * maxLines + padding;
    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [ref, value, maxLines]);
}
