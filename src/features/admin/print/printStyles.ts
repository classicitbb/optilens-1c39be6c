import { DEFAULT_PRINT_SETTINGS, PrintSettings } from "@/features/admin/print/types";

const PAGE_WIDTH_MM: Record<PrintSettings["paperSize"], { portrait: number; landscape: number }> = {
  A4: { portrait: 210, landscape: 297 },
  Letter: { portrait: 216, landscape: 279 },
};

const PAGE_MARGINS_MM: Record<NonNullable<PrintSettings["marginPreset"]>, number> = {
  narrow: 8,
  normal: 12,
  wide: 18,
};

const clampScale = (value: number | undefined) => {
  if (!value || Number.isNaN(value)) return 1;
  return Math.min(1.25, Math.max(0.6, value));
};

export const resolvePrintSettings = (settings?: Partial<PrintSettings>): PrintSettings => ({
  ...DEFAULT_PRINT_SETTINGS,
  ...settings,
  scale: clampScale(settings?.scale ?? DEFAULT_PRINT_SETTINGS.scale),
});

export const getPrintableWidthMm = (settings?: Partial<PrintSettings>) => {
  const resolved = resolvePrintSettings(settings);
  const pageWidth = PAGE_WIDTH_MM[resolved.paperSize][resolved.orientation];
  const margin = PAGE_MARGINS_MM[resolved.marginPreset ?? "normal"];
  return Math.max(120, (pageWidth - margin * 2) * (resolved.scale ?? 1));
};

export const buildPrintStyles = (settings?: Partial<PrintSettings>) => {
  const resolved = resolvePrintSettings(settings);
  const margin = PAGE_MARGINS_MM[resolved.marginPreset ?? "normal"];
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
