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
  sectionGapPx?: number;
  /** Vertical spacing below section headings in the quote document (px). */
  headingGapPx?: number;
  /** Relative scale multiplier for quote table typography. */
  tableFontScale?: number;
  /** @deprecated Use `sectionGapPx` instead. */
  sectionSpacing?: number;
  /** @deprecated Use `tableFontScale` instead. */
  tableScale?: number;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: "A4",
  orientation: "portrait",
  marginPreset: "normal",
  scale: 1,
  sectionGapPx: 24,
  headingGapPx: 8,
  tableFontScale: 1,
  sectionSpacing: 24,
  tableScale: 1,
};
