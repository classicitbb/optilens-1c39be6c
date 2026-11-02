import { useCallback, useEffect, useRef, useState } from "react";

const NEAR_BOTTOM_PX = 96;

/**
 * Keeps a chat thread pinned to the newest message only while the reader is
 * already at the bottom. If they have scrolled up to read, new content does not
 * yank the view away; `isAtBottom` drives a "Jump to latest" control instead.
 */
export function useStickToBottom<T extends HTMLElement = HTMLDivElement>(changeKey: unknown) {
  const containerRef = useRef<T | null>(null);
  const pinnedRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = containerRef.current;
    if (!element) return;
    pinnedRef.current = true;
    setIsAtBottom(true);
    if (typeof element.scrollTo === "function") element.scrollTo({ top: element.scrollHeight, behavior });
    else element.scrollTop = element.scrollHeight;
  }, []);

  const onScroll = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX;
    pinnedRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, []);

  useEffect(() => {
    if (pinnedRef.current) scrollToBottom();
    else setIsAtBottom(false);
  }, [changeKey, scrollToBottom]);

  return { containerRef, isAtBottom, onScroll, scrollToBottom };
}
