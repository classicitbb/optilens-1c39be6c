import type { Feature } from "@/hooks/useRolePermissions";

export interface TourStep {
  /** Value of the `data-tour` attribute the step points at. A step whose target is not on the page is skipped. */
  target: string;
  title: string;
  body: string;
}

export interface TourDefinition {
  id: string;
  title: string;
  summary: string;
  /** Group shown on the Training hub, e.g. "People & Payroll". */
  group: string;
  /** Feature the viewer needs; the Training hub hides tours for features they cannot view. */
  feature?: Feature;
  /** Help context the tour belongs to (same slugs as help articles). */
  contextSlug: string;
  /** Page the Training hub opens before starting. */
  path: string;
  /** The pages the tour runs on, when that is not exactly `path` (for example a record page). */
  matchPath?: RegExp;
  /** Shown when the tour is started from elsewhere and the user must open a specific record first. */
  startHint?: string;
  /** Launch once automatically the first time a user lands on the page. */
  autoStart?: boolean;
  steps: TourStep[];
}
