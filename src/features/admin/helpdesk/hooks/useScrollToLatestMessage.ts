import { useEffect, useRef } from "react";

/**
 * Keeps a conversation on its newest entry: the returned ref marks the end of
 * the thread and is scrolled into view whenever `latestKey` changes, so a reply
 * you send — or one that arrives live from someone else — is visible without
 * scrolling by hand.
 *
 * `align` decides which edge of the newest entry lands on screen. A message you
 * receive uses "start" so a long one begins at the top of the view and reads
 * downwards; your own send uses "end" so the thread sits at the bottom, next to
 * the composer. A short entry cannot scroll past the end of the thread, so
 * "start" settles at the bottom on its own.
 */
export const useScrollToLatestMessage = (
  latestKey: string | number | undefined,
  align: "start" | "end" = "end",
) => {
  const latestRef = useRef<HTMLDivElement | null>(null);
  const hasScrolled = useRef(false);
  const alignRef = useRef(align);
  alignRef.current = align;

  useEffect(() => {
    if (latestKey === undefined) return;
    const node = latestRef.current;
    if (!node) return;

    node.scrollIntoView({
      behavior: hasScrolled.current ? "smooth" : "auto",
      block: alignRef.current,
    });
    hasScrolled.current = true;
  }, [latestKey]);

  return latestRef;
};
