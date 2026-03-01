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

const clampSectionGap = (value: number | undefined) => {
  if (value == null || Number.isNaN(value)) return DEFAULT_PRINT_SETTINGS.sectionGapPx ?? 24;
  return Math.min(40, Math.max(8, value));
};

const clampHeadingGap = (value: number | undefined) => {
  if (value == null || Number.isNaN(value)) return DEFAULT_PRINT_SETTINGS.headingGapPx ?? 8;
  return Math.min(24, Math.max(4, value));
};

const clampTableFontScale = (value: number | undefined) => {
  if (value == null || Number.isNaN(value)) return DEFAULT_PRINT_SETTINGS.tableFontScale ?? 1;
  return Math.min(1.2, Math.max(0.85, value));
};

const clampMargin = (value: number | undefined, fallback: number) => {
  if (value == null || Number.isNaN(value)) return fallback;
  return Math.min(60, Math.max(0, value));
};

export const resolvePrintSettings = (settings?: Partial<PrintSettings>): PrintSettings => ({
  ...DEFAULT_PRINT_SETTINGS,
  ...settings,
  scale: clampScale(settings?.scale ?? DEFAULT_PRINT_SETTINGS.scale),
  sectionGapPx: clampSectionGap(settings?.sectionGapPx ?? settings?.sectionSpacing ?? DEFAULT_PRINT_SETTINGS.sectionGapPx),
  headingGapPx: clampHeadingGap(settings?.headingGapPx ?? DEFAULT_PRINT_SETTINGS.headingGapPx),
  tableFontScale: clampTableFontScale(settings?.tableFontScale ?? settings?.tableScale ?? DEFAULT_PRINT_SETTINGS.tableFontScale),
  sectionSpacing: clampSectionGap(settings?.sectionGapPx ?? settings?.sectionSpacing ?? DEFAULT_PRINT_SETTINGS.sectionGapPx),
  tableScale: clampTableFontScale(settings?.tableFontScale ?? settings?.tableScale ?? DEFAULT_PRINT_SETTINGS.tableFontScale),
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

    /* Tailwind utility classes used in preview content */
    .w-full { width: 100%; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-medium { font-weight: 500; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    .tracking-wider { letter-spacing: 0.05em; }
    .tracking-wide { letter-spacing: 0.025em; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .pt-3 { padding-top: 0.75rem; }
    .pb-4 { padding-bottom: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .w-32 { width: 8rem; }
    .flex-1 { flex: 1 1 0%; }
    .flex-shrink-0 { flex-shrink: 0; }
    .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
    .space-y-5 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.25rem; }
    .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
    .flex { display: flex; }
    .items-start { align-items: flex-start; }
    .justify-between { justify-content: space-between; }
    .border-collapse { border-collapse: collapse; }
  `;
};
