import { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Printer, ZoomIn, ZoomOut, Maximize, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
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
  defaultSettingsVisible?: boolean;
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

const getActiveDocumentStylesMarkup = () =>
  Array.from(document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]'))
    .map((node) => node.outerHTML)
    .join("\n");

const PdfPreviewShell = ({
  title,
  formatLabel,
  headerRight,
  children,
  maxHeight = "70vh",
  showPrint = true,
  defaultVisible = true,
  defaultSettingsVisible = true,
  defaultPrintSettings,
  printSettings: controlledPrintSettings,
  onPrintSettingsChange,
}: PdfPreviewShellProps) => {
  const [visible, setVisible] = useState(defaultVisible);
  const [internalSettings, setInternalSettings] = useState<PrintSettings>(
    resolvePrintSettings(defaultPrintSettings),
  );
  const [previewScale, setPreviewScale] = useState(1);
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [_settingsVisible, _setSettingsVisible] = useState(defaultSettingsVisible);
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

  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const updateScale = () => {
      const page = getPageDimensionsPx(resolvedSettings);
      const rawStackHeight = page.height * pageCount + PAGE_GAP * Math.max(0, pageCount - 1);
      const availableWidth = Math.max(1, pane.clientWidth - 24);
      const availableHeight = Math.max(1, pane.clientHeight - 24);
      const widthScale = availableWidth / page.width;
      const heightScale = availableHeight / rawStackHeight;
      const fit = Math.min(widthScale, heightScale);
      setFitScale(fit);
      if (manualZoom == null) {
        setPreviewScale(fit);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [resolvedSettings, visible, maxHeight, pageCount, manualZoom]);

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
    const documentStyles = getActiveDocumentStylesMarkup();

    printWindow.document
      .write(`<!DOCTYPE html><html><head><title>${title}</title>
      ${documentStyles}
      <style>${buildPrintStyles(printSettings)}</style>
    </head><body>
      <div class="pre-print-hint">Disable browser headers/footers in print settings.</div>
      <div class="print-root">${content.innerHTML}</div>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 600);
  };

  const updateMargin = (field: "marginXMm" | "marginYMm", value: string) => {
    const parsed = Number(value);
    updatePrintSettings({ [field]: Number.isFinite(parsed) ? parsed : undefined });
  };

  const handleResetPageBreaks = () => {
    // Reset to defaults that allow natural page flow
    updatePrintSettings({
      sectionGapPx: 24,
      headingGapPx: 8,
      tableFontScale: 1,
    });
  };

  const page = getPageDimensionsPx(resolvedSettings);
  const area = getContentAreaPx(resolvedSettings);
  const totalStackHeight = (page.height * pageCount + PAGE_GAP * (pageCount - 1)) * previewScale;

  const ToolbarInput = ({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] uppercase tracking-widest text-neutral-400 leading-none select-none">{label}</span>
      <Input {...props} className="h-6 w-14 text-[10px] bg-neutral-800 border-neutral-600 text-neutral-100 px-1.5 focus:border-amber-500 focus:ring-amber-500/30" />
    </div>
  );

  const ToolbarSelect = ({ label, value, onValueChange, children: opts }: { label: string; value: string; onValueChange: (v: string) => void; children: ReactNode }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[8px] uppercase tracking-widest text-neutral-400 leading-none select-none">{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-6 w-[72px] text-[10px] bg-neutral-800 border-neutral-600 text-neutral-100 px-1.5 focus:border-amber-500 focus:ring-amber-500/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-neutral-800 border-neutral-600 text-neutral-100">
          {opts}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="border border-border overflow-hidden" id="live-preview">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <span className="text-[10px] text-muted-foreground font-mono flex-1 text-center truncate">{title}</span>
        {formatLabel && <span className="text-[10px] font-medium text-primary">{formatLabel}</span>}
        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setVisible((v) => !v)} title={visible ? "Hide preview" : "Show preview"}>
          {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
      </div>

      {/* Photoshop-style toolbar */}
      <div className="border-b border-neutral-700 bg-neutral-900 px-2 py-1.5 no-print">
        <div className="flex items-end gap-1 flex-wrap">
          {/* Document settings group */}
          <TooltipProvider delayDuration={200}>
            <ToolbarSelect label="Paper" value={resolvedSettings.paperSize} onValueChange={(v: string) => updatePrintSettings({ paperSize: v as PrintPaperSize })}>
              <SelectItem value="A4">A4</SelectItem>
              <SelectItem value="Letter">Letter</SelectItem>
            </ToolbarSelect>

            <ToolbarSelect label="Orient." value={resolvedSettings.orientation} onValueChange={(v: string) => updatePrintSettings({ orientation: v as PrintOrientation })}>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </ToolbarSelect>

            <ToolbarSelect label="Margins" value={resolvedSettings.marginPreset ?? "normal"} onValueChange={(v: string) => updatePrintSettings({ marginPreset: v as "narrow" | "normal" | "wide" })}>
              <SelectItem value="narrow">Narrow</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="wide">Wide</SelectItem>
            </ToolbarSelect>

            <Separator orientation="vertical" className="h-8 bg-neutral-700 mx-1" />

            <ToolbarInput label="H mm" type="number" min={0} max={60} step={1} value={resolvedSettings.marginXMm ?? ""} onChange={(e) => updateMargin("marginXMm", e.target.value)} placeholder="mm" />
            <ToolbarInput label="V mm" type="number" min={0} max={60} step={1} value={resolvedSettings.marginYMm ?? ""} onChange={(e) => updateMargin("marginYMm", e.target.value)} placeholder="mm" />

            <Separator orientation="vertical" className="h-8 bg-neutral-700 mx-1" />

            {/* Layout settings */}
            <ToolbarInput label="Section" type="number" min={8} max={40} step={1} value={resolvedSettings.sectionGapPx ?? ""} onChange={(e) => updatePrintSettings({ sectionGapPx: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : undefined })} placeholder="px" />
            <ToolbarInput label="Heading" type="number" min={4} max={24} step={1} value={resolvedSettings.headingGapPx ?? ""} onChange={(e) => updatePrintSettings({ headingGapPx: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : undefined })} placeholder="px" />
            <ToolbarInput label="Table" type="number" min={0.85} max={1.2} step={0.01} value={resolvedSettings.tableFontScale ?? ""} onChange={(e) => updatePrintSettings({ tableFontScale: Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : undefined })} placeholder="1.0" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800" onClick={handleResetPageBreaks} title="Reset page break settings">
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">Reset layout defaults</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-8 bg-neutral-700 mx-1" />

            {/* Zoom controls */}
            <div className="flex items-center gap-0.5">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800" onClick={() => { const next = Math.max(0.1, previewScale - 0.1); setManualZoom(next); setPreviewScale(next); }} title="Zoom out">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-neutral-300 w-9 text-center tabular-nums font-mono">{Math.round(previewScale * 100)}%</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800" onClick={() => { const next = Math.min(3, previewScale + 0.1); setManualZoom(next); setPreviewScale(next); }} title="Zoom in">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-1 text-[9px] text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 font-mono" onClick={() => { setManualZoom(1); setPreviewScale(1); }} title="Actual size (100%)">
                <Maximize className="h-3 w-3 mr-0.5" />1:1
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[9px] text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 font-mono" onClick={() => { setManualZoom(null); setPreviewScale(fitScale); }} title="Fit to view">
                Fit
              </Button>
            </div>

            <Separator orientation="vertical" className="h-8 bg-neutral-700 mx-1" />

            {/* Info & actions */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[9px] text-neutral-500 whitespace-nowrap font-mono">
                {pageCount > 1 ? `${pageCount}pg · ` : ""}{Math.round(contentArea.contentWidth)}×{Math.round(contentArea.contentHeight)}mm
              </span>
              {showPrint && visible && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-amber-400 hover:text-amber-300 hover:bg-neutral-800 px-2" onClick={handlePrint}>
                  <Printer className="h-3 w-3" />
                  Print
                </Button>
              )}
              {headerRight}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {visible && (
        <div ref={paneRef} className="bg-muted/10 overflow-auto" style={{ height: maxHeight, minHeight: "260px", padding: "12px" }}>
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
                  <span
                    className="absolute text-muted-foreground font-mono select-none pointer-events-none"
                    style={{ bottom: area.marginY * 0.3, right: area.marginX, fontSize: "9px", opacity: 0.5 }}
                  >
                    Page {i + 1} of {pageCount}
                  </span>
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
