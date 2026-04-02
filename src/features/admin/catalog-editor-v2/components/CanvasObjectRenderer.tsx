import { type MouseEvent as ReactMouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { CanvasObject } from "../types";

interface Props {
  obj: CanvasObject;
  isSelected: boolean;
  onMouseDown: (e: ReactMouseEvent) => void;
  onResizeMouseDown: (e: ReactMouseEvent, handle: string) => void;
}

const HANDLES = [
  { key: "tl", className: "top-[-5px] left-[-5px] cursor-nwse-resize" },
  { key: "tc", className: "top-[-5px] left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { key: "tr", className: "top-[-5px] right-[-5px] cursor-nesw-resize" },
  { key: "ml", className: "top-1/2 left-[-5px] -translate-y-1/2 cursor-ew-resize" },
  { key: "mr", className: "top-1/2 right-[-5px] -translate-y-1/2 cursor-ew-resize" },
  { key: "bl", className: "bottom-[-5px] left-[-5px] cursor-nesw-resize" },
  { key: "bc", className: "bottom-[-5px] left-1/2 -translate-x-1/2 cursor-ns-resize" },
  { key: "br", className: "bottom-[-5px] right-[-5px] cursor-nwse-resize" },
];

const CanvasObjectRenderer = ({ obj, isSelected, onMouseDown, onResizeMouseDown }: Props) => {
  if (!obj.is_visible) return null;

  const sectionType = typeof obj.content.section_type === "string" ? obj.content.section_type : "";
  const customTitle = typeof obj.content.custom_title === "string" ? obj.content.custom_title : "";
  const pricingLabel = sectionType === "stock_prices"
    ? "Stock Prices"
    : sectionType === "supplies_prices"
      ? "Supplies Prices"
      : "RX Prices";
  const articleLabel = sectionType
    ? sectionType.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Knowledge Article";

  const style: React.CSSProperties = {
    position: "absolute",
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height ?? "auto",
    transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
    cursor: obj.is_locked ? "default" : "move",
  };

  const renderContent = () => {
    switch (obj.object_type) {
      case "text":
        return (
          <div
            className="p-1 text-xs border border-dashed border-transparent hover:border-primary/30"
            style={{
              fontSize: (obj.style.fontSize as number) ?? 12,
              fontFamily: (obj.style.fontFamily as string) ?? "inherit",
              color: (obj.style.color as string) ?? "hsl(var(--foreground))",
            }}
          >
            {(obj.content.text as string) || "Text block"}
          </div>
        );

      case "image":
        return (
          <div className="w-full h-full bg-muted flex items-center justify-center rounded overflow-hidden">
            {(obj.content.src as string) ? (
              <img src={obj.content.src as string} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-muted-foreground text-[10px]">Image placeholder</span>
            )}
          </div>
        );

      case "shape_rect":
        return (
          <div
            className="w-full h-full"
            style={{
              background: (obj.style.fill as string) ?? "hsl(var(--accent) / 0.1)",
              border: `${(obj.style.strokeWidth as number) ?? 1.5}px solid ${(obj.style.stroke as string) ?? "hsl(var(--accent) / 0.3)"}`,
              borderRadius: (obj.style.borderRadius as number) ?? 4,
            }}
          />
        );

      case "shape_circle":
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              background: (obj.style.fill as string) ?? "hsl(var(--accent) / 0.1)",
              border: `${(obj.style.strokeWidth as number) ?? 1.5}px solid ${(obj.style.stroke as string) ?? "hsl(var(--accent) / 0.3)"}`,
            }}
          />
        );

      case "shape_line":
        return (
          <div
            className="w-full"
            style={{
              height: (obj.style.strokeWidth as number) ?? 1,
              background: (obj.style.stroke as string) ?? "hsl(var(--muted-foreground))",
            }}
          />
        );

      case "pricing_block":
        return (
          <div className="bg-background border rounded overflow-hidden">
            <div className="px-3 py-2">
              <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-primary/10 text-primary mb-1">
                {pricingLabel}
              </span>
              <div className="text-[10px] font-medium pb-1 border-b-[1.5px] border-primary mt-1">
                {customTitle || pricingLabel}
              </div>
              <div className="mt-1 text-[8.5px] text-muted-foreground">
                {(obj.content.pricelist_version_id as number | null) ? `Version #${obj.content.pricelist_version_id as number}` : "No pricelist assigned"}
              </div>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-muted text-[9px] font-medium p-1 text-left border text-muted-foreground">Lens description</th>
                  <th className="bg-muted text-[9px] font-medium p-1 text-left border text-muted-foreground">Material</th>
                  <th className="bg-muted text-[9px] font-medium p-1 text-right border text-muted-foreground">Price</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td className="text-[9px] p-1 border">Sample lens {i}</td>
                    <td className="text-[9px] p-1 border text-muted-foreground">CR-39</td>
                    <td className="text-[9px] p-1 border text-right font-mono text-primary">$18.00</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "article_block":
        return (
          <div className="bg-background border rounded p-2.5 overflow-hidden">
            <span className="inline-flex items-center h-4 px-1.5 rounded text-[9px] font-medium bg-green-500/10 text-green-700 mb-1">article</span>
            <div className="text-[10px] font-medium mb-1">{customTitle || articleLabel}</div>
            <div className="text-[8.5px] text-muted-foreground leading-relaxed">
              {sectionType === "knowledge_article"
                ? "Article content will render here from the linked knowledge base article."
                : `${articleLabel} will render here from the catalog section source.`}
            </div>
          </div>
        );

      case "table":
        return (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {Array.from({ length: Number(obj.content.cols ?? 3) }, (_, index) => `Column ${index + 1}`).map((h) => (
                  <th key={h} className="bg-muted text-[9px] font-medium p-1 text-left border text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Number(obj.content.rows ?? 4) }, (_, rowIndex) => rowIndex + 1).map((r) => (
                <tr key={r}>
                  {Array.from({ length: Number(obj.content.cols ?? 3) }, (_, colIndex) => colIndex + 1).map((c) => (
                    <td key={c} className={cn("text-[9px] p-1 border", r % 2 === 0 && "bg-muted/50")}>Cell {r},{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return <div className="w-full h-full bg-muted/30 rounded" />;
    }
  };

  return (
    <div
      data-canvas-object
      className={cn(
        "absolute",
        isSelected && "outline outline-[1.5px] outline-primary outline-offset-1 shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
      )}
      style={style}
      onMouseDown={onMouseDown}
    >
      {renderContent()}

      {/* Resize handles */}
      {isSelected && !obj.is_locked && HANDLES.map((h) => (
        <div
          key={h.key}
          className={cn("absolute w-2 h-2 bg-background border-[1.5px] border-primary rounded-[1.5px] z-10", h.className)}
          onMouseDown={(e) => onResizeMouseDown(e, h.key)}
        />
      ))}
    </div>
  );
};

export default CanvasObjectRenderer;
