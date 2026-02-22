import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Search, CheckCircle2 } from "lucide-react";
import { useSupplies } from "@/hooks/useSupplies";
import { fieldsMatch } from "@/lib/wildcardMatch";

export interface PickedSupply {
  id: string;
  name: string;
  sell_price: number;
  category: string;
  description: string;
  type: "supply";
}

interface SupplyPickerPopoverProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (item: PickedSupply) => void;
  currentId?: string | null;
  /** If set, only show supplies of this category */
  categoryFilter?: string;
}

export const SupplyPickerPopover = ({
  open,
  onOpenChange,
  onPick,
  currentId,
  categoryFilter,
}: SupplyPickerPopoverProps) => {
  const [search, setSearch] = useState("");
  const { data: allSupplies, isLoading } = useSupplies();

  const supplies = useMemo(() => {
    const base = (allSupplies ?? []).filter(
      (s) => s.is_active && s.show_in_pricelist && s.sell_price > 0
    );
    const filtered = categoryFilter
      ? base.filter((s) => s.category.toLowerCase() === categoryFilter.toLowerCase())
      : base;
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter((s) => fieldsMatch(q, s.name, s.category, s.description));
  }, [allSupplies, search, categoryFilter]);

  const categories = useMemo(
    () => [...new Set(supplies.map((s) => s.category))].sort(),
    [supplies]
  );

  const handleClose = () => {
    setSearch("");
    onOpenChange(false);
  };

  const handlePick = (item: PickedSupply) => {
    onPick(item);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">
            Select Supply / Lab Item (Pricelist Enabled)
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplies…"
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-2 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : supplies.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No pricelist-enabled supplies found.
            </p>
          ) : (
            categories.map((cat) => (
              <div key={cat}>
                <p
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 mt-1"
                  style={{ color: "hsl(215 15% 55%)" }}
                >
                  {cat}
                </p>
                {supplies
                  .filter((s) => s.category === cat)
                  .map((s) => {
                    const isSelected = currentId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() =>
                          handlePick({
                            id: s.id,
                            name: s.name,
                            sell_price: s.sell_price,
                            category: s.category,
                            description: s.description,
                            type: "supply",
                          })
                        }
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <span
                            className="text-xs font-medium block truncate"
                            style={{ color: "hsl(215 65% 40%)" }}
                          >
                            {s.name}
                          </span>
                          {s.description && (
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {s.description}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 flex items-center gap-1.5">
                          <span className="text-xs font-semibold" style={{ color: "hsl(215 30% 20%)" }}>
                            ${s.sell_price.toFixed(2)}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "hsl(215 65% 50%)" }} />
                          )}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border shrink-0 bg-muted/30">
          <p className="text-[10px]" style={{ color: "hsl(215 15% 50%)" }}>
            {supplies.length} supply item{supplies.length !== 1 ? "s" : ""} with pricelist enabled & sell price
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
