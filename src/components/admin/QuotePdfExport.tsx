import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import type { Quote, QuoteLine } from "@/hooks/useQuotes";

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
}

const QuotePdfExport = ({ quote, lines, totals, showInternal = false }: QuotePdfExportProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${quote.quote_number} - Quote</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a202c; padding: 40px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #2b6cb0; padding-bottom: 20px; }
          .company-name { font-size: 22px; font-weight: 700; color: #2b6cb0; letter-spacing: -0.5px; }
          .company-tagline { font-size: 10px; color: #718096; margin-top: 2px; }
          .quote-meta { text-align: right; }
          .quote-number { font-size: 18px; font-weight: 700; color: #1a202c; }
          .quote-type { display: inline-block; background: #ebf4ff; color: #2b6cb0; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-top: 4px; }
          .meta-row { font-size: 11px; color: #4a5568; margin-top: 3px; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #718096; margin-bottom: 8px; }
          .customer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .field-label { font-size: 10px; color: #a0aec0; text-transform: uppercase; letter-spacing: 0.3px; }
          .field-value { font-size: 12px; color: #1a202c; margin-top: 1px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f7fafc; text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: #4a5568; border-bottom: 2px solid #e2e8f0; }
          th.right { text-align: right; }
          td { padding: 7px 10px; font-size: 11px; border-bottom: 1px solid #edf2f7; color: #2d3748; }
          td.right { text-align: right; font-family: 'SF Mono', 'Menlo', monospace; }
          td.desc { max-width: 280px; }
          tr:last-child td { border-bottom: 2px solid #e2e8f0; }
          .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
          .totals-box { width: 260px; }
          .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
          .total-row .label { color: #718096; }
          .total-row .value { font-family: 'SF Mono', 'Menlo', monospace; color: #1a202c; }
          .total-row.grand { border-top: 2px solid #2b6cb0; padding-top: 8px; margin-top: 6px; font-size: 14px; font-weight: 700; }
          .total-row.grand .label { color: #1a202c; }
          .total-row.internal { color: #a0aec0; font-style: italic; }
          .notes-section { margin-top: 24px; padding: 16px; background: #f7fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
          .notes-text { font-size: 11px; color: #4a5568; white-space: pre-wrap; line-height: 1.5; }
          .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 10px; color: #a0aec0; }
          .internal-badge { background: #fed7d7; color: #c53030; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 600; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const productLines = lines.filter((l) => l.line_type !== "Fee" && l.line_type !== "Discount");
  const feeLines = lines.filter((l) => l.line_type === "Fee" || l.line_type === "Discount");

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="w-full h-7 text-[11px] gap-1"
        onClick={handlePrint}
      >
        <Download className="h-3 w-3" /> Download PDF
      </Button>

      {/* Hidden printable content */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={printRef}>
          {/* Header */}
          <div className="header">
            <div>
              <div className="company-name">OptiLens Pro</div>
              <div className="company-tagline">Precision Optics & Lens Solutions</div>
            </div>
            <div className="quote-meta">
              <div className="quote-number">{quote.quote_number}</div>
              <div className="quote-type">{quote.quote_type} QUOTE</div>
              <div className="meta-row">Date: {formatDate(quote.created_at)}</div>
              {quote.valid_until && <div className="meta-row">Valid Until: {formatDate(quote.valid_until)}</div>}
              {quote.lead_time_days && <div className="meta-row">Lead Time: {quote.lead_time_days} days</div>}
            </div>
          </div>

          {/* Customer */}
          <div className="section">
            <div className="section-title">Customer Details</div>
            <div className="customer-grid">
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

          {/* Line items table */}
          <div className="section">
            <div className="section-title">Line Items</div>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th className="desc">Description</th>
                  <th className="right" style={{ width: "50px" }}>Qty</th>
                  {showInternal && <th className="right" style={{ width: "80px" }}>Cost (L)</th>}
                  <th className="right" style={{ width: "90px" }}>Unit Price</th>
                  <th className="right" style={{ width: "100px" }}>Line Total</th>
                  {showInternal && <th className="right" style={{ width: "60px" }}>GP%</th>}
                </tr>
              </thead>
              <tbody>
                {productLines.map((line, i) => (
                  <tr key={line.id}>
                    <td>{i + 1}</td>
                    <td className="desc">
                      {line.item_name}
                      {line.description_override && (
                        <div style={{ fontSize: "10px", color: "#718096" }}>{line.description_override}</div>
                      )}
                    </td>
                    <td className="right">{line.qty}</td>
                    {showInternal && <td className="right">{line.unit_cost_landed_bbd.toFixed(2)}</td>}
                    <td className="right">{line.unit_sell_price_bbd.toFixed(2)}</td>
                    <td className="right">{(line.qty * line.unit_sell_price_bbd).toFixed(2)}</td>
                    {showInternal && (
                      <td className="right" style={{ color: line.gp_percent >= 0 ? "#276749" : "#c53030" }}>
                        {line.gp_percent.toFixed(1)}%
                      </td>
                    )}
                  </tr>
                ))}
                {feeLines.map((line) => (
                  <tr key={line.id} style={{ fontStyle: "italic" }}>
                    <td></td>
                    <td className="desc">{line.item_name}</td>
                    <td className="right">{line.qty}</td>
                    {showInternal && <td className="right">—</td>}
                    <td className="right">{line.unit_sell_price_bbd.toFixed(2)}</td>
                    <td className="right">{(line.qty * line.unit_sell_price_bbd).toFixed(2)}</td>
                    {showInternal && <td className="right">—</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="totals">
            <div className="totals-box">
              <div className="total-row">
                <span className="label">Subtotal ({quote.currency || "BBD"})</span>
                <span className="value">{totals.subtotalSell.toFixed(2)}</span>
              </div>
              {showInternal && (
                <>
                  <div className="total-row internal">
                    <span className="label">Total Landed Cost</span>
                    <span className="value">{totals.totalLandedCost.toFixed(2)}</span>
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
                <span className="label">Grand Total ({quote.currency || "BBD"})</span>
                <span className="value">{totals.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes_customer && (
            <div className="notes-section">
              <div className="section-title">Notes</div>
              <div className="notes-text">{quote.notes_customer}</div>
            </div>
          )}

          {showInternal && quote.notes_internal && (
            <div className="notes-section" style={{ marginTop: "12px", borderColor: "#fed7d7" }}>
              <div className="section-title"><span className="internal-badge">INTERNAL</span> Internal Notes</div>
              <div className="notes-text">{quote.notes_internal}</div>
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <div>OptiLens Pro — Precision Optics & Lens Solutions</div>
            <div style={{ marginTop: "4px" }}>This quote is valid for {quote.lead_time_days || 30} days from the date of issue.</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuotePdfExport;
