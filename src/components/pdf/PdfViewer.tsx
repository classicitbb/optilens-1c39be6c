import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, ExternalLink, Loader2, Minus, Plus, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Cross-platform PDF viewer.
 *
 * Renders pages to <canvas> with pdf.js instead of relying on the browser's
 * built-in PDF plugin, which is unavailable on iOS Safari, Android Chrome and
 * most in-app browsers. The worker is bundled and served same-origin so no CSP
 * exception or CDN is required.
 */

type PdfViewerProps = {
  /** URL of the PDF (same-origin or CORS-enabled). */
  url: string;
  /** Accessible label for the document region. */
  title: string;
  className?: string;
  /** Optional download filename for the fallback button. */
  downloadName?: string;
};

type PdfDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
  destroy: () => Promise<void> | void;
};

type PdfPageProxy = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void>; cancel: () => void };
  cleanup?: () => void;
};

let pdfjsPromise: Promise<any> | null = null;

const loadPdfjs = async () => {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // The legacy build targets older browsers (iOS Safari, in-app webviews)
      // and avoids very recent JS APIs that newer pdf.js builds require.
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;

    })();
  }
  return pdfjsPromise;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

const PdfPage = ({
  doc,
  pageNumber,
  width,
  scale,
}: {
  doc: PdfDocumentProxy;
  pageNumber: number;
  width: number;
  scale: number;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [rendered, setRendered] = useState(false);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || width <= 0) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;

    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const target = (width * scale) / base.width;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: target * dpr });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(width * scale)}px`;
      canvas.style.height = `${Math.floor((width * scale * base.height) / base.width)}px`;
      const render = page.render({ canvasContext: context, viewport });
      task = render;
      try {
        await render.promise;
        if (!cancelled) setRendered(true);
      } catch {
        /* render cancelled */
      } finally {
        page.cleanup?.();
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, visible, width, scale]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto bg-background shadow-sm ring-1 ring-border"
      style={{
        width: Math.floor(width * scale),
        minHeight: rendered ? undefined : Math.floor(width * scale * ratio),
      }}
    >
      <canvas ref={canvasRef} className="block h-auto w-full" aria-label={`Page ${pageNumber}`} />
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

const PdfViewer = ({ url, title, className, downloadName }: PdfViewerProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [doc, setDoc] = useState<PdfDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scale, setScale] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const update = () => setContainerWidth(Math.max(node.clientWidth - 32, 240));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loaded: PdfDocumentProxy | null = null;
    setDoc(null);
    setError(null);
    setProgress(0);

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const task = pdfjs.getDocument({ url, withCredentials: false });
        task.onProgress = ({ loaded: done, total }: { loaded: number; total: number }) => {
          if (total > 0 && !cancelled) setProgress(Math.round((done / total) * 100));
        };
        const result = (await task.promise) as PdfDocumentProxy;
        if (cancelled) {
          await result.destroy();
          return;
        }
        loaded = result;
        setDoc(result);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "The document could not be loaded.");
        }
      }
    })();

    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
  }, [url, reloadKey]);

  const pages = useMemo(
    () => (doc ? Array.from({ length: doc.numPages }, (_, index) => index + 1) : []),
    [doc],
  );

  const zoom = useCallback((delta: number) => {
    setScale((current) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((current + delta).toFixed(2)))));
  }, []);

  return (
    <div className={cn("flex min-h-0 flex-col border border-border bg-muted/20", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
        <p className="text-xs text-muted-foreground">
          {doc ? `${doc.numPages} page${doc.numPages === 1 ? "" : "s"}` : error ? "Preview unavailable" : "Loading…"}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => zoom(-0.25)}
            disabled={!doc || scale <= MIN_SCALE}
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => zoom(0.25)}
            disabled={!doc || scale >= MAX_SCALE}
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setScale(1)}
            disabled={!doc || scale === 1}
          >
            Fit width
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto p-4" role="document" aria-label={title}>
        {error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="max-w-sm text-sm text-muted-foreground">
              The preview could not be displayed on this device. You can still open or download the PDF.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
                <RotateCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                Try again
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  Open in new tab
                </a>
              </Button>
              <Button asChild size="sm">
                <a href={url} download={downloadName}>
                  <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                  Download PDF
                </a>
              </Button>
            </div>
          </div>
        ) : !doc ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="text-xs">{progress > 0 ? `Loading document… ${progress}%` : "Loading document…"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pages.map((pageNumber) => (
              <PdfPage
                key={pageNumber}
                doc={doc}
                pageNumber={pageNumber}
                width={containerWidth}
                scale={scale}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
