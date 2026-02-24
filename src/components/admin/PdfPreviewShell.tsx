import { useState, useRef, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Printer } from "lucide-react";

interface PdfPreviewShellProps {
  /** Title shown in the chrome bar (e.g. "RX Lens Prices — Preview") */
  title: string;
  /** Right-side label (e.g. "Matrix" or "List") */
  formatLabel?: string;
  /** Optional extra controls rendered in the chrome bar (e.g. format toggle) */
  headerRight?: ReactNode;
  /** The preview content */
  children: ReactNode;
  /** Max height for the scrollable preview area */
  maxHeight?: string;
  /** Whether to show the print button (default true) */
  showPrint?: boolean;
  /** Initial visibility (default true) */
  defaultVisible?: boolean;
}

const PdfPreviewShell = ({
  title,
  formatLabel,
  headerRight,
  children,
  maxHeight = "70vh",
  showPrint = true,
  defaultVisible = true,
}: PdfPreviewShellProps) => {
  const [visible, setVisible] = useState(defaultVisible);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a202c; padding: 20px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e4db7; color: white; padding: 8px 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; text-align: left; }
        th.right, td.right { text-align: right; }
        td { padding: 6px 12px; font-size: 11px; border-bottom: 1px solid #e2e8f0; color: #2d3748; }
        @media print { body { padding: 10px; } }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden" id="live-preview">
      {/* macOS-style chrome bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono flex-1 text-center truncate">
          {title}
        </span>
        {formatLabel && (
          <span className="text-[10px] font-medium text-primary">{formatLabel}</span>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border no-print">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {visible ? "Hide Preview" : "Show Preview"}
          </Button>
          {showPrint && visible && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" />
              Print &amp; Save
            </Button>
          )}
        </div>
        {headerRight}
      </div>

      {/* Preview content */}
      {visible && (
        <div
          ref={printRef}
          className="bg-background overflow-auto"
          style={{
            maxHeight,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "#1a202c",
            padding: "20px",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default PdfPreviewShell;
