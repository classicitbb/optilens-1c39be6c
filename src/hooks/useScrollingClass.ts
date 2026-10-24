import { useEffect } from "react";

const SCROLLING_CLASS = "is-scrolling";

/**
 * Admin workspace scrollbars are invisible at rest. One capture-phase scroll
 * listener marks whichever element is scrolling with `.is-scrolling`
 * (styles/workspace.css shows its handle) and clears it `hideAfterMs` after the
 * last scroll event. `scroll` does not bubble, so capture is what lets a single
 * listener cover every scroll container in admin, including portaled ones.
 */
export function useScrollingClass(hideAfterMs = 900) {
  useEffect(() => {
    const timers = new Map<Element, number>();

    const onScroll = (event: Event) => {
      const target = event.target;
      const el =
        target instanceof Element ? target : target === document ? document.documentElement : null;
      if (!el) return;

      el.classList.add(SCROLLING_CLASS);
      const pending = timers.get(el);
      if (pending !== undefined) window.clearTimeout(pending);
      timers.set(
        el,
        window.setTimeout(() => {
          el.classList.remove(SCROLLING_CLASS);
          timers.delete(el);
        }, hideAfterMs),
      );
    };

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      timers.forEach((timer, el) => {
        window.clearTimeout(timer);
        el.classList.remove(SCROLLING_CLASS);
      });
      timers.clear();
    };
  }, [hideAfterMs]);
}
