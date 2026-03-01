import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildPrintStyles, getPrintableContentAreaMm, resolvePrintSettings } from "@/features/admin/print/printStyles";
import { getPersistedPrintSettings } from "@/features/admin/print/printSettingsStore";
import { PrintOrientation, PrintPaperSize, PrintSettings } from "@/features/admin/print/types";
import { preparePrintListChunks, type PrintListSection } from "@/features/admin/print/printLayout";
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
  .table-shared { border: 1px solid var(--table-border-color); }
  .table-shared th { background: var(--table-header-bg); text-align: left; padding: ${metrics.tableHeaderPaddingY}px ${metrics.tableHeaderPaddingX}px; font-size: var(--table-header-font-size); font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #2d3748; border: 1px solid var(--table-border-color); }
  .table-shared td { padding: ${metrics.tableBodyPaddingY}px ${metrics.tableBodyPaddingX}px; font-size: var(--table-body-font-size); color: #2d3748; border: 1px solid var(--table-border-color); }
  .table-shared tbody tr:nth-child(even) { background: var(--table-row-even-bg); }
  .table-shared th.right, .table-shared td.right, .table-shared .table-col-number { text-align: right; font-family: 'SF Mono', 'Menlo', monospace; }
  .table-shared th.center, .table-shared td.center { text-align: center; }
  .table-shared th.desc, .table-shared td.desc, .table-shared .table-col-description { text-align: left; }
  .table-shared td.desc { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
  .internal-badge { background: #fed7d7; color: #c53030; padding: 1px 6px; border-radius: 0; font-size: 9px; font-weight: 600; }
  .rx-section { margin-top: ${metrics.rxSectionGapPx}px; page-break-inside: avoid; }
  .rx-title { font-size: 11px; font-weight: 600; margin-bottom: ${Math.max(4, metrics.headingGapPx - 2)}px; color: #2b6cb0; }
  .rx-table { width: 100%; border-collapse: collapse; margin-bottom: ${metrics.headingGapPx}px; }
  .rx-table td.label-cell { text-align: left; font-weight: 600; background: var(--table-header-bg); width: 40px; white-space: nowrap; }
  .quote-type { border-radius: 0; }
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
        <style>${buildPrintStyles(resolvedPrintSettings)}${getQuoteDocumentStyles(resolvedPrintSettings)}</style></head><body><div class="print-root">${content.innerHTML}</div></body></html>`);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 300);
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

    const lineItemSections: PrintListSection<(typeof lineItemRows)[number]>[] = [
      {
        key: "quote-line-items",
        label: "Line Items",
        rows: lineItemRows,
      },
    ];

    const lineItemChunks = preparePrintListChunks(lineItemSections, {
      rowsPerPage: 14,
      minSplitThreshold: 5,
    });

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
            <div className="company-name">OptiLens Pro</div>
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
          {lineItemChunks.map((chunk) => (
            <div
              key={chunk.key}
              className={`print-list-breakable ${chunk.pageBreakBefore ? "print-page-break-before" : ""}`.trim()}
            >
              <table className="table-shared">
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
          <div>OptiLens Pro — Precision Optics & Lens Solutions</div>
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
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={doPrint}
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
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
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const updateScale = () => {
      const page = getPageDimensionsPx(localPrintSettings);
      const availableWidth = Math.max(1, pane.clientWidth - 24);
      const availableHeight = Math.max(1, pane.clientHeight - 24);
      setPreviewScale(
        Math.min(availableWidth / page.width, availableHeight / page.height),
      );
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [localPrintSettings]);

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

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
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
        Preview content area: {Math.round(previewArea.contentWidth)}×{Math.round(previewArea.contentHeight)}mm
      </div>

      <div
        ref={paneRef}
        className="bg-muted/10 overflow-auto p-3"
        style={{ maxHeight: "600px", minHeight: "360px" }}
      >
        {(() => {
          const page = getPageDimensionsPx(localPrintSettings);
          const content = getContentBoxDimensionsPx(localPrintSettings);

          return (
            <div
              className="mx-auto"
              style={{
                width: page.width * previewScale,
                height: page.height * previewScale,
              }}
            >
              <div
                className="relative bg-white shadow-md"
                style={{
                  width: page.width,
                  height: page.height,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: content.margin,
                    right: content.margin,
                    bottom: content.margin,
                    left: content.margin,
                    overflowY: "auto",
                  }}
                >
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
                          OptiLens Pro
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
                        style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #2b6cb0" }}
                      >
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

                    <div
                      style={{
                        marginTop: "28px",
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "12px",
                        textAlign: "center",
                        fontSize: "9px",
                        color: "#a0aec0",
                      }}
                    >
                      OptiLens Pro — Precision Optics & Lens Solutions
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default QuotePdfExport;
