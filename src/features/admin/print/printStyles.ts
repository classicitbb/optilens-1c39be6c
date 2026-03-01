import {
  DEFAULT_PRINT_SETTINGS,
  PrintSettings,
} from "@/features/admin/print/types";

const PAGE_SIZE_MM: Record<
  PrintSettings["paperSize"],
  { width: number; height: number }
> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
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

export const resolvePrintSettings = (
  settings?: Partial<PrintSettings>,
): PrintSettings => ({
  ...DEFAULT_PRINT_SETTINGS,
  ...settings,
  scale: clampScale(settings?.scale ?? DEFAULT_PRINT_SETTINGS.scale),
});

export const getPrintableWidthMm = (settings?: Partial<PrintSettings>) => {
  return Math.max(
    120,
    getContentBoxDimensionsMm(settings).width *
      (resolvePrintSettings(settings).scale ?? 1),
  );
};

export const mmToPx = (mm: number) => (mm / MM_PER_INCH) * PX_PER_INCH;

export const pxToMm = (px: number) => (px / PX_PER_INCH) * MM_PER_INCH;

export const getMarginMm = (settings?: Partial<PrintSettings>) => {
  const resolved = resolvePrintSettings(settings);
  return PAGE_MARGINS_MM[resolved.marginPreset ?? "normal"];
};

export const getPageDimensionsMm = (settings?: Partial<PrintSettings>) => {
  const resolved = resolvePrintSettings(settings);
  const base = PAGE_SIZE_MM[resolved.paperSize];

  if (resolved.orientation === "landscape") {
    return { width: base.height, height: base.width };
  }

  return { width: base.width, height: base.height };
};

export const getContentBoxDimensionsMm = (
  settings?: Partial<PrintSettings>,
) => {
  const page = getPageDimensionsMm(settings);
  const margin = getMarginMm(settings);

  return {
    width: Math.max(0, page.width - margin * 2),
    height: Math.max(0, page.height - margin * 2),
    margin,
  };
};

export const getPageDimensionsPx = (settings?: Partial<PrintSettings>) => {
  const page = getPageDimensionsMm(settings);
  return {
    width: mmToPx(page.width),
    height: mmToPx(page.height),
  };
};

export const getContentBoxDimensionsPx = (
  settings?: Partial<PrintSettings>,
) => {
  const content = getContentBoxDimensionsMm(settings);
  return {
    width: mmToPx(content.width),
    height: mmToPx(content.height),
    margin: mmToPx(content.margin),
  };
};

export const buildPrintStyles = (settings?: Partial<PrintSettings>) => {
  const resolved = resolvePrintSettings(settings);
  const margin = getMarginMm(resolved);
  const printableWidth = getPrintableWidthMm(resolved);

  return `
    @page {
      size: ${resolved.paperSize} ${resolved.orientation};
      margin: ${margin}mm;
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
      max-width: ${printableWidth.toFixed(2)}mm;
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
