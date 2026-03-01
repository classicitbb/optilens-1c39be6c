export type PrintPaperSize = "A4" | "Letter";

export type PrintOrientation = "portrait" | "landscape";

export type PrintMarginPreset = "narrow" | "normal" | "wide";

export interface PrintSettings {
  paperSize: PrintPaperSize;
  orientation: PrintOrientation;
  marginPreset?: PrintMarginPreset;
  scale?: number;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: "A4",
  orientation: "portrait",
  marginPreset: "normal",
  scale: 1,
};
