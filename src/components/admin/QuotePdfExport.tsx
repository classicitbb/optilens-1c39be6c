import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Maximize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildPrintStyles, getPrintableContentAreaMm, resolvePrintSettings } from "@/features/admin/print/printStyles";
import { getPersistedPrintSettings } from "@/features/admin/print/printSettingsStore";
import { PrintOrientation, PrintPaperSize, PrintSettings } from "@/features/admin/print/types";
import type { Quote, QuoteLine, RxDetail } from "@/hooks/useQuotes";

interface QuotePdfExportProps {
  quote: Quote;
  lines: QuoteLine[];
  totals: {
    subtotalSell: number;
    totalLandedCost: number;
    gpAmount: number;
    gpPercent: number;
    grandTotal: number;
  };
  showInternal?: boolean;
  rxMap?: Record<string, RxDetail>;
  frameData?: {
    ref: string;
    model: string;
    bridge: string;
    ed: string;
    a: string;
    b: string;
    dbl: string;
    uncut: boolean;
    uncutPrice: string;
  } | null;
  showTriggerButton?: boolean;
  printSettings?: Partial<PrintSettings>;
  printSettingsProfileId?: string;
}

export interface QuotePdfExportHandle {
  triggerPrint: () => void;
}

const fmt = (v: number | null | undefined) => (v != null ? v.toString() : "");

const stripFrameTag = (notes: string | null | undefined) => {
  if (!notes) return "";
  return notes.replace(/\[\[FRAME:.*?\]\]\n?/s, "").trim();
};

const MM_TO_PX = 3.7795275591;

const getPageDimensionsPx = (settings: PrintSettings) => {
  const area = getPrintableContentAreaMm(settings);
  return {
    width: area.pageWidth * MM_TO_PX,
    height: area.pageHeight * MM_TO_PX,
  };
};

const getContentBoxDimensionsPx = (settings: PrintSettings) => {
  const area = getPrintableContentAreaMm(settings);
  return {
    margin: Math.min(area.marginX, area.marginY) * MM_TO_PX,
  };
};

const PAGE_GAP = 16; // px between pages in preview
const PREVIEW_FOOTER_HEIGHT_PX = 44;
const PREVIEW_CONTINUATION_HEADER_HEIGHT_PX = 96;
const PREVIEW_PAGE_BREAK_SAFETY_PX = 8;
const QUOTE_LINE_ITEM_COLUMN_WIDTHS = ["7%", "55%", "8.5%", "16%", "13.5%"];
const QUOTE_PRINT_FIRST_PAGE_ROWS = 16;
const QUOTE_PRINT_CONTINUATION_ROWS = 14;

const getContentAreaPx = (settings: PrintSettings) => {
  const area = getPrintableContentAreaMm(settings);
  return {
    marginX: area.marginX * MM_TO_PX,
    marginY: area.marginY * MM_TO_PX,
    contentWidth: area.contentWidth * MM_TO_PX,
    contentHeight: area.contentHeight * MM_TO_PX,
  };
};

const getQuoteStyleMetrics = (settings: PrintSettings) => {
  const sectionGapPx = settings.sectionGapPx ?? settings.sectionSpacing ?? 24;
  const headingGapPx = settings.headingGapPx ?? 8;
  const tableFontScale = settings.tableFontScale ?? settings.tableScale ?? 1;
  const tableHeaderFontSize = 10 * tableFontScale;
  const tableBodyFontSize = 11 * tableFontScale;

  return {
    sectionGapPx,
    headingGapPx,
    tableFontScale,
    tableHeaderPaddingY: 8 * tableFontScale,
    tableHeaderPaddingX: 10 * tableFontScale,
    tableHeaderFontSize,
    tableBodyPaddingY: 7 * tableFontScale,
    tableBodyPaddingX: 10 * tableFontScale,
    tableBodyFontSize,
    tableFootnoteFontSize: Math.max(8, tableBodyFontSize - 2),
    rxSectionGapPx: Math.round(sectionGapPx / 2),
  };
};

const getQuoteDocumentStyles = (settings: PrintSettings) => {
  const metrics = getQuoteStyleMetrics(settings);

  return `
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #2b6cb0; padding-bottom: 20px; }
  .company-name { font-size: 22px; font-weight: 700; color: #2b6cb0; }
  .company-tagline { font-size: 10px; color: #718096; margin-top: 2px; }
  .quote-meta { text-align: right; }
  .quote-number { font-size: 18px; font-weight: 700; }
  .quote-type { display: inline-block; background: #ebf4ff; color: #2b6cb0; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-top: 4px; }
  .meta-row { font-size: 11px; color: #4a5568; margin-top: 3px; }
  .section { margin-bottom: ${metrics.sectionGapPx}px; }
  .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #718096; margin-bottom: ${metrics.headingGapPx}px; }
  .customer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .frame-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: ${metrics.headingGapPx}px; }
  .field-label { font-size: 10px; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.3px; }
  .field-value { font-size: 12px; color: #1a202c; margin-top: 1px; }
  .print-root {
    --table-border-color: #2b6cb0;
    --table-header-bg: #ebf4ff;
    --table-row-even-bg: #f7fbff;
    --table-header-font-size: ${metrics.tableHeaderFontSize}px;
    --table-body-font-size: ${metrics.tableBodyFontSize}px;
    --table-footnote-font-size: ${metrics.tableFootnoteFontSize}px;
  }
  table { width: 100%; border-collapse: collapse; }
  .table-shared { border: 1px solid var(--table-border-color); table-layout: fixed; }
  .table-shared thead { display: table-header-group; }
  .table-shared th { background: var(--table-header-bg); text-align: left; padding: ${metrics.tableHeaderPaddingY}px ${metrics.tableHeaderPaddingX}px; font-size: var(--table-header-font-size); font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #2d3748; border: 1px solid var(--table-border-color); }
  .table-shared td { padding: ${metrics.tableBodyPaddingY}px ${metrics.tableBodyPaddingX}px; font-size: var(--table-body-font-size); color: #2d3748; border: 1px solid var(--table-border-color); }
  .table-shared tbody tr:nth-child(even) { background: var(--table-row-even-bg); }
  .table-shared th.right, .table-shared td.right, .table-shared .table-col-number { text-align: right; font-family: 'SF Mono', 'Menlo', monospace; }
  .table-shared th.center, .table-shared td.center { text-align: center; }
  .table-shared th.desc, .table-shared td.desc, .table-shared .table-col-description { text-align: left; }
  .table-shared td.desc { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .table-shared tr,
  .table-shared td,
  .table-shared th {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .table-footnote { font-size: var(--table-footnote-font-size); color: #718096; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transform: scale(clamp(0.92, ${metrics.tableFontScale}, 1)); transform-origin: left center; }
  .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
  .totals-box { width: 260px; }
  .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
  .total-row .label { color: #718096; }
  .total-row .value { font-family: 'SF Mono', 'Menlo', monospace; }
  .total-row.grand { border-top: 2px solid #2b6cb0; padding-top: 8px; margin-top: 6px; font-size: 14px; font-weight: 700; }
  .total-row.internal { color: #a0aec0; font-style: italic; }
  .notes-section { margin-top: ${metrics.sectionGapPx}px; padding: 16px; background: #f7fafc; border-radius: 0; border: 1px solid #2b6cb0; }
  .notes-text { font-size: 11px; color: #4a5568; white-space: pre-wrap; line-height: 1.5; }
  .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 10px; color: #a0aec0; }
  .print-fixed-footer { display: none; }
  .internal-badge { background: #fed7d7; color: #c53030; padding: 1px 6px; border-radius: 0; font-size: 9px; font-weight: 600; }
  .rx-section { margin-top: ${metrics.rxSectionGapPx}px; page-break-inside: avoid; }
  .rx-title { font-size: 11px; font-weight: 600; margin-bottom: ${Math.max(4, metrics.headingGapPx - 2)}px; color: #2b6cb0; }
  .rx-table { width: 100%; border-collapse: collapse; margin-bottom: ${metrics.headingGapPx}px; }
  .rx-table td.label-cell { text-align: left; font-weight: 600; background: var(--table-header-bg); width: 40px; white-space: nowrap; }
  .quote-type { border-radius: 0; }
  .quote-print-page { position: relative; background: #ffffff; break-after: page; page-break-after: always; }
  .quote-print-page:last-child { break-after: auto; page-break-after: auto; }
  .print-continuation-header { margin-bottom: 10px; }
  .print-continuation-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #2b6cb0;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .print-continuation-brand { font-size: 12px; font-weight: 700; color: #2b6cb0; }
  .print-continuation-context { font-size: 9px; color: #718096; margin-top: 1px; }
  .print-continuation-meta { text-align: right; }
  .print-continuation-number { font-size: 12px; font-weight: 700; }
  .print-continuation-type { font-size: 9px; color: #718096; margin-top: 1px; }
  @media print {
    .footer { display: none; }
    .print-fixed-footer {
      display: block;
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      text-align: center;
      font-size: 10px;
      color: #a0aec0;
      background: #ffffff;
    }
    .print-list-breakable,
    .table-shared tbody,
    .table-shared tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .quote-print-page {
      min-height: calc(100vh - 1px);
    }
  }
`;
};

const QuotePdfExport = forwardRef<QuotePdfExportHandle, QuotePdfExportProps>(
  (
    {
      quote,
      lines,
      totals,
      showInternal = false,
      rxMap = {},
      frameData,
      showTriggerButton = true,
      printSettings,
      printSettingsProfileId,
    },
    ref,
  ) => {
    const printRef = useRef<HTMLDivElement>(null);
    const resolvedPrintSettings = printSettingsProfileId
      ? getPersistedPrintSettings(printSettingsProfileId, printSettings)
      : resolvePrintSettings(printSettings);

    const doPrint = () => {
      const content = printRef.current;
      if (!content) return;
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document
        .write(`<!DOCTYPE html><html><head><title>${quote.quote_number} - Quote</title>
        <style>${buildPrintStyles(resolvedPrintSettings)}${getQuoteDocumentStyles(resolvedPrintSettings)}</style></head><body><div class="pre-print-hint">Disable browser headers/footers in print settings.</div><div class="print-fixed-footer">Classic Visions — Precision Optics & Lens Solutions</div><div class="print-root">${content.innerHTML}</div></body></html>`);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 600);
    };

    useImperativeHandle(ref, () => ({ triggerPrint: doPrint }));

    const formatDate = (d?: string | null) => {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const productLines = lines.filter(
      (l) => l.line_type !== "Fee" && l.line_type !== "Discount",
    );
    const feeLines = lines.filter(
      (l) => l.line_type === "Fee" || l.line_type === "Discount",
    );
    const lensLines = lines.filter((l) => l.line_type === "Lens");
    const cleanInternalNotes = stripFrameTag(quote.notes_internal);

    const lineItemRows = [
      ...productLines.map((line, index) => ({ line, displayIndex: index + 1, isFee: false })),
      ...feeLines.map((line) => ({ line, displayIndex: null as number | null, isFee: true })),
    ];

    const lineItemPageChunks: Array<{
      key: string;
      rows: typeof lineItemRows;
      isContinuation: boolean;
    }> = [];
    let nextLineIndex = 0;
    while (nextLineIndex < lineItemRows.length) {
      const isContinuation = lineItemPageChunks.length > 0;
      const pageSize = isContinuation
        ? QUOTE_PRINT_CONTINUATION_ROWS
        : QUOTE_PRINT_FIRST_PAGE_ROWS;
      lineItemPageChunks.push({
        key: `quote-line-items-${lineItemPageChunks.length}`,
        rows: lineItemRows.slice(nextLineIndex, nextLineIndex + pageSize),
        isContinuation,
      });
      nextLineIndex += pageSize;
    }

    const renderRxTable = (rx: RxDetail) => {
      const hasAnyPrism = [
        rx.od_prism_value,
        rx.os_prism_value,
        rx.od_prism2_value,
        rx.os_prism2_value,
      ].some((v) => v != null);
      const hasAnyDigital = [
        rx.od_face_form_angle,
        rx.os_face_form_angle,
        rx.od_panto,
        rx.os_panto,
      ].some((v) => v != null);

      return (
        <div>
          <table className="rx-table table-shared">
            <thead>
              <tr>
                <th>Rx</th>
                <th>SPH</th>
                <th>CYL</th>
                <th>AXIS</th>
                <th>Fpd</th>
                <th>Npd</th>
                <th>ADD</th>
                <th>Seg</th>
                <th>Oc</th>
                <th>Bc</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="label-cell">OD</td>
                <td>{fmt(rx.od_sph)}</td>
                <td>{fmt(rx.od_cyl)}</td>
                <td>{fmt(rx.od_axis)}</td>
                <td>{fmt(rx.od_fpd)}</td>
                <td>{fmt(rx.od_npd)}</td>
                <td>{fmt(rx.od_add)}</td>
                <td>{rx.seg_height || ""}</td>
                <td>{fmt(rx.od_oc)}</td>
                <td>{fmt(rx.od_bc)}</td>
              </tr>
              <tr>
                <td className="label-cell">OS</td>
                <td>{fmt(rx.os_sph)}</td>
                <td>{fmt(rx.os_cyl)}</td>
                <td>{fmt(rx.os_axis)}</td>
                <td>{fmt(rx.os_fpd)}</td>
                <td>{fmt(rx.os_npd)}</td>
                <td>{fmt(rx.os_add)}</td>
                <td>{rx.fitting_height || ""}</td>
                <td>{fmt(rx.os_oc)}</td>
                <td>{fmt(rx.os_bc)}</td>
              </tr>
            </tbody>
          </table>
          {hasAnyPrism && (
            <table className="rx-table table-shared">
              <thead>
                <tr>
                  <th></th>
                  <th colSpan={2}>Prism</th>
                  <th colSpan={2}>Prism 2</th>
                  <th>Slab-Off</th>
                  <th>Spcl Thick</th>
                </tr>
                <tr>
                  <th></th>
                  <th>Value</th>
                  <th>Dir</th>
                  <th>Value</th>
                  <th>Dir</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="label-cell">OD</td>
                  <td>{fmt(rx.od_prism_value)}</td>
                  <td>{rx.od_prism_dir || ""}</td>
                  <td>{fmt(rx.od_prism2_value)}</td>
                  <td>{rx.od_prism2_dir || ""}</td>
                  <td>{fmt(rx.od_slab_off)}</td>
                  <td>{rx.od_special_thickness || ""}</td>
                </tr>
                <tr>
                  <td className="label-cell">OS</td>
                  <td>{fmt(rx.os_prism_value)}</td>
                  <td>{rx.os_prism_dir || ""}</td>
                  <td>{fmt(rx.os_prism2_value)}</td>
                  <td>{rx.os_prism2_dir || ""}</td>
                  <td>{fmt(rx.os_slab_off)}</td>
                  <td>{rx.os_special_thickness || ""}</td>
                </tr>
              </tbody>
            </table>
          )}
          {hasAnyDigital && (
            <table className="rx-table table-shared">
              <thead>
                <tr>
                  <th>Digital</th>
                  <th>Face Form</th>
                  <th>PANTO</th>
                  <th>Obj Dist</th>
                  <th>Vtx Ref</th>
                  <th>Vtx Fit</th>
                  <th>Eye Lvl</th>
                  <th>Inset</th>
                  <th>ERCD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="label-cell">OD</td>
                  <td>{fmt(rx.od_face_form_angle)}</td>
                  <td>{fmt(rx.od_panto)}</td>
                  <td>{fmt(rx.od_object_distance)}</td>
                  <td>{fmt(rx.od_vertex_refracted)}</td>
                  <td>{fmt(rx.od_vertex_fitted)}</td>
                  <td>{fmt(rx.od_eye_level)}</td>
                  <td>{fmt(rx.od_inset)}</td>
                  <td>{fmt(rx.od_ercd)}</td>
                </tr>
                <tr>
                  <td className="label-cell">OS</td>
                  <td>{fmt(rx.os_face_form_angle)}</td>
                  <td>{fmt(rx.os_panto)}</td>
                  <td>{fmt(rx.os_object_distance)}</td>
                  <td>{fmt(rx.os_vertex_refracted)}</td>
                  <td>{fmt(rx.os_vertex_fitted)}</td>
                  <td>{fmt(rx.os_eye_level)}</td>
                  <td>{fmt(rx.os_inset)}</td>
                  <td>{fmt(rx.os_ercd)}</td>
                </tr>
              </tbody>
            </table>
          )}
          {rx.pd && (
            <div style={{ fontSize: "10px", marginTop: "4px" }}>
              PD: {rx.pd}
            </div>
          )}
          {rx.rx_notes && (
            <div
              style={{ fontSize: "10px", marginTop: "2px", color: "#718096" }}
            >
              Notes: {rx.rx_notes}
            </div>
          )}
        </div>
      );
    };

    // The shared content markup used for both the off-screen print capture and inline preview
    const DocumentContent = () => (
      <div>
        {/* Header */}
        <div className="header">
          <div>
            <div className="company-name">Classic Visions</div>
            <div className="company-tagline">
              Precision Optics & Lens Solutions
            </div>
          </div>
          <div className="quote-meta">
            <div className="quote-number">{quote.quote_number}</div>
            <div className="quote-type">{quote.quote_type} QUOTE</div>
            <div className="meta-row">Date: {formatDate(quote.created_at)}</div>
            {quote.valid_until && (
              <div className="meta-row">
                Valid Until: {formatDate(quote.valid_until)}
              </div>
            )}
            {quote.lead_time_days && (
              <div className="meta-row">
                Lead Time: {quote.lead_time_days} days
              </div>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="section print-grid-keep">
          <div className="section-title">Customer Details</div>
          <div className="customer-grid print-grid-keep">
            <div>
              <div className="field-label">Customer</div>
              <div className="field-value">{quote.customer_name || "—"}</div>
            </div>
            <div>
              <div className="field-label">Contact</div>
              <div className="field-value">{quote.contact_name || "—"}</div>
            </div>
            <div>
              <div className="field-label">Email</div>
              <div className="field-value">{quote.contact_email || "—"}</div>
            </div>
            <div>
              <div className="field-label">Phone</div>
              <div className="field-value">{quote.contact_phone || "—"}</div>
            </div>
          </div>
        </div>

        {/* Frame */}
        {frameData && (frameData.ref || frameData.model || frameData.a) && (
          <div className="section print-grid-keep">
            <div className="section-title">Frame Details</div>
            <div className="frame-grid print-grid-keep">
              {frameData.ref && (
                <div>
                  <div className="field-label">Brand / Ref</div>
                  <div className="field-value">{frameData.ref}</div>
                </div>
              )}
              {frameData.model && (
                <div>
                  <div className="field-label">Model / Color</div>
                  <div className="field-value">{frameData.model}</div>
                </div>
              )}
              {frameData.a && (
                <div>
                  <div className="field-label">Eye A (mm)</div>
                  <div className="field-value">{frameData.a}</div>
                </div>
              )}
              {frameData.b && (
                <div>
                  <div className="field-label">Eye B (mm)</div>
                  <div className="field-value">{frameData.b}</div>
                </div>
              )}
              {frameData.bridge && (
                <div>
                  <div className="field-label">Bridge (mm)</div>
                  <div className="field-value">{frameData.bridge}</div>
                </div>
              )}
              {frameData.ed && (
                <div>
                  <div className="field-label">ED (mm)</div>
                  <div className="field-value">{frameData.ed}</div>
                </div>
              )}
              {frameData.dbl && (
                <div>
                  <div className="field-label">DBL (mm)</div>
                  <div className="field-value">{frameData.dbl}</div>
                </div>
              )}
              <div>
                <div className="field-label">Edge</div>
                <div className="field-value">
                  {frameData.uncut
                    ? `Uncut${frameData.uncutPrice ? ` $${frameData.uncutPrice}` : ""}`
                    : "Edged"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Line items */}
        <div className="section print-keep-with-next">
          <div className="section-title print-keep-with-next">Line Items</div>
          {lineItemPageChunks.map((chunk) => (
            <div
              key={chunk.key}
              className={`print-list-breakable ${chunk.isContinuation ? "print-page-break-before" : ""}`.trim()}
            >
              {chunk.isContinuation && (
                <div className="print-continuation-header print-keep-with-next">
                  <div className="print-continuation-title">
                    <div>
                      <div className="print-continuation-brand">Classic Visions</div>
                      <div className="print-continuation-context">
                        {quote.customer_name || "Quote"} · Continued
                      </div>
                    </div>
                    <div className="print-continuation-meta">
                      <div className="print-continuation-number">{quote.quote_number}</div>
                      <div className="print-continuation-type">{quote.quote_type} QUOTE</div>
                    </div>
                  </div>
                </div>
              )}
              <table className="table-shared">
                <colgroup>
                  <col style={{ width: QUOTE_LINE_ITEM_COLUMN_WIDTHS[0] }} />
                  <col style={{ width: showInternal ? "38%" : QUOTE_LINE_ITEM_COLUMN_WIDTHS[1] }} />
                  <col style={{ width: QUOTE_LINE_ITEM_COLUMN_WIDTHS[2] }} />
                  {showInternal && <col style={{ width: "11%" }} />}
                  <col style={{ width: showInternal ? "12%" : QUOTE_LINE_ITEM_COLUMN_WIDTHS[3] }} />
                  <col style={{ width: QUOTE_LINE_ITEM_COLUMN_WIDTHS[4] }} />
                  {showInternal && <col style={{ width: "10%" }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th className="desc">Description</th>
                    <th className="right" style={{ width: "50px" }}>
                      Qty
                    </th>
                    {showInternal && (
                      <th className="right" style={{ width: "80px" }}>
                        Cost (L)
                      </th>
                    )}
                    <th className="right" style={{ width: "90px" }}>
                      Unit Price
                    </th>
                    <th className="right" style={{ width: "100px" }}>
                      Line Total
                    </th>
                    {showInternal && (
                      <th className="right" style={{ width: "60px" }}>
                        GP%
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {chunk.rows.map(({ line, displayIndex, isFee }) => (
                    <tr key={line.id} style={isFee ? { fontStyle: "italic" } : undefined}>
                      <td>{displayIndex ?? ""}</td>
                      <td className="desc">
                        {line.item_name}
                        {!isFee && line.description_override && (
                          <div className="table-footnote">
                            {line.description_override}
                          </div>
                        )}
                        {line.line_note && (
                          <div className="table-footnote" style={{ fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                            Note: {line.line_note}
                          </div>
                        )}
                      </td>
                      <td className="right">{line.qty}</td>
                      {showInternal && (
                        <td className="right">
                          {isFee ? "—" : line.unit_cost_landed_bbd.toFixed(2)}
                        </td>
                      )}
                      <td className="right">
                        {line.unit_sell_price_bbd.toFixed(2)}
                      </td>
                      <td className="right">
                        {(line.qty * line.unit_sell_price_bbd).toFixed(2)}
                      </td>
                      {showInternal && (
                        <td
                          className="right"
                          style={isFee ? undefined : {
                            color: line.gp_percent >= 0 ? "#276749" : "#c53030",
                          }}
                        >
                          {isFee ? "—" : `${line.gp_percent.toFixed(1)}%`}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Rx Details */}
        {quote.quote_type === "RX" && lensLines.length > 0 && (
          <div className="section print-grid-keep">
            <div className="section-title print-keep-with-next">
              Prescription Details
            </div>
            {lensLines.map((line) => {
              const rx = rxMap[line.id];
              if (!rx) return null;
              return (
                <div key={line.id} className="rx-section print-avoid-break">
                  <div className="rx-title">{line.item_name}</div>
                  {renderRxTable(rx)}
                </div>
              );
            })}
          </div>
        )}

        {/* Totals */}
        <div className="totals">
          <div className="totals-box print-grid-keep">
            <div className="total-row">
              <span className="label">
                Subtotal ({quote.currency || "BBD"})
              </span>
              <span className="value">{totals.subtotalSell.toFixed(2)}</span>
            </div>
            {showInternal && (
              <>
                <div className="total-row internal">
                  <span className="label">Total Landed Cost</span>
                  <span className="value">
                    {totals.totalLandedCost.toFixed(2)}
                  </span>
                </div>
                <div className="total-row internal">
                  <span className="label">GP $</span>
                  <span className="value">{totals.gpAmount.toFixed(2)}</span>
                </div>
                <div className="total-row internal">
                  <span className="label">GP %</span>
                  <span className="value">{totals.gpPercent.toFixed(1)}%</span>
                </div>
              </>
            )}
            <div className="total-row grand">
              <span className="label">
                Grand Total ({quote.currency || "BBD"})
              </span>
              <span className="value">{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes_customer && (
          <div className="notes-section print-grid-keep">
            <div className="section-title">Notes</div>
            <div className="notes-text">{quote.notes_customer}</div>
          </div>
        )}
        {showInternal && cleanInternalNotes && (
          <div
            className="notes-section print-grid-keep"
            style={{ marginTop: "12px", borderColor: "#fed7d7" }}
          >
            <div className="section-title">
              <span className="internal-badge">INTERNAL</span> Internal Notes
            </div>
            <div className="notes-text">{cleanInternalNotes}</div>
          </div>
        )}

        <div className="footer print-strict-avoid-break">
          <div>Classic Visions — Precision Optics & Lens Solutions</div>
          <div style={{ marginTop: "4px" }}>
            This quote is valid for {quote.lead_time_days || 30} days from the
            date of issue.
          </div>
        </div>
      </div>
    );

    return (
      <>
        {/* Off-screen capture for print */}
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div
            ref={printRef}
            className="print-root"
            style={{
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              color: "#1a202c",
              padding: "40px",
              fontSize: "12px",
            }}
          >
            <DocumentContent />
          </div>
        </div>

        {showTriggerButton && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={doPrint}
            >
              <Download className="h-3.5 w-3.5" />
              Export PDF
            </Button>
            <span className="text-[10px] text-amber-700 dark:text-amber-400">
              Disable browser headers/footers in print settings.
            </span>
          </div>
        )}
      </>
    );
  },
);

QuotePdfExport.displayName = "QuotePdfExport";

// ── Inline Preview Panel ───────────────────────────────────────────────────────
// Renders the same document content visually inside the page
export const QuotePreviewPanel = ({
  quote,
  lines,
  totals,
  rxMap = {},
  frameData,
  printSettings,
  onPrintSettingsChange,
}: Omit<QuotePdfExportProps, "showInternal" | "showTriggerButton"> & {
  onPrintSettingsChange?: (next: PrintSettings) => void;
}) => {
  const [localPrintSettings, setLocalPrintSettings] = useState(
    resolvePrintSettings(printSettings),
  );
  const paneRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [fitScale, setFitScale] = useState(1);
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageOffsets, setPageOffsets] = useState([0]);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const updateScale = () => {
      const page = getPageDimensionsPx(localPrintSettings);
      const availableWidth = Math.max(1, pane.clientWidth - 24);
      const nextFitScale = availableWidth / page.width;
      setFitScale(nextFitScale);
      if (manualZoom == null) {
        setPreviewScale(nextFitScale);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [localPrintSettings, manualZoom]);

  useEffect(() => {
    const updatePageCount = () => {
      const el = measureRef.current;
      if (!el) return;
      const area = getContentAreaPx(localPrintSettings);
      const usableContentHeight = Math.max(1, area.contentHeight - PREVIEW_FOOTER_HEIGHT_PX);
      const continuationContentHeight = Math.max(1, usableContentHeight - PREVIEW_CONTINUATION_HEADER_HEIGHT_PX);
      const rootTop = el.getBoundingClientRect().top;
      const renderedHeight = el.getBoundingClientRect().height;
      const scale =
        el.offsetHeight > 0 && renderedHeight > 0
          ? renderedHeight / el.offsetHeight
          : previewScale || 1;
      const explicitRowBreaks = Array.from(
        el.querySelectorAll('[data-preview-row-break="true"]'),
      );
      const rowBreakSource =
        explicitRowBreaks.length > 0 ? explicitRowBreaks : Array.from(el.querySelectorAll("tbody tr"));
      const rowBreaks = rowBreakSource
        .flatMap((row) => {
          const rect = row.getBoundingClientRect();
          return [
            (rect.top - rootTop) / scale,
            (rect.bottom - rootTop) / scale,
          ];
        })
        .filter((boundary) => Number.isFinite(boundary) && boundary > 0)
        .sort((a, b) => a - b);
      const offsets = [0];
      let start = 0;
      const maxHeight = Math.max(el.scrollHeight, el.getBoundingClientRect().height / scale);
      let pageIndex = 0;

      while (start + (pageIndex === 0 ? usableContentHeight : continuationContentHeight) < maxHeight) {
        const pageContentHeight = pageIndex === 0 ? usableContentHeight : continuationContentHeight;
        const target = start + pageContentHeight;
        const cleanBoundary = rowBreaks
          .filter((boundary) => boundary > start + PREVIEW_PAGE_BREAK_SAFETY_PX && boundary <= target - PREVIEW_PAGE_BREAK_SAFETY_PX)
          .pop();
        const next = cleanBoundary ?? target;
        if (next <= start + 1) break;
        offsets.push(next);
        start = next;
        pageIndex += 1;
      }

      setPageOffsets(offsets);
      setPageCount(offsets.length);
    };
    updatePageCount();
    const frame = requestAnimationFrame(updatePageCount);
    const fontReady = "fonts" in document
      ? document.fonts.ready.then(updatePageCount).catch(() => undefined)
      : undefined;
    const el = measureRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updatePageCount);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      void fontReady;
      observer.disconnect();
    };
  }, [localPrintSettings, previewScale]);

  useEffect(() => {
    setLocalPrintSettings(resolvePrintSettings(printSettings));
  }, [printSettings]);

  const handleSettingsUpdate = (next: Partial<PrintSettings>) => {
    const resolved = resolvePrintSettings({ ...localPrintSettings, ...next });
    setLocalPrintSettings(resolved);
    onPrintSettingsChange?.(resolved);
  };

  const updateMargin = (field: "marginXMm" | "marginYMm", value: string) => {
    const parsed = Number(value);
    handleSettingsUpdate({ [field]: Number.isFinite(parsed) ? parsed : undefined });
  };
  const setZoom = (next: number) => {
    const resolved = Math.min(3, Math.max(0.15, Number(next.toFixed(2))));
    setManualZoom(resolved);
    setPreviewScale(resolved);
  };
  const cleanInternalNotes = stripFrameTag(quote.notes_internal);
  const formatDate = (d?: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  const productLines = lines.filter(
    (l) => l.line_type !== "Fee" && l.line_type !== "Discount",
  );
  const lensLines = lines.filter((l) => l.line_type === "Lens");

  const fmt = (v: number | null | undefined) => (v != null ? v.toString() : "");
  const previewArea = getPrintableContentAreaMm(localPrintSettings);
  const styleMetrics = getQuoteStyleMetrics(localPrintSettings);
  const lineItemColumnWidths = QUOTE_LINE_ITEM_COLUMN_WIDTHS;

  return (
    <div className="border border-border overflow-hidden bg-white shadow-sm flex flex-col h-full">
      {/* Preview chrome bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono flex-1 text-center">
          {quote.quote_number} — Preview
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 px-3 py-2 border-b border-border bg-muted/20 no-print flex-wrap">
        <Select value={localPrintSettings.paperSize} onValueChange={(value: PrintPaperSize) => handleSettingsUpdate({ paperSize: value })}>
          <SelectTrigger className="h-7 w-[88px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="A4">A4</SelectItem><SelectItem value="Letter">Letter</SelectItem></SelectContent>
        </Select>
        <Select
          value={localPrintSettings.orientation}
          onValueChange={(value: PrintOrientation) =>
            handleSettingsUpdate({ orientation: value })
          }
        >
          <SelectTrigger className="h-7 w-[118px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">Portrait</SelectItem>
            <SelectItem value="landscape">Landscape</SelectItem>
          </SelectContent>
        </Select>
        <Select value={localPrintSettings.marginPreset ?? "normal"} onValueChange={(value: "narrow" | "normal" | "wide") => handleSettingsUpdate({ marginPreset: value })}>
          <SelectTrigger className="h-7 w-[96px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="narrow">Narrow</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="wide">Wide</SelectItem></SelectContent>
        </Select>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>H</span>
          <Input type="number" min={0} max={60} step={1} value={localPrintSettings.marginXMm ?? ""} onChange={(e) => updateMargin("marginXMm", e.target.value)} className="h-7 w-20 text-xs" placeholder="mm" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>V</span>
          <Input type="number" min={0} max={60} step={1} value={localPrintSettings.marginYMm ?? ""} onChange={(e) => updateMargin("marginYMm", e.target.value)} className="h-7 w-20 text-xs" placeholder="mm" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Section</span>
          <Input type="number" min={8} max={40} step={1} value={localPrintSettings.sectionGapPx ?? ""} onChange={(e) => handleSettingsUpdate({ sectionGapPx: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : undefined })} className="h-7 w-20 text-xs" placeholder="px" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Heading</span>
          <Input type="number" min={4} max={24} step={1} value={localPrintSettings.headingGapPx ?? ""} onChange={(e) => handleSettingsUpdate({ headingGapPx: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : undefined })} className="h-7 w-20 text-xs" placeholder="px" />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Table</span>
          <Input type="number" min={0.85} max={1.2} step={0.01} value={localPrintSettings.tableFontScale ?? ""} onChange={(e) => handleSettingsUpdate({ tableFontScale: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : undefined })} className="h-7 w-20 text-xs" placeholder="1.0" />
        </div>
      </div>

      <div className="px-3 py-1 text-[10px] text-muted-foreground border-b border-border bg-muted/10">
        <div className="flex items-center justify-between gap-3">
          <span>
            {pageCount > 1 ? `${pageCount} pages · ` : ""}{Math.round(previewArea.contentWidth)}×{Math.round(previewArea.contentHeight)}mm · {Math.round(previewScale * 100)}%
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoom(previewScale - 0.1)} title="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="w-10 text-center font-mono tabular-nums">{Math.round(previewScale * 100)}%</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setZoom(previewScale + 0.1)} title="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1" onClick={() => setZoom(1)} title="Actual size">
              <RotateCcw className="h-3.5 w-3.5" />
              100
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1" onClick={() => { setManualZoom(null); setPreviewScale(fitScale); }} title="Fit width">
              <Maximize className="h-3.5 w-3.5" />
              Fit
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={paneRef}
        className="bg-muted/10 overflow-auto p-3 flex-1"
        style={{ minHeight: "360px" }}
      >
        {(() => {
          const page = getPageDimensionsPx(localPrintSettings);
          const area = getContentAreaPx(localPrintSettings);
          const usableContentHeight = Math.max(1, area.contentHeight - PREVIEW_FOOTER_HEIGHT_PX);
          const totalStackHeight = (page.height * pageCount + PAGE_GAP * (pageCount - 1)) * previewScale;

          return (
            <div className="mx-auto" style={{ width: page.width * previewScale, height: totalStackHeight }}>
              <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: page.width }}>
                {Array.from({ length: pageCount }).map((_, i) => {
                  const isContinuationPage = i > 0;
                  const contentTop = area.marginY + (isContinuationPage ? PREVIEW_CONTINUATION_HEADER_HEIGHT_PX : 0);
                  const pageContentHeight = Math.max(1, usableContentHeight - (isContinuationPage ? PREVIEW_CONTINUATION_HEADER_HEIGHT_PX : 0));
                  const pageStart = pageOffsets[i] ?? i * usableContentHeight;
                  const nextStart = pageOffsets[i + 1] ?? pageStart + pageContentHeight;
                  const cleanCutHeight = Math.max(0, Math.min(pageContentHeight, nextStart - pageStart));
                  const contentClipHeight = i < pageCount - 1 ? cleanCutHeight : pageContentHeight;

                  return (
                  <div key={i} className="relative bg-white shadow-md" style={{ width: page.width, height: page.height, marginBottom: i < pageCount - 1 ? PAGE_GAP / previewScale : 0, overflow: "hidden" }}>
                    {isContinuationPage && (
                      <div
                        className="preview-continuation-header"
                        style={{
                          position: "absolute",
                          top: area.marginY,
                          left: area.marginX,
                          width: area.contentWidth,
                          height: PREVIEW_CONTINUATION_HEADER_HEIGHT_PX - 14,
                          color: "#1a202c",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #2b6cb0", paddingBottom: "8px", marginBottom: "10px" }}>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#2b6cb0" }}>Classic Visions</div>
                            <div style={{ fontSize: "9px", color: "#718096", marginTop: "1px" }}>{quote.customer_name || "Quote"} · Continued</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "12px", fontWeight: 700 }}>{quote.quote_number}</div>
                            <div style={{ fontSize: "9px", color: "#718096", marginTop: "1px" }}>{quote.quote_type} QUOTE</div>
                          </div>
                        </div>
                        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #2b6cb0" }}>
                          <colgroup>
                            {lineItemColumnWidths.map((width) => (
                              <col key={width} style={{ width }} />
                            ))}
                          </colgroup>
                          <thead>
                            <tr style={{ background: "#ebf4ff" }}>
                              <th style={{ textAlign: "left", padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`, fontSize: `${styleMetrics.tableHeaderFontSize}px`, fontWeight: 600, textTransform: "uppercase", color: "#2d3748", border: "1px solid #2b6cb0" }}>#</th>
                              <th style={{ textAlign: "left", padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`, fontSize: `${styleMetrics.tableHeaderFontSize}px`, fontWeight: 600, textTransform: "uppercase", color: "#2d3748", border: "1px solid #2b6cb0" }}>Description</th>
                              <th style={{ textAlign: "right", padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`, fontSize: `${styleMetrics.tableHeaderFontSize}px`, fontWeight: 600, textTransform: "uppercase", color: "#2d3748", border: "1px solid #2b6cb0" }}>Qty</th>
                              <th style={{ textAlign: "right", padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`, fontSize: `${styleMetrics.tableHeaderFontSize}px`, fontWeight: 600, textTransform: "uppercase", color: "#2d3748", border: "1px solid #2b6cb0" }}>Unit Price</th>
                              <th style={{ textAlign: "right", padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`, fontSize: `${styleMetrics.tableHeaderFontSize}px`, fontWeight: 600, textTransform: "uppercase", color: "#2d3748", border: "1px solid #2b6cb0" }}>Total</th>
                            </tr>
                          </thead>
                        </table>
                      </div>
                    )}
                    <div style={{ position: "absolute", top: contentTop, left: area.marginX, width: area.contentWidth, height: contentClipHeight, overflow: "hidden" }}>
                      <div style={{ transform: `translateY(-${pageStart}px)` }}>
                        <div ref={i === 0 ? measureRef : undefined}>
                  <div
                    className="print-root"
                    style={{
                      fontFamily:
                        "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      color: "#1a202c",
                      fontSize: "11px",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "24px",
                        borderBottom: "3px solid #2b6cb0",
                        paddingBottom: "16px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "20px",
                            fontWeight: 700,
                            color: "#2b6cb0",
                          }}
                        >
                          Classic Visions
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#718096",
                            marginTop: "2px",
                          }}
                        >
                          Precision Optics & Lens Solutions
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "16px", fontWeight: 700 }}>
                          {quote.quote_number}
                        </div>
                        <div
                          style={{
                            display: "inline-block",
                            background: "#ebf4ff",
                            color: "#2b6cb0",
                            padding: "2px 8px",
                            borderRadius: "0",
                            fontSize: "10px",
                            fontWeight: 600,
                            marginTop: "4px",
                          }}
                        >
                          {quote.quote_type} QUOTE
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#4a5568",
                            marginTop: "3px",
                          }}
                        >
                          Date: {formatDate(quote.created_at)}
                        </div>
                        {quote.valid_until && (
                          <div style={{ fontSize: "10px", color: "#4a5568" }}>
                            Valid Until: {formatDate(quote.valid_until)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer */}
                    <div style={{ marginBottom: `${styleMetrics.sectionGapPx}px` }}>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#718096",
                          marginBottom: `${styleMetrics.headingGapPx}px`,
                        }}
                      >
                        Customer Details
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: `${Math.max(12, styleMetrics.headingGapPx + 4)}px`,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "9px",
                              color: "#a0aec0",
                              textTransform: "uppercase",
                            }}
                          >
                            Customer
                          </div>
                          <div style={{ fontSize: "11px" }}>
                            {quote.customer_name || "—"}
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "9px",
                              color: "#a0aec0",
                              textTransform: "uppercase",
                            }}
                          >
                            Contact
                          </div>
                          <div style={{ fontSize: "11px" }}>
                            {quote.contact_name || "—"}
                          </div>
                        </div>
                        {quote.contact_email && (
                          <div>
                            <div
                              style={{
                                fontSize: "9px",
                                color: "#a0aec0",
                                textTransform: "uppercase",
                              }}
                            >
                              Email
                            </div>
                            <div style={{ fontSize: "11px" }}>
                              {quote.contact_email}
                            </div>
                          </div>
                        )}
                        {quote.contact_phone && (
                          <div>
                            <div
                              style={{
                                fontSize: "9px",
                                color: "#a0aec0",
                                textTransform: "uppercase",
                              }}
                            >
                              Phone
                            </div>
                            <div style={{ fontSize: "11px" }}>
                              {quote.contact_phone}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Frame */}
                    {frameData &&
                      (frameData.ref || frameData.model || frameData.a) && (
                        <div style={{ marginBottom: `${styleMetrics.sectionGapPx}px` }}>
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              color: "#718096",
                              marginBottom: `${styleMetrics.headingGapPx}px`,
                            }}
                          >
                            Frame Details
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(4,1fr)",
                              gap: `${Math.max(8, styleMetrics.headingGapPx + 2)}px`,
                            }}
                          >
                            {frameData.ref && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "9px",
                                    color: "#a0aec0",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Brand/Ref
                                </div>
                                <div style={{ fontSize: "11px" }}>
                                  {frameData.ref}
                                </div>
                              </div>
                            )}
                            {frameData.model && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "9px",
                                    color: "#a0aec0",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Model
                                </div>
                                <div style={{ fontSize: "11px" }}>
                                  {frameData.model}
                                </div>
                              </div>
                            )}
                            {frameData.a && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "9px",
                                    color: "#a0aec0",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Eye A
                                </div>
                                <div style={{ fontSize: "11px" }}>
                                  {frameData.a}mm
                                </div>
                              </div>
                            )}
                            {frameData.b && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "9px",
                                    color: "#a0aec0",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Eye B
                                </div>
                                <div style={{ fontSize: "11px" }}>
                                  {frameData.b}mm
                                </div>
                              </div>
                            )}
                            {frameData.bridge && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "9px",
                                    color: "#a0aec0",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Bridge
                                </div>
                                <div style={{ fontSize: "11px" }}>
                                  {frameData.bridge}mm
                                </div>
                              </div>
                            )}
                            {frameData.ed && (
                              <div>
                                <div
                                  style={{
                                    fontSize: "9px",
                                    color: "#a0aec0",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  ED
                                </div>
                                <div style={{ fontSize: "11px" }}>
                                  {frameData.ed}mm
                                </div>
                              </div>
                            )}
                            <div>
                              <div
                                style={{
                                  fontSize: "9px",
                                  color: "#a0aec0",
                                  textTransform: "uppercase",
                                }}
                              >
                                Edge
                              </div>
                              <div style={{ fontSize: "11px" }}>
                                {frameData.uncut ? "Uncut" : "Edged"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Lines */}
                    <div style={{ marginBottom: `${styleMetrics.sectionGapPx}px` }}>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#718096",
                          marginBottom: `${styleMetrics.headingGapPx}px`,
                        }}
                      >
                        Line Items
                      </div>
                      <table
                        style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #2b6cb0" }}
                      >
                        <colgroup>
                          {lineItemColumnWidths.map((width) => (
                            <col key={width} style={{ width }} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr style={{ background: "#ebf4ff" }}>
                            <th
                              style={{
                                textAlign: "left",
                                padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`,
                                fontSize: `${styleMetrics.tableHeaderFontSize}px`,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                color: "#2d3748",
                                border: "1px solid #2b6cb0",
                              }}
                            >
                              #
                            </th>
                            <th
                              style={{
                                textAlign: "left",
                                padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`,
                                fontSize: `${styleMetrics.tableHeaderFontSize}px`,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                color: "#2d3748",
                                border: "1px solid #2b6cb0",
                              }}
                            >
                              Description
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`,
                                fontSize: `${styleMetrics.tableHeaderFontSize}px`,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                color: "#2d3748",
                                border: "1px solid #2b6cb0",
                              }}
                            >
                              Qty
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`,
                                fontSize: `${styleMetrics.tableHeaderFontSize}px`,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                color: "#2d3748",
                                border: "1px solid #2b6cb0",
                              }}
                            >
                              Unit Price
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: `${styleMetrics.tableHeaderPaddingY}px ${styleMetrics.tableHeaderPaddingX}px`,
                                fontSize: `${styleMetrics.tableHeaderFontSize}px`,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                color: "#2d3748",
                                border: "1px solid #2b6cb0",
                              }}
                            >
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {productLines.map((line, i) => (
                            <tr
                              key={line.id}
                              data-preview-row-break="true"
                              style={{ background: i % 2 === 1 ? "#f7fbff" : "#ffffff" }}
                            >
                              <td
                                style={{ padding: `${styleMetrics.tableBodyPaddingY}px ${styleMetrics.tableBodyPaddingX}px`, fontSize: `${styleMetrics.tableBodyFontSize}px`, border: "1px solid #2b6cb0" }}
                              >
                                {i + 1}
                              </td>
                              <td
                                style={{ padding: `${styleMetrics.tableBodyPaddingY}px ${styleMetrics.tableBodyPaddingX}px`, fontSize: `${styleMetrics.tableBodyFontSize}px`, border: "1px solid #2b6cb0", textAlign: "left", maxWidth: "250px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                              >
                                {line.item_name}
                                {line.description_override && (
                                  <div
                                    style={{
                                      fontSize: `${styleMetrics.tableFootnoteFontSize}px`,
                                      color: "#718096",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {line.description_override}
                                  </div>
                                )}
                                {line.line_note && (
                                  <div
                                    style={{
                                      fontSize: `${styleMetrics.tableFootnoteFontSize}px`,
                                      color: "#4a5568",
                                      fontStyle: "italic",
                                      whiteSpace: "pre-wrap",
                                      marginTop: "2px",
                                    }}
                                  >
                                    Note: {line.line_note}
                                  </div>
                                )}
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  padding: `${styleMetrics.tableBodyPaddingY}px ${styleMetrics.tableBodyPaddingX}px`,
                                  fontSize: `${styleMetrics.tableBodyFontSize}px`,
                                  fontFamily: "monospace",
                                  border: "1px solid #2b6cb0",
                                }}
                              >
                                {line.qty}
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  padding: `${styleMetrics.tableBodyPaddingY}px ${styleMetrics.tableBodyPaddingX}px`,
                                  fontSize: `${styleMetrics.tableBodyFontSize}px`,
                                  fontFamily: "monospace",
                                  border: "1px solid #2b6cb0",
                                }}
                              >
                                {line.unit_sell_price_bbd.toFixed(2)}
                              </td>
                              <td
                                style={{
                                  textAlign: "right",
                                  padding: `${styleMetrics.tableBodyPaddingY}px ${styleMetrics.tableBodyPaddingX}px`,
                                  fontSize: `${styleMetrics.tableBodyFontSize}px`,
                                  fontFamily: "monospace",
                                  border: "1px solid #2b6cb0",
                                }}
                              >
                                {(line.qty * line.unit_sell_price_bbd).toFixed(
                                  2,
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Rx */}
                    {lensLines.length > 0 &&
                      lensLines.some((l) => rxMap[l.id]) && (
                        <div style={{ marginBottom: `${styleMetrics.sectionGapPx}px` }}>
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              color: "#718096",
                              marginBottom: `${styleMetrics.headingGapPx}px`,
                            }}
                          >
                            Prescription Details
                          </div>
                          {lensLines.map((line) => {
                            const rx = rxMap[line.id];
                            if (!rx) return null;
                            return (
                              <div
                                key={line.id}
                                style={{ marginBottom: "12px" }}
                              >
                                <div
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    color: "#2b6cb0",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {line.item_name}
                                </div>
                                <table
                                  style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                  }}
                                >
                                  <thead>
                                    <tr style={{ background: "#f7fafc" }}>
                                      {[
                                        "Rx",
                                        "SPH",
                                        "CYL",
                                        "AXIS",
                                        "FPD",
                                        "NPD",
                                        "ADD",
                                        "Seg",
                                        "OC",
                                        "BC",
                                      ].map((h) => (
                                        <th
                                          key={h}
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textTransform: "uppercase",
                                            color: "#4a5568",
                                            textAlign: "center",
                                          }}
                                        >
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(["od", "os"] as const).map((eye) => (
                                      <tr key={eye}>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            fontWeight: 600,
                                            background: "#f7fafc",
                                            textAlign: "left",
                                          }}
                                        >
                                          {eye.toUpperCase()}
                                        </td>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textAlign: "center",
                                          }}
                                        >
                                          {fmt((rx as any)[`${eye}_sph`])}
                                        </td>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textAlign: "center",
                                          }}
                                        >
                                          {fmt((rx as any)[`${eye}_cyl`])}
                                        </td>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textAlign: "center",
                                          }}
                                        >
                                          {fmt((rx as any)[`${eye}_axis`])}
                                        </td>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textAlign: "center",
                                          }}
                                        >
                                          {fmt((rx as any)[`${eye}_fpd`])}
                                        </td>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textAlign: "center",
                                          }}
                                        >
                                          {fmt((rx as any)[`${eye}_npd`])}
                                        </td>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textAlign: "center",
                                          }}
                                        >
                                          {fmt((rx as any)[`${eye}_add`])}
                                        </td>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textAlign: "center",
                                          }}
                                        >
                                          {eye === "od"
                                            ? rx.seg_height || ""
                                            : rx.fitting_height || ""}
                                        </td>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textAlign: "center",
                                          }}
                                        >
                                          {fmt((rx as any)[`${eye}_oc`])}
                                        </td>
                                        <td
                                          style={{
                                            border: "1px solid #e2e8f0",
                                            padding: "2px 4px",
                                            fontSize: "9px",
                                            textAlign: "center",
                                          }}
                                        >
                                          {fmt((rx as any)[`${eye}_bc`])}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {rx.pd && (
                                  <div
                                    style={{
                                      fontSize: "9px",
                                      marginTop: "3px",
                                      color: "#4a5568",
                                    }}
                                  >
                                    PD: {rx.pd}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                    {/* Totals */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: "12px",
                      }}
                    >
                      <div style={{ width: "240px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "3px 0",
                            fontSize: "10px",
                          }}
                        >
                          <span style={{ color: "#718096" }}>
                            Subtotal ({quote.currency || "BBD"})
                          </span>
                          <span style={{ fontFamily: "monospace" }}>
                            {totals.subtotalSell.toFixed(2)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 0 3px",
                            fontSize: "13px",
                            fontWeight: 700,
                            borderTop: "2px solid #2b6cb0",
                            marginTop: "4px",
                          }}
                        >
                          <span>Grand Total ({quote.currency || "BBD"})</span>
                          <span style={{ fontFamily: "monospace" }}>
                            {totals.grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {quote.notes_customer && (
                      <div
                        style={{
                          marginTop: "20px",
                          padding: "12px",
                          background: "#f7fafc",
                          borderRadius: "0",
                          border: "1px solid #2b6cb0",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            color: "#718096",
                            marginBottom: "6px",
                          }}
                        >
                          Notes
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#4a5568",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {quote.notes_customer}
                        </div>
                      </div>
                    )}
                  </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="preview-page-footer absolute text-center text-muted-foreground"
                      style={{
                        left: area.marginX,
                        right: area.marginX,
                        bottom: area.marginY * 0.45,
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "10px",
                        fontSize: "9px",
                        color: "#a0aec0",
                      }}
                    >
                      Classic Visions — Precision Optics & Lens Solutions
                    </div>
                    <span className="absolute font-mono select-none pointer-events-none text-muted-foreground" style={{ bottom: area.marginY * 0.18, right: area.marginX, fontSize: "9px", opacity: 0.5 }}>
                      Page {i + 1} of {pageCount}
                    </span>
                  </div>
                )})}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default QuotePdfExport;
