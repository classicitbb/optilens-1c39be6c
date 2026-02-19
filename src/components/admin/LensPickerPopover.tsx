import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Search, CheckCircle2 } from "lucide-react";
import { useLenses } from "@/hooks/useLenses";
import { useAddons } from "@/hooks/useAddons";

export interface PickedLens {
  id: string;
  name: string;
  sell_price: number;
  type: "lens";
}

export interface PickedAddon {
  id: string;
  name: string;
  price: number;
  category: string;
  type: "addon";
}

export type PickedItem = PickedLens | PickedAddon;

interface LensPickerPopoverProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (item: PickedItem) => void;
  currentId?: string | null;
  /** If "lens-only", hides Add-Ons tab (for matrix cells). Default shows both. */
  mode?: "lens-only" | "all";
  /** Filter lenses by category (for context-aware picking) */
  categoryFilter?: string;
}

const TABS = ["Lenses", "Add-Ons"] as const;
type Tab = typeof TABS[number];

export const LensPickerPopover = ({
  open,
  onOpenChange,
  onPick,
  currentId,
  mode = "all",
  categoryFilter,
}: LensPickerPopoverProps) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("Lenses");

  const { data: allLenses, isLoading: lLoading } = useLenses();
  const { data: allAddons, isLoading: aLoading } = useAddons();

  // PL-enabled lenses with a sell_price > 0
  const lenses = useMemo(() => {
    const base = (allLenses ?? []).filter(
      (l) => l.show_in_pricelist && l.sell_price > 0 && l.is_active
    );
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((l) => l.name.toLowerCase().includes(q));
  }, [allLenses, search]);

  const addons = useMemo(() => {
    const base = (allAddons ?? []).filter((a) => a.is_active);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [allAddons, search]);

  const handleClose = () => {
    setSearch("");
    onOpenChange(false);
  };

  const handlePick = (item: PickedItem) => {
    onPick(item);
    handleClose();
  };

  const showTabs = mode === "all";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">
            {tab === "Lenses" ? "Select Lens (Pricelist Enabled)" : "Select Add-On"}
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
              placeholder="Search products…"
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* Tabs */}
        {showTabs && (
          <div className="flex border-b border-border shrink-0 px-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2 text-xs font-medium relative"
                style={{
                  color: tab === t ? "hsl(215 65% 45%)" : "hsl(215 15% 50%)",
                  fontWeight: tab === t ? 600 : 400,
                }}
              >
                {t}
                {tab === t && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded"
                    style={{ background: "hsl(215 65% 50%)" }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        <div className="overflow-y-auto flex-1 px-2 py-1">
          {(tab === "Lenses" || !showTabs) && (
            <>
              {lLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : lenses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No pricelist-enabled lenses found.
                </p>
              ) : (
                lenses.map((l) => {
                  const isSelected = currentId === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() =>
                        handlePick({ id: l.id, name: l.name, sell_price: l.sell_price, type: "lens" })
                      }
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-muted/60 transition-colors group"
                    >
                      <span
                        className="text-xs font-medium flex-1 min-w-0 truncate pr-2"
                        style={{ color: "hsl(215 65% 40%)" }}
                      >
                        {l.name}
                      </span>
                      <span className="shrink-0 flex items-center gap-1.5">
                        <span className="text-xs font-semibold" style={{ color: "hsl(215 30% 20%)" }}>
                          ${l.sell_price.toFixed(2)}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "hsl(215 65% 50%)" }} />
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </>
          )}

          {tab === "Add-Ons" && showTabs && (
            <>
              {aLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : addons.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No add-ons found.</p>
              ) : (
                (() => {
                  const cats = [...new Set(addons.map((a) => a.category))].sort();
                  return cats.map((cat) => (
                    <div key={cat}>
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 mt-1"
                        style={{ color: "hsl(215 15% 55%)" }}
                      >
                        {cat}
                      </p>
                      {addons
                        .filter((a) => a.category === cat)
                        .map((a) => {
                          const isSel = currentId === a.id;
                          return (
                            <button
                              key={a.id}
                              onClick={() =>
                                handlePick({
                                  id: a.id,
                                  name: a.name,
                                  price: a.price,
                                  category: a.category,
                                  type: "addon",
                                })
                              }
                              className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-left hover:bg-muted/60 transition-colors"
                            >
                              <span className="text-xs flex-1 truncate pr-2" style={{ color: "hsl(215 30% 20%)" }}>
                                {a.name}
                                {a.description ? (
                                  <span className="ml-1.5 text-muted-foreground text-[10px]">
                                    — {a.description}
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 flex items-center gap-1.5">
                                <span className="text-xs font-semibold" style={{ color: "hsl(215 30% 20%)" }}>
                                  ${a.price.toFixed(2)}
                                </span>
                                {isSel && (
                                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "hsl(215 65% 50%)" }} />
                                )}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  ));
                })()
              )}
            </>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border shrink-0 bg-muted/30">
          <p className="text-[10px]" style={{ color: "hsl(215 15% 50%)" }}>
            {tab === "Lenses"
              ? `${lenses.length} lens${lenses.length !== 1 ? "es" : ""} with pricelist enabled & BBD sell price`
              : `${addons.length} active add-on${addons.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
