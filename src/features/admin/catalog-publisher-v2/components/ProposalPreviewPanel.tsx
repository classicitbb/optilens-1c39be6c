import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PackageLine, ProposalSection } from "../types";

interface Props {
  lines: PackageLine[];
  sections: ProposalSection[];
  total: number;
  onDropItem: (id: string) => void;
  onQtyChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

const ProposalPreviewPanel = ({ lines, sections, total, onDropItem, onQtyChange, onRemove }: Props) => {
  return (
    <section className="border rounded-md p-3 bg-white min-h-[70vh]">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDropItem(e.dataTransfer.getData("text/plain"));
        }}
        className="border-dashed border rounded p-3 mb-3 text-xs text-muted-foreground"
      >
        Drop products here to compose package
      </div>

      <h3 className="text-sm font-semibold mb-2">A4 Live Preview (Clinical Proposal)</h3>
      <div className="space-y-2 mb-3">
        {lines.map((line) => (
          <div key={line.item.id} className="flex items-center gap-2 text-xs border rounded p-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{line.item.name}</p>
              <p className="text-muted-foreground">{line.item.sku || "No SKU"}</p>
            </div>
            <Input
              type="number"
              min={1}
              value={line.qty}
              onChange={(e) => onQtyChange(line.item.id, Number(e.target.value))}
              className="w-16 h-8"
            />
            <span className="w-20 text-right">${((line.item.unit_price ?? 0) * line.qty).toFixed(2)}</span>
            <Button size="sm" variant="ghost" onClick={() => onRemove(line.item.id)}>Remove</Button>
          </div>
        ))}
      </div>

      <div className="rounded border p-2 mb-3 text-xs bg-muted/30">
        {sections.map((s) => (
          <p key={s.key} className="mb-1"><span className="font-semibold">{s.title}:</span> {s.body.slice(0, 120)}{s.body.length > 120 ? "…" : ""}</p>
        ))}
      </div>

      <div className="text-right text-sm font-semibold">Proposal total: ${total.toFixed(2)}</div>
    </section>
  );
};

export default ProposalPreviewPanel;
