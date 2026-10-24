// Desktop panel geometry (px). The panel adds columns rather than growing past the
// viewport, and only scrolls once it is as wide as the window allows.
const TILE_WIDTH = 101;
const TILE_GAP = 4;
const ROW_HEIGHT = 92 + TILE_GAP;
const MIN_COLUMNS = 4;
export const PANEL_TOP = 52;
const PANEL_CHROME = 24 + 24 + 32 + 37; // padding, gaps, search box, footer
const SECTION_CHROME = 21 + 16; // heading + spacing between sections

export const launcherColumns = (sectionSizes: number[], viewport: { width: number; height: number }) => {
  const sizes = sectionSizes.filter((n) => n > 0);
  const maxColumns = Math.max(MIN_COLUMNS, Math.floor((viewport.width - 20 - 24 + TILE_GAP) / (TILE_WIDTH + TILE_GAP)));
  const available = viewport.height - PANEL_TOP - 10 - PANEL_CHROME - sizes.length * SECTION_CHROME;
  for (let columns = MIN_COLUMNS; columns <= maxColumns; columns++) {
    const rows = sizes.reduce((sum, n) => sum + Math.ceil(n / columns), 0);
    if (rows * ROW_HEIGHT <= available) return columns;
  }
  return maxColumns;
};

export const launcherPanelWidth = (columns: number) => 24 + columns * TILE_WIDTH + (columns - 1) * TILE_GAP;
