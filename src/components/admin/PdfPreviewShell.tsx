import { useEffect, useState, useRef, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildPrintStyles, getPrintableContentAreaMm, resolvePrintSettings } from "@/features/admin/print/printStyles";
import { PrintOrientation, PrintPaperSize, PrintSettings } from "@/features/admin/print/types";

interface PdfPreviewShellProps {
  title: string;
  formatLabel?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  maxHeight?: string;
  showPrint?: boolean;
  defaultVisible?: boolean;
  defaultPrintSettings?: Partial<PrintSettings>;
}

const PdfPreviewShell = ({
  title,
  formatLabel,
  headerRight,
  children,
  maxHeight = "70vh",
  showPrint = true,
  defaultVisible = true,
  defaultPrintSettings,
}: PdfPreviewShellProps) => {
  const [visible, setVisible] = useState(defaultVisible);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(
    resolvePrintSettings(defaultPrintSettings),
  );
  const printRef = useRef<HTMLDivElement>(null);
  const contentArea = getPrintableContentAreaMm(printSettings);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document
      .write(`<!DOCTYPE html><html><head><title>${title}</title>
      <style>${buildPrintStyles(printSettings)}</style>
    </head><body>
      <div class="pre-print-hint">Disable browser headers/footers in print settings.</div>
      <div class="print-root">${content.innerHTML}</div>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const updateMargin = (field: "marginXMm" | "marginYMm", value: string) => {
    const parsed = Number(value);
    setPrintSettings((prev) => resolvePrintSettings({ ...prev, [field]: Number.isFinite(parsed) ? parsed : undefined }));
  };

  return (
    <div
      className="border border-border rounded-lg overflow-hidden"
      id="live-preview"
    >
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
          <span className="text-[10px] font-medium text-primary">
            {formatLabel}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border no-print">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {visible ? "Hide Preview" : "Show Preview"}
          </Button>

          <div className="flex items-center gap-2">
            <Select
              value={printSettings.paperSize}
              onValueChange={(value: PrintPaperSize) =>
                setPrintSettings((prev) => ({ ...prev, paperSize: value }))
              }
            >
              <SelectTrigger className="h-7 w-[88px] text-xs">
                <SelectValue placeholder="Paper" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={printSettings.orientation}
              onValueChange={(value: PrintOrientation) =>
                setPrintSettings((prev) => ({ ...prev, orientation: value }))
              }
            >
              <SelectTrigger className="h-7 w-[118px] text-xs">
                <SelectValue placeholder="Orientation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={printSettings.marginPreset ?? "normal"}
              onValueChange={(value: "narrow" | "normal" | "wide") => setPrintSettings((prev) => ({ ...prev, marginPreset: value }))}
            >
              <SelectTrigger className="h-7 w-[96px] text-xs"><SelectValue placeholder="Margin" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Narrow</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">H</span>
              <Input type="number" min={0} max={60} step={1} value={printSettings.marginXMm ?? ""} onChange={(e) => updateMargin("marginXMm", e.target.value)} className="h-7 w-16 text-xs" placeholder="mm" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">V</span>
              <Input type="number" min={0} max={60} step={1} value={printSettings.marginYMm ?? ""} onChange={(e) => updateMargin("marginYMm", e.target.value)} className="h-7 w-16 text-xs" placeholder="mm" />
            </div>
          </div>

          {showPrint && visible && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handlePrint}
              >
                <Printer className="h-3.5 w-3.5" />
                Print &amp; Save
              </Button>
              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                Disable browser headers/footers in print settings.
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Content {Math.round(contentArea.contentWidth)}×{Math.round(contentArea.contentHeight)}mm</span>
          {headerRight}
        </div>
      </div>

      {visible && (
        <div
          ref={paneRef}
          className="bg-muted/10 overflow-auto"
          style={{
            maxHeight,
            minHeight: "260px",
            padding: "12px",
          }}
        >
          {(() => {
            const page = getPageDimensionsPx(printSettings);
            const content = getContentBoxDimensionsPx(printSettings);

            return (
              <div
                className="mx-auto"
                style={{
                  width: page.width * previewScale,
                  height: page.height * previewScale,
                }}
              >
                <div
                  className="relative bg-background shadow-md"
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
                      overflow: "hidden",
                    }}
                  >
                    <div
                      ref={printRef}
                      className="print-root h-full w-full"
                      style={{
                        fontFamily:
                          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                        color: "#1a202c",
                      }}
                    >
                      {children}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default PdfPreviewShell;
