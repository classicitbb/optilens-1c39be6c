import { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from "react";
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
  printSettings?: PrintSettings;
  onPrintSettingsChange?: (next: PrintSettings) => void;
}

const MM_TO_PX = 3.7795275591;

const getPageDimensionsPx = (settings: PrintSettings) => {
  const area = getPrintableContentAreaMm(settings);
  return {
    width: area.pageWidth * MM_TO_PX,
    height: area.pageHeight * MM_TO_PX,
  };
};

const getContentAreaPx = (settings: PrintSettings) => {
  const area = getPrintableContentAreaMm(settings);
  return {
    marginX: area.marginX * MM_TO_PX,
    marginY: area.marginY * MM_TO_PX,
    contentWidth: area.contentWidth * MM_TO_PX,
    contentHeight: area.contentHeight * MM_TO_PX,
  };
};

const PAGE_GAP = 16;

const PdfPreviewShell = ({
  title,
  formatLabel,
  headerRight,
  children,
  maxHeight = "70vh",
  showPrint = true,
  defaultVisible = true,
  defaultPrintSettings,
  printSettings: controlledPrintSettings,
  onPrintSettingsChange,
}: PdfPreviewShellProps) => {
  const [visible, setVisible] = useState(defaultVisible);
  const [internalSettings, setInternalSettings] = useState<PrintSettings>(
    resolvePrintSettings(defaultPrintSettings),
  );
  const [previewScale, setPreviewScale] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const paneRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const printSettings = controlledPrintSettings ?? internalSettings;
  const resolvedSettings = useMemo(() => resolvePrintSettings(printSettings), [printSettings]);
  const contentArea = getPrintableContentAreaMm(resolvedSettings);

  useEffect(() => {
    if (controlledPrintSettings) {
      setInternalSettings(resolvePrintSettings(controlledPrintSettings));
    }
  }, [controlledPrintSettings]);

  // Measure content to determine page count
  const updatePageCount = useCallback(() => {
    const el = measureRef.current;
    if (!el) return;
    const area = getContentAreaPx(resolvedSettings);
    const contentH = el.scrollHeight;
    const pages = Math.max(1, Math.ceil(contentH / area.contentHeight));
    setPageCount(pages);
  }, [resolvedSettings]);

  useEffect(() => {
    updatePageCount();
    const el = measureRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updatePageCount);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updatePageCount, visible, children]);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const updateScale = () => {
      const page = getPageDimensionsPx(resolvedSettings);
      const availableWidth = Math.max(1, pane.clientWidth - 24);
      setPreviewScale(Math.min(1, availableWidth / page.width));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [resolvedSettings, visible, maxHeight]);

  const updatePrintSettings = (next: Partial<PrintSettings>) => {
    const resolved = resolvePrintSettings({ ...resolvedSettings, ...next });
    if (!controlledPrintSettings) {
      setInternalSettings(resolved);
    }
    onPrintSettingsChange?.(resolved);
  };

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
    updatePrintSettings({ [field]: Number.isFinite(parsed) ? parsed : undefined });
  };

  const page = getPageDimensionsPx(resolvedSettings);
  const area = getContentAreaPx(resolvedSettings);
  const totalStackHeight = (page.height * pageCount + PAGE_GAP * (pageCount - 1)) * previewScale;

  return (
    <div className="border border-border overflow-hidden" id="live-preview">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono flex-1 text-center truncate">{title}</span>
        {formatLabel && <span className="text-[10px] font-medium text-primary">{formatLabel}</span>}
      </div>

      <div className="px-3 py-2 bg-muted/20 border-b border-border no-print space-y-2">
        {/* Row 1: Toggle + Page settings grid + Print action + Info */}
        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 shrink-0" onClick={() => setVisible((v) => !v)}>
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{visible ? "Hide" : "Show"}</span>
          </Button>

          {/* Settings grid – auto-fills columns by available width */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-x-3 gap-y-1.5">
            <div className="flex flex-col gap-0.5 min-w-[72px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Paper</span>
              <Select value={resolvedSettings.paperSize} onValueChange={(value: PrintPaperSize) => updatePrintSettings({ paperSize: value })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Paper" /></SelectTrigger>
                <SelectContent><SelectItem value="A4">A4</SelectItem><SelectItem value="Letter">Letter</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-0.5 min-w-[72px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Orientation</span>
              <Select value={resolvedSettings.orientation} onValueChange={(value: PrintOrientation) => updatePrintSettings({ orientation: value })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Orient." /></SelectTrigger>
                <SelectContent><SelectItem value="portrait">Portrait</SelectItem><SelectItem value="landscape">Landscape</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-0.5 min-w-[72px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Margins</span>
              <Select value={resolvedSettings.marginPreset ?? "normal"} onValueChange={(value: "narrow" | "normal" | "wide") => updatePrintSettings({ marginPreset: value })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Margin" /></SelectTrigger>
                <SelectContent><SelectItem value="narrow">Narrow</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="wide">Wide</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-0.5 min-w-[72px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">H mm</span>
              <Input type="number" min={0} max={60} step={1} value={resolvedSettings.marginXMm ?? ""} onChange={(e) => updateMargin("marginXMm", e.target.value)} className="h-7 text-xs" placeholder="mm" />
            </div>

            <div className="flex flex-col gap-0.5 min-w-[72px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">V mm</span>
              <Input type="number" min={0} max={60} step={1} value={resolvedSettings.marginYMm ?? ""} onChange={(e) => updateMargin("marginYMm", e.target.value)} className="h-7 text-xs" placeholder="mm" />
            </div>

            <div className="flex flex-col gap-0.5 min-w-[72px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Section</span>
              <Input type="number" min={8} max={40} step={1} value={resolvedSettings.sectionGapPx ?? ""} onChange={(e) => updatePrintSettings({ sectionGapPx: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : undefined })} className="h-7 text-xs" placeholder="px" />
            </div>

            <div className="flex flex-col gap-0.5 min-w-[72px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Heading</span>
              <Input type="number" min={4} max={24} step={1} value={resolvedSettings.headingGapPx ?? ""} onChange={(e) => updatePrintSettings({ headingGapPx: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : undefined })} className="h-7 text-xs" placeholder="px" />
            </div>

            <div className="flex flex-col gap-0.5 min-w-[72px]">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Table</span>
              <Input type="number" min={0.85} max={1.2} step={0.01} value={resolvedSettings.tableFontScale ?? ""} onChange={(e) => updatePrintSettings({ tableFontScale: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : undefined })} className="h-7 text-xs" placeholder="1.0" />
            </div>
          </div>

          {/* Right: info + actions */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {pageCount > 1 ? `${pageCount} pages · ` : ""}{Math.round(contentArea.contentWidth)}×{Math.round(contentArea.contentHeight)}mm
            </span>
            {showPrint && visible && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handlePrint}>
                <Printer className="h-3.5 w-3.5" />
                Print &amp; Save
              </Button>
            )}
            {headerRight}
          </div>
        </div>

        {showPrint && visible && (
          <p className="text-[10px] text-amber-700 dark:text-amber-400 text-right">
            Disable browser headers/footers in print settings.
          </p>
        )}
      </div>

      {visible && (
        <div ref={paneRef} className="bg-muted/10 overflow-auto" style={{ maxHeight, minHeight: "260px", padding: "12px" }}>
          {/* Scaled page stack */}
          <div className="mx-auto" style={{ width: page.width * previewScale, height: totalStackHeight }}>
            <div style={{ transform: `scale(${previewScale})`, transformOrigin: "top left", width: page.width }}>
              {Array.from({ length: pageCount }).map((_, i) => (
                <div
                  key={i}
                  className="relative bg-white shadow-md"
                  style={{
                    width: page.width,
                    height: page.height,
                    marginBottom: i < pageCount - 1 ? PAGE_GAP / previewScale : 0,
                    overflow: "hidden",
                  }}
                >
                  {/* Page number badge */}
                  <span
                    className="absolute text-muted-foreground font-mono select-none pointer-events-none"
                    style={{ bottom: area.marginY * 0.3, right: area.marginX, fontSize: "9px", opacity: 0.5 }}
                  >
                    Page {i + 1} of {pageCount}
                  </span>

                  {/* Content window – shift content upward for each page */}
                  <div style={{
                    position: "absolute",
                    top: area.marginY,
                    left: area.marginX,
                    width: area.contentWidth,
                    height: area.contentHeight,
                    overflow: "hidden",
                  }}>
                    <div style={{ transform: `translateY(-${i * area.contentHeight}px)` }}>
                      <div
                        ref={i === 0 ? measureRef : undefined}
                        className="print-root w-full"
                        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1a202c", backgroundColor: "#ffffff" }}
                      >
                        {children}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden print source (single continuous flow) */}
          <div style={{ position: "absolute", left: "-9999px", top: 0, width: area.contentWidth }}>
            <div ref={printRef} className="print-root w-full" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1a202c", backgroundColor: "#ffffff" }}>
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfPreviewShell;
