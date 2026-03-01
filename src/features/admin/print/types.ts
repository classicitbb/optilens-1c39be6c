export type PrintPaperSize = "A4" | "Letter";

export type PrintOrientation = "portrait" | "landscape";

export type PrintMarginPreset = "narrow" | "normal" | "wide";

export interface PrintSettings {
  paperSize: PrintPaperSize;
  orientation: PrintOrientation;
  marginPreset?: PrintMarginPreset;
  /** Explicit horizontal margin in millimeters. Overrides `marginPreset` when set. */
  marginXMm?: number;
  /** Explicit vertical margin in millimeters. Overrides `marginPreset` when set. */
  marginYMm?: number;
  scale?: number;
  /** Vertical spacing between sections in the quote document (px). */
  sectionSpacing?: number;
  /** Relative scale multiplier for table typography and paddings. */
  tableScale?: number;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: "A4",
  orientation: "portrait",
  marginPreset: "normal",
  scale: 1,
  sectionSpacing: 24,
  tableScale: 1,
};
