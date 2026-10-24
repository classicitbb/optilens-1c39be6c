import { useEffect, useState, useSyncExternalStore } from "react";

import { createAnnotator, type Annotator } from "./annotator";

/** Creates the page annotator while `enabled` (admins only) and tears it down otherwise. */
export function useAnnotator(enabled: boolean) {
  const [annotator, setAnnotator] = useState<Annotator | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const created = createAnnotator();
    setAnnotator(created);
    return () => {
      created.destroy();
      setAnnotator(null);
    };
  }, [enabled]);

  const snapshot = useSyncExternalStore(
    (listener) => (annotator ? annotator.subscribe(listener) : () => {}),
    () => (annotator ? `${annotator.isActive() ? 1 : 0}:${annotator.count()}` : "0:0"),
  );
  const [active, count] = snapshot.split(":");

  return { annotator, isActive: active === "1", count: Number(count) };
}
