import { useRef, useCallback, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { CanvasObject } from "../types";
import CanvasObjectRenderer from "./CanvasObjectRenderer";

interface Props {
  objects: CanvasObject[];
  selectedObjectId: string | null;
  zoom: number;
  onSelectObject: (id: string | null) => void;
  onUpdateObject: (obj: Partial<CanvasObject> & { id: string }) => void;
}

const A4_WIDTH = 560;
const A4_HEIGHT = 792;

const EditorCanvas = ({ objects, selectedObjectId, zoom, onSelectObject, onUpdateObject }: Props) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ id: string; startX: number; startY: number; objX: number; objY: number } | null>(null);
  const [resizeState, setResizeState] = useState<{ id: string; handle: string; startX: number; startY: number; objX: number; objY: number; objW: number; objH: number } | null>(null);

  const scale = zoom / 100;

  const handleCanvasClick = (e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-canvas-object]")) return;
    onSelectObject(null);
  };

  const handleObjectMouseDown = useCallback(
    (e: ReactMouseEvent, obj: CanvasObject) => {
      if (obj.is_locked) return;
      e.stopPropagation();
      onSelectObject(obj.id);
      setDragState({ id: obj.id, startX: e.clientX, startY: e.clientY, objX: obj.x, objY: obj.y });
    },
    [onSelectObject]
  );

  const handleResizeMouseDown = useCallback(
    (e: ReactMouseEvent, obj: CanvasObject, handle: string) => {
      e.stopPropagation();
      e.preventDefault();
      setResizeState({
        id: obj.id,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        objX: obj.x,
        objY: obj.y,
        objW: obj.width,
        objH: obj.height ?? 100,
      });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (dragState) {
        const dx = (e.clientX - dragState.startX) / scale;
        const dy = (e.clientY - dragState.startY) / scale;
        onUpdateObject({ id: dragState.id, x: Math.round(dragState.objX + dx), y: Math.round(dragState.objY + dy) });
      }
      if (resizeState) {
        const dx = (e.clientX - resizeState.startX) / scale;
        const dy = (e.clientY - resizeState.startY) / scale;
        const h = resizeState.handle;

        let newX = resizeState.objX;
        let newY = resizeState.objY;
        let newW = resizeState.objW;
        let newH = resizeState.objH;

        if (h.includes("r")) newW = Math.max(20, resizeState.objW + dx);
        if (h.includes("l")) { newW = Math.max(20, resizeState.objW - dx); newX = resizeState.objX + dx; }
        if (h.includes("b")) newH = Math.max(20, resizeState.objH + dy);
        if (h.includes("t")) { newH = Math.max(20, resizeState.objH - dy); newY = resizeState.objY + dy; }

        onUpdateObject({ id: resizeState.id, x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) });
      }
    },
    [dragState, resizeState, scale, onUpdateObject]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
    setResizeState(null);
  }, []);

  const sortedObjects = [...objects].sort((a, b) => a.z_index - b.z_index);

  return (
    <div
      className="flex-1 bg-muted/40 relative overflow-hidden transition-colors"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 flex items-start justify-center p-8 overflow-auto" onClick={handleCanvasClick}>
        <div
          ref={canvasRef}
          className="bg-background shadow-lg relative shrink-0 rounded-[1px]"
          style={{
            width: A4_WIDTH,
            height: A4_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            marginBottom: `${-(100 - zoom) * (A4_HEIGHT / 100)}px`,
          }}
        >
          {/* Center guides */}
          <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-primary/20 pointer-events-none" />
          <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-primary/20 pointer-events-none" />

          {sortedObjects.map((obj) => (
            <CanvasObjectRenderer
              key={obj.id}
              obj={obj}
              isSelected={obj.id === selectedObjectId}
              onMouseDown={(e) => handleObjectMouseDown(e, obj)}
              onResizeMouseDown={(e, handle) => handleResizeMouseDown(e, obj, handle)}
            />
          ))}
        </div>
      </div>

      {/* Zoom badge */}
      <div className="absolute bottom-3 left-3.5 bg-background border rounded px-2 py-0.5 text-[10.5px] text-muted-foreground font-mono">
        {zoom}%
      </div>
    </div>
  );
};

export default EditorCanvas;
