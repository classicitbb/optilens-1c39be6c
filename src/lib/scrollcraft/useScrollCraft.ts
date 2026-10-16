import { useEffect, useRef, type DependencyList } from "react";

import "./scrollcraft.css";

type ScrollCraftApi = { destroy: () => void };
type ScrollCraftGlobal = { mount: (root: Element) => ScrollCraftApi };

/**
 * Mounts the scroll-craft engine (src/lib/scrollcraft/engine.js) on the returned
 * ref and tears it down on unmount. The engine is loaded lazily and only touches
 * elements carrying data-sc-* attributes, so pages opt in per element.
 *
 * Pass `deps` that change which data-sc-* elements exist (e.g. an audience
 * switch) so the engine re-reads the DOM.
 */
export function useScrollCraft<T extends HTMLElement = HTMLDivElement>(deps: DependencyList = []) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    let api: ScrollCraftApi | undefined;
    import("./engine.js")
      .then(() => {
        if (cancelled) return;
        const sc = (window as unknown as { ScrollCraft?: ScrollCraftGlobal }).ScrollCraft;
        api = sc?.mount(root);
      })
      .catch(() => {
        /* Motion is an enhancement; the page is complete without it. */
      });
    return () => {
      cancelled = true;
      api?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}
