import { useEffect, useState } from "react";

/** Explain a long wait without delaying a fast response or inventing progress. */
export function useDelayedBusy(busy: boolean, delay = 6000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!busy) { setSlow(false); return; }
    const timer = window.setTimeout(() => setSlow(true), delay);
    return () => window.clearTimeout(timer);
  }, [busy, delay]);
  return busy && slow;
}
