import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CanvasObject, PropertyTab } from "../types";
import { Copy, Trash2, ArrowUp, ArrowDown, Lock, Eye } from "lucide-react";

interface Props {
  selectedObject: CanvasObject | null;
  activeTab: PropertyTab;
  onTabChange: (tab: PropertyTab) => void;
  onUpdate: (obj: Partial<CanvasObject> & { id: string }) => void;
  onDelete: (id: string) => void;
  onDuplicate: (obj: CanvasObject) => void;
}

const TABS: { key: PropertyTab; label: string }[] = [
  { key: "style", label: "Style" },
  { key: "content", label: "Content" },
  { key: "arrange", label: "Arrange" },
];

const PropertiesPanel = ({ selectedObject, activeTab, onTabChange, onUpdate, onDelete, onDuplicate }: Props) => {
  if (!selectedObject) {
    return (
      <div className="w-[256px] border-l bg-background flex flex-col shrink-0">
        <div className="h-[46px] border-b flex items-center px-3.5 gap-1.5 shrink-0">
          <span className="text-xs font-medium">No selection</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">Click an object on the canvas to edit its properties.</p>
        </div>
      </div>
    );
  }

  const obj = selectedObject;

  const chipLabel = (() => {
    switch (obj.object_type) {
      case "pricing_block": return "pricing";
      case "article_block": return "article";
      case "text": return "text";
      case "image": return "image";
      case "table": return "table";
      default: return obj.object_type.replace("shape_", "");
    }
  })();

  const chipClass = (() => {
    if (obj.object_type === "pricing_block") return "bg-primary/10 text-primary";
    if (obj.object_type === "article_block") return "bg-green-500/10 text-green-700";
    return "bg-muted text-muted-foreground";
  })();

  return (
    <div className="w-[256px] border-l bg-background flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="h-[46px] border-b flex items-center px-3.5 gap-1.5 shrink-0">
        <span className="text-xs font-medium">{obj.label || chipLabel}</span>
        <span className={cn("h-[18px] px-1.5 rounded text-[10px] font-medium inline-flex items-center", chipClass)}>{chipLabel}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={cn(
              "flex-1 h-[34px] text-[11.5px] border-b-2 transition-colors",
              activeTab === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            )}
            onClick={() => onTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "style" && (
          <>
            {/* Position & Size */}
            <div className="p-3.5 border-b">
              <div className="text-[9.5px] font-medium tracking-wider uppercase text-muted-foreground mb-2">Position &amp; size</div>
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">X</span>
                  <Input className="h-7 text-xs font-mono" value={obj.x} onChange={(e) => onUpdate({ id: obj.id, x: Number(e.target.value) || 0 })} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Y</span>
                  <Input className="h-7 text-xs font-mono" value={obj.y} onChange={(e) => onUpdate({ id: obj.id, y: Number(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">W</span>
                  <Input className="h-7 text-xs font-mono" value={obj.width} onChange={(e) => onUpdate({ id: obj.id, width: Number(e.target.value) || 20 })} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">H</span>
                  <Input className="h-7 text-xs font-mono" value={obj.height ?? "auto"} onChange={(e) => {
                    const v = e.target.value;
                    onUpdate({ id: obj.id, height: v === "auto" ? null : Number(v) || 20 });
                  }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Rotation</span>
                  <Input className="h-7 text-xs font-mono" value={`${obj.rotation}°`} onChange={(e) => onUpdate({ id: obj.id, rotation: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </div>

            {/* Typography (for text-based objects) */}
            {["text", "pricing_block", "article_block", "table"].includes(obj.object_type) && (
              <div className="p-3.5 border-b">
                <div className="text-[9.5px] font-medium tracking-wider uppercase text-muted-foreground mb-2">Typography</div>
                <div className="space-y-1.5">
                  <Select value={(obj.style.fontFamily as string) ?? "Geist"} onValueChange={(v) => onUpdate({ id: obj.id, style: { ...obj.style, fontFamily: v } })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Geist">Geist</SelectItem>
                      <SelectItem value="DM Sans">DM Sans</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground">Size</span>
                      <Input className="h-7 text-xs font-mono" value={`${(obj.style.fontSize as number) ?? 12}px`} onChange={(e) => onUpdate({ id: obj.id, style: { ...obj.style, fontSize: parseFloat(e.target.value) || 12 } })} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground">Line height</span>
                      <Input className="h-7 text-xs font-mono" value={(obj.style.lineHeight as number) ?? 1.55} onChange={(e) => onUpdate({ id: obj.id, style: { ...obj.style, lineHeight: parseFloat(e.target.value) || 1.55 } })} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance */}
            <div className="p-3.5 border-b">
              <div className="text-[9.5px] font-medium tracking-wider uppercase text-muted-foreground mb-2">Appearance</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-10 shrink-0">Fill</span>
                  <div className="w-6 h-6 rounded border shrink-0" style={{ background: (obj.style.fill as string) ?? "transparent" }} />
                  <Input className="h-6 text-[10.5px] font-mono flex-1" value={(obj.style.fill as string) ?? ""} onChange={(e) => onUpdate({ id: obj.id, style: { ...obj.style, fill: e.target.value } })} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-10 shrink-0">Stroke</span>
                  <div className="w-6 h-6 rounded border shrink-0" style={{ background: (obj.style.stroke as string) ?? "transparent" }} />
                  <Input className="h-6 text-[10.5px] font-mono flex-1" value={(obj.style.stroke as string) ?? ""} onChange={(e) => onUpdate({ id: obj.id, style: { ...obj.style, stroke: e.target.value } })} />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "content" && (
          <div className="p-3.5 border-b">
            <div className="text-[9.5px] font-medium tracking-wider uppercase text-muted-foreground mb-2">
              {obj.object_type === "pricing_block" ? "Pricing source" : obj.object_type === "article_block" ? "Article source" : "Content"}
            </div>
            {obj.object_type === "pricing_block" && (
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Section type</span>
                  <Select value={(obj.content.section_type as string) ?? "rx_prices"} onValueChange={(v) => onUpdate({ id: obj.id, content: { ...obj.content, section_type: v } })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rx_prices">Rx Prices</SelectItem>
                      <SelectItem value="stock_prices">Stock Prices</SelectItem>
                      <SelectItem value="supplies_prices">Supplies Prices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Display format</span>
                  <div className="flex border rounded overflow-hidden">
                    <button className={cn("flex-1 h-7 text-[11px]", (obj.content.format as string) !== "matrix" ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={() => onUpdate({ id: obj.id, content: { ...obj.content, format: "list" } })}>List</button>
                    <button className={cn("flex-1 h-7 text-[11px]", (obj.content.format as string) === "matrix" ? "bg-primary/10 text-primary" : "text-muted-foreground")} onClick={() => onUpdate({ id: obj.id, content: { ...obj.content, format: "matrix" } })}>Matrix</button>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Custom title</span>
                  <Input className="h-7 text-xs" placeholder="Leave blank for default" value={(obj.content.custom_title as string) ?? ""} onChange={(e) => onUpdate({ id: obj.id, content: { ...obj.content, custom_title: e.target.value } })} />
                </div>
              </div>
            )}
            {obj.object_type === "text" && (
              <textarea
                className="w-full min-h-[120px] text-xs border rounded p-2 bg-muted/50 resize-y"
                value={(obj.content.text as string) ?? ""}
                onChange={(e) => onUpdate({ id: obj.id, content: { ...obj.content, text: e.target.value } })}
              />
            )}
          </div>
        )}

        {activeTab === "arrange" && (
          <>
            <div className="p-3.5 border-b">
              <div className="text-[9.5px] font-medium tracking-wider uppercase text-muted-foreground mb-2">Layer order</div>
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="outline" size="sm" className="h-[26px] text-[11px]" onClick={() => onUpdate({ id: obj.id, z_index: obj.z_index + 10 })}>
                  <ArrowUp className="h-3 w-3 mr-1" />Bring front
                </Button>
                <Button variant="outline" size="sm" className="h-[26px] text-[11px]" onClick={() => onUpdate({ id: obj.id, z_index: Math.max(0, obj.z_index - 10) })}>
                  <ArrowDown className="h-3 w-3 mr-1" />Send back
                </Button>
              </div>
            </div>
            <div className="p-3.5 border-b">
              <div className="text-[9.5px] font-medium tracking-wider uppercase text-muted-foreground mb-2">Object</div>
              <div className="space-y-1.5">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground">Name / label</span>
                  <Input className="h-7 text-xs" value={obj.label ?? ""} onChange={(e) => onUpdate({ id: obj.id, label: e.target.value || null })} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-muted-foreground">Locked</span>
                  <button className={cn("w-[30px] h-[17px] rounded-full relative transition-colors", obj.is_locked ? "bg-primary" : "bg-muted border")} onClick={() => onUpdate({ id: obj.id, is_locked: !obj.is_locked })}>
                    <div className={cn("w-[11px] h-[11px] rounded-full absolute top-[2px] transition-all", obj.is_locked ? "left-[15px] bg-primary-foreground" : "left-[2px] bg-muted-foreground")} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] text-muted-foreground">Visible in export</span>
                  <button className={cn("w-[30px] h-[17px] rounded-full relative transition-colors", obj.is_visible ? "bg-primary" : "bg-muted border")} onClick={() => onUpdate({ id: obj.id, is_visible: !obj.is_visible })}>
                    <div className={cn("w-[11px] h-[11px] rounded-full absolute top-[2px] transition-all", obj.is_visible ? "left-[15px] bg-primary-foreground" : "left-[2px] bg-muted-foreground")} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-[9.5px] font-medium tracking-wider uppercase text-muted-foreground mb-2">Actions</div>
              <div className="flex gap-1.5 mb-1.5">
                <Button variant="outline" size="sm" className="flex-1 h-[26px] text-[11px] gap-1" onClick={() => onDuplicate(obj)}>
                  <Copy className="h-3 w-3" />Duplicate
                </Button>
              </div>
              <Button variant="outline" size="sm" className="w-full h-[26px] text-[11px] gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => onDelete(obj.id)}>
                <Trash2 className="h-3 w-3" />Remove object
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;
