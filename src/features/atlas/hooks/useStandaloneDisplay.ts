import { useEffect, useState } from "react";

const QUERY = "(display-mode: standalone), (display-mode: fullscreen)";

const isStandalone = (): boolean =>
  typeof window !== "undefined" && (window.matchMedia?.(QUERY).matches === true || (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

/** True when Atlas runs as an installed window (no browser tab), so it should supply its own frame. */
export const useStandaloneDisplay = (): boolean => {
  const [standalone, setStandalone] = useState(isStandalone);
  useEffect(() => {
    const query = window.matchMedia?.(QUERY);
    if (!query) return;
    const update = () => setStandalone(isStandalone());
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return standalone;
};
