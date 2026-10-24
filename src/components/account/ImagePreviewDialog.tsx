import { useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { ExternalLink, Maximize, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export interface PreviewImage {
  src: string;
  name: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.25;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

const ImageViewer = ({ image }: { image: PreviewImage }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // Shrinks a quarter-turned image so it still fits the pane (the image box was sized for 0 degrees).
  const [fit, setFit] = useState(1);
  const paneRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const fitFor = (degrees: number) => {
    const pane = paneRef.current;
    const img = imageRef.current;
    if (!pane || !img || Math.abs(degrees / 90) % 2 !== 1) return 1;
    // No layout yet (image still loading): dividing by zero would make the whole transform invalid.
    if (!img.offsetWidth || !img.offsetHeight || !pane.clientWidth || !pane.clientHeight) return 1;
    return Math.min(1, pane.clientWidth / img.offsetHeight, pane.clientHeight / img.offsetWidth);
  };

  const zoomBy = (factor: number) => setZoom((current) => clampZoom(current * factor));
  const rotateBy = (degrees: number) => {
    const next = rotation + degrees;
    setRotation(next);
    setFit(fitFor(next));
  };
  const reset = () => {
    setZoom(1);
    setRotation(0);
    setFit(1);
    setOffset({ x: 0, y: 0 });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "+" || event.key === "=") zoomBy(ZOOM_STEP);
    else if (event.key === "-" || event.key === "_") zoomBy(1 / ZOOM_STEP);
    else if (event.key === "r") rotateBy(90);
    else if (event.key === "R") rotateBy(-90);
    else if (event.key === "0") reset();
    else return;
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: offset.x, originY: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    setOffset({ x: state.originX + event.clientX - state.startX, y: state.originY + event.clientY - state.startY });
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };
  const onWheel = (event: WheelEvent<HTMLDivElement>) => zoomBy(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);

  return (
    <div className="flex min-h-0 flex-1 flex-col outline-none" tabIndex={-1} onKeyDown={onKeyDown}>
      <div className="flex items-center gap-1 border-b border-border px-3 py-2 pr-12">
        <DialogTitle className="mr-auto min-w-0 truncate text-sm font-medium">{image.name}</DialogTitle>
        <DialogDescription className="sr-only">Image preview. Use the buttons or + − R keys to zoom and rotate.</DialogDescription>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Zoom out" title="Zoom out (−)" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Zoom in" title="Zoom in (+)" onClick={() => zoomBy(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Rotate left" title="Rotate left (Shift+R)" onClick={() => rotateBy(-90)}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Rotate right" title="Rotate right (R)" onClick={() => rotateBy(90)}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Reset view" title="Reset (0)" onClick={reset}>
          <Maximize className="h-4 w-4" />
        </Button>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <a href={image.src} target="_blank" rel="noreferrer" aria-label="Open original in a new tab" title="Open original">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
      <div
        ref={paneRef}
        className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-muted/40"
        style={{ cursor: zoom > 1 ? "grab" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
      >
        <img
          ref={imageRef}
          src={image.src}
          alt={image.name}
          draggable={false}
          className="max-h-full max-w-full object-contain transition-transform duration-100"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom * fit})` }}
        />
      </div>
    </div>
  );
};

/** Click-to-inspect viewer for an attached image: zoom, rotate, pan. Pass `null` to close. */
export const ImagePreviewDialog = ({ image, onClose }: { image: PreviewImage | null; onClose: () => void }) => (
  <Dialog open={!!image} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="flex h-[85vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
      {/* Remount per image so zoom and rotation start fresh each time. */}
      {image ? <ImageViewer key={image.src} image={image} /> : null}
      <DialogClose asChild>
        <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 z-10 h-8 w-8" aria-label="Close preview">
          <X className="h-4 w-4" />
        </Button>
      </DialogClose>
    </DialogContent>
  </Dialog>
);
