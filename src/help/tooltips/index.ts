import { hrTooltips } from "./hr";

/** Every field/button tip, one typed file per app. Add an app by spreading its registry here. */
export const TOOLTIPS = {
  ...hrTooltips,
} as const;

export type TooltipId = keyof typeof TOOLTIPS;
