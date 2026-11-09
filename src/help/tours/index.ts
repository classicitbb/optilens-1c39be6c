import { hrTours } from "./hr";
import type { TourDefinition, TourStep } from "./types";

export type { TourDefinition, TourStep };

/** Every guided tour, one file per app. */
export const TOURS: TourDefinition[] = [...hrTours];

export const getTour = (id: string) => TOURS.find((tour) => tour.id === id);

/** Whether a tour runs on this page: its own page, or any page its matchPath accepts. */
export const tourRunsOn = (tour: TourDefinition, pathname: string) => {
  const normalized = pathname.replace(/\/$/, "");
  return tour.matchPath ? tour.matchPath.test(normalized) : normalized === tour.path;
};

/** Tours for the page being viewed. */
export const toursForPage = (pathname: string, contextSlug: string) =>
  TOURS.filter((tour) => tour.contextSlug === contextSlug && tourRunsOn(tour, pathname));

/**
 * The step to show when moving from `from` in `direction`: the first step at or after `from`
 * (or before it, going back) whose target is on the page. -1 when none is.
 */
export const resolveStep = (steps: TourStep[], from: number, direction: 1 | -1, isPresent: (target: string) => boolean) => {
  for (let i = from; i >= 0 && i < steps.length; i += direction) {
    if (isPresent(steps[i].target)) return i;
  }
  return -1;
};
