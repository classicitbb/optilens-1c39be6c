import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const logPerf = (label: string, valueMs: number) => {
  if (!import.meta.env.DEV) return;
  console.debug(`[perf] ${label}: ${Math.round(valueMs)}ms`);
};

const RoutePerformanceTracker = () => {
  const location = useLocation();
  const transitionStartRef = useRef<number>(performance.now());
  const initialLoadLoggedRef = useRef(false);

  useEffect(() => {
    if (initialLoadLoggedRef.current) return;

    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const initialLoadMs = navEntry?.domContentLoadedEventEnd ?? performance.now();
    logPerf("initial-load", initialLoadMs);

    initialLoadLoggedRef.current = true;
  }, []);

  useEffect(() => {
    const routeStart = transitionStartRef.current;

    const frame = requestAnimationFrame(() => {
      logPerf(`route:${location.pathname}`, performance.now() - routeStart);
      transitionStartRef.current = performance.now();
    });

    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  return null;
};

export default RoutePerformanceTracker;
