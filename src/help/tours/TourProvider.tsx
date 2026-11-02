import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useToast } from "@/hooks/use-toast";
import { getTour, tourRunsOn, TOURS, type TourDefinition } from "./index";
import { useTourProgress } from "./useTourProgress";
import TourOverlay from "./TourOverlay";

interface TourContextValue {
  /** Start a tour on the current page, optionally at a given step. */
  startTour: (tourId: string, step?: number) => void;
  /** Start a tour as soon as the user is on one of its pages (used by the Training hub). */
  queueTour: (tourId: string, step?: number) => void;
  activeTourId: string | null;
}

const TourContext = createContext<TourContextValue | null>(null);

/** Null outside a TourProvider, so shared components can hide tour buttons there. */
export const useTours = () => useContext(TourContext);

const AUTO_START_DELAY_MS = 800;

export const TourProvider = ({ contextSlug, children }: { contextSlug: string; children: ReactNode }) => {
  const { pathname } = useLocation();
  const { toast } = useToast();
  const { progress, isLoaded, record } = useTourProgress();
  const [active, setActive] = useState<{ tour: TourDefinition; step: number } | null>(null);
  const [queued, setQueued] = useState<{ tourId: string; step: number; fromPath: string } | null>(null);
  const autoStartedRef = useRef(new Set<string>());

  const startTour = useCallback(
    (tourId: string, step = 0) => {
      const tour = getTour(tourId);
      if (!tour) return;
      setQueued(null);
      setActive({ tour, step });
      void record(tour.id, { seen_at: new Date().toISOString() });
    },
    [record],
  );

  const queueTour = useCallback(
    (tourId: string, step = 0) => {
      const tour = getTour(tourId);
      if (!tour) return;
      if (tourRunsOn(tour, pathname)) startTour(tourId, step);
      else {
        setQueued({ tourId, step, fromPath: pathname });
        if (tour.startHint) toast({ title: tour.title, description: tour.startHint });
      }
    },
    [pathname, startTour, toast],
  );

  // A queued tour starts once its page is open; leaving its app drops it.
  useEffect(() => {
    if (!queued) return;
    const tour = getTour(queued.tourId);
    if (!tour) return setQueued(null);
    if (tourRunsOn(tour, pathname)) {
      const timer = window.setTimeout(() => startTour(queued.tourId, queued.step), 300);
      return () => window.clearTimeout(timer);
    }
    if (pathname !== queued.fromPath && contextSlug !== tour.contextSlug) setQueued(null);
  }, [contextSlug, pathname, queued, startTour]);

  // First visit: launch the page's auto-start tour once, only when progress has loaded and has no row for it.
  useEffect(() => {
    if (active || queued || !isLoaded) return;
    const tour = TOURS.find(
      (t) => t.autoStart && t.contextSlug === contextSlug && tourRunsOn(t, pathname) && !autoStartedRef.current.has(t.id),
    );
    if (!tour || progress?.some((row) => row.tour_id === tour.id)) return;
    const timer = window.setTimeout(() => {
      autoStartedRef.current.add(tour.id);
      startTour(tour.id);
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, contextSlug, isLoaded, pathname, progress, queued, startTour]);

  // Navigating away from the tour's pages ends it.
  useEffect(() => {
    if (active && !tourRunsOn(active.tour, pathname)) setActive(null);
  }, [active, pathname]);

  const value = useMemo(() => ({ startTour, queueTour, activeTourId: active?.tour.id ?? null }), [active, queueTour, startTour]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && (
        <TourOverlay
          key={active.tour.id}
          tour={active.tour}
          initialStep={active.step}
          onClose={(completed, lastStep) => {
            if (completed) void record(active.tour.id, { completed_at: new Date().toISOString(), last_step: lastStep });
            else void record(active.tour.id, { last_step: lastStep });
            setActive(null);
          }}
          onNothingFound={() => {
            toast({ title: "Tour not available here", description: active.tour.startHint ?? "None of this tour's page elements are on screen." });
            setActive(null);
          }}
        />
      )}
    </TourContext.Provider>
  );
};
