import type { AtlasDoc } from "./source/types";

/** Saved page layout wins over the old per-browser preference, including explicit standard width. */
export const pageFullWidth = (doc: AtlasDoc, legacyWidth?: boolean): boolean =>
  doc.layout?.fullWidth ?? legacyWidth ?? false;
