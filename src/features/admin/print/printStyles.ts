import { DEFAULT_PRINT_SETTINGS, PrintSettings } from "@/features/admin/print/types";

const PAGE_SIZE_MM: Record<PrintSettings["paperSize"], { portrait: { width: number; height: number }; landscape: { width: number; height: number } }> = {
  A4: {
    portrait: { width: 210, height: 297 },
    landscape: { width: 297, height: 210 },
  },
  Letter: {
    portrait: { width: 216, height: 279 },
    landscape: { width: 279, height: 216 },
  },
};

const PAGE_MARGINS_MM: Record<
  NonNullable<PrintSettings["marginPreset"]>,
  number
> = {
  narrow: 8,
  normal: 12,
  wide: 18,
};

const PX_PER_INCH = 96;
const MM_PER_INCH = 25.4;

const clampScale = (value: number | undefined) => {
  if (!value || Number.isNaN(value)) return 1;
  return Math.min(1.25, Math.max(0.6, value));
};

const clampMargin = (value: number | undefined, fallback: number) => {
  if (value == null || Number.isNaN(value)) return fallback;
  return Math.min(60, Math.max(0, value));
};

export const resolvePrintSettings = (settings?: Partial<PrintSettings>): PrintSettings => ({
  ...DEFAULT_PRINT_SETTINGS,
  ...settings,
  scale: clampScale(settings?.scale ?? DEFAULT_PRINT_SETTINGS.scale),
});

export const getResolvedMarginsMm = (settings?: Partial<PrintSettings>) => {
  const resolved = resolvePrintSettings(settings);
  const presetMargin = PAGE_MARGINS_MM[resolved.marginPreset ?? "normal"];

  return {
    marginX: clampMargin(resolved.marginXMm, presetMargin),
    marginY: clampMargin(resolved.marginYMm, presetMargin),
  };
};

export const getPrintableContentAreaMm = (settings?: Partial<PrintSettings>) => {
  const resolved = resolvePrintSettings(settings);
  const page = PAGE_SIZE_MM[resolved.paperSize][resolved.orientation];
  const { marginX, marginY } = getResolvedMarginsMm(resolved);

  const contentWidth = Math.max(120, (page.width - marginX * 2) * (resolved.scale ?? 1));
  const contentHeight = Math.max(80, page.height - marginY * 2);

  return {
    pageWidth: page.width,
    pageHeight: page.height,
    marginX,
    marginY,
    contentWidth,
    contentHeight,
  };
};

export const getPrintableWidthMm = (settings?: Partial<PrintSettings>) => getPrintableContentAreaMm(settings).contentWidth;

export const buildPrintStyles = (settings?: Partial<PrintSettings>) => {
  const resolved = resolvePrintSettings(settings);
  const { marginX, marginY, contentWidth } = getPrintableContentAreaMm(resolved);

  return `
    @page {
      size: ${resolved.paperSize} ${resolved.orientation};
      margin: ${marginY}mm ${marginX}mm;
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
      color: #1a202c;
      background: #fff;
    }

    .print-root {
      width: 100%;
      max-width: ${contentWidth.toFixed(2)}mm;
      margin: 0 auto;
      transform-origin: top center;
      transform: scale(${resolved.scale ?? 1});
    }

    .print-avoid-break,
    h1,
    h2,
    h3,
    h4,
    table,
    thead,
    tbody,
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    h1,
    h2,
    h3,
    h4,
    .print-keep-with-next {
      break-after: avoid;
      page-break-after: avoid;
    }

    .print-page-break-before {
      break-before: page;
      page-break-before: always;
    }

    .print-page-break-after {
      break-after: page;
      page-break-after: always;
    }

    .print-root .no-print,
    .no-print {
      display: none !important;
    }

    @media screen {
      .print-only {
        display: none !important;
      }
    }
  `;
};
