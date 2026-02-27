import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PriceCatalogItem } from "../types";

interface Props {
  items: PriceCatalogItem[];
  search: string;
  onSearch: (value: string) => void;
  onAdd: (item: PriceCatalogItem) => void;
}

const PackageBuilderPanel = ({ items, search, onSearch, onAdd }: Props) => {
  return (
    <section className="border rounded-md p-3 space-y-3 bg-background">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Build Custom Package</h3>
        <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search price_catalog products" />
      </div>
      <div className="max-h-[58vh] overflow-auto space-y-2 pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
            className="rounded border p-2 flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{item.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{item.sku || "No SKU"} · {item.category || "General"}</p>
              <div className="flex gap-1 mt-1">
                {item.web_enabled ? <Badge variant="secondary" className="text-[10px]">Web</Badge> : null}
                {item.wspl_enabled ? <Badge variant="secondary" className="text-[10px]">WSPL</Badge> : null}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => onAdd(item)}>Add</Button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PackageBuilderPanel;
