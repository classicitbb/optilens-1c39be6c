import { useLayoutEffect, useRef } from "react";

/** Keep sticky offsets tied to the real frame and wrapping control heights. */
export function RxStickyLayout() {
  const marker = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const frame = marker.current?.parentElement;
    const controls = frame?.querySelector<HTMLElement>("[data-rx-sticky-controls]");
    if (!frame || !controls) return;
    const measure = () => {
      const height = controls.getBoundingClientRect().height;
      frame.style.setProperty("--rx-controls-height", `${height}px`);
      frame.style.setProperty("--rx-quote-top", `${height}px`);
      const bottomPadding = parseFloat(getComputedStyle(frame).paddingBottom) || 0;
      frame.style.setProperty("--rx-quote-max-height", `${Math.max(0, frame.clientHeight - height - bottomPadding - 8)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(controls);
    return () => observer.disconnect();
  }, []);
  return <span ref={marker} hidden aria-hidden="true" />;
}
