import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search, CheckCircle2, RefreshCw, Pencil, Plus } from "lucide-react";
import { useLenses, Lens } from "@/hooks/useLenses";
import { useAddons } from "@/hooks/useAddons";
import LensFormDialog from "@/components/admin/LensFormDialog";
import { cn } from "@/lib/utils";

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
  mode?: "lens-only" | "all";
  categoryFilter?: string;
  hideFinished?: boolean;
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
  hideFinished = false,
}: LensPickerPopoverProps) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("Lenses");
  const [showAll, setShowAll] = useState(false);
  const [editLens, setEditLens] = useState<Lens | null>(null);
  const [addLensOpen, setAddLensOpen] = useState(false);

  const { data: allLenses, isLoading: lLoading, refetch, createMutation, updateMutation } = useLenses();
  const { data: allAddons, isLoading: aLoading } = useAddons();

  const lenses = useMemo(() => {
    let base = (allLenses ?? []).filter((l) => {
      if (hideFinished && l.finishtype?.name?.toLowerCase() === "finished") return false;
      if (!showAll) {
        return l.show_in_pricelist && l.sell_price > 0 && l.is_active;
      }
      return true;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((l) =>
        l.name.toLowerCase().includes(q) ||
        (l.supplier?.name ?? "").toLowerCase().includes(q) ||
        (l.supplier?.abbrev ?? "").toLowerCase().includes(q)
      );
    }
    return base;
  }, [allLenses, search, showAll, hideFinished]);

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
    <>
      <Dialog open={open && !editLens && !addLensOpen} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-sm font-semibold flex-1">
                {tab === "Lenses" ? "Select Lens" : "Select Add-On"}
              </DialogTitle>
              {tab === "Lenses" && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} title="Refresh lens list">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddLensOpen(true)} title="Add new lens to catalog">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Search */}
          <div className="px-4 py-3 border-b border-border shrink-0 space-y-2">
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
            {tab === "Lenses" && (
              <div className="flex items-center gap-2">
                <Switch checked={showAll} onCheckedChange={setShowAll} className="scale-75" />
                <span className="text-[10px] text-muted-foreground">Show all (incl. inactive &amp; out of range)</span>
              </div>
            )}
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
                    No lenses found.
                  </p>
                ) : (
                  lenses.map((l) => {
                    const isSelected = currentId === l.id;
                    const supplierLabel = l.supplier?.abbrev || l.supplier?.name || "";
                    const isInactive = !l.is_active;
                    return (
                      <button
                        key={l.id}
                        onClick={() =>
                          handlePick({ id: l.id, name: l.name, sell_price: l.sell_price, type: "lens" })
                        }
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-muted/60 transition-colors group",
                          isInactive && "opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {supplierLabel && (
                            <span
                              className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: "hsl(210 60% 93%)", color: "hsl(215 65% 28%)", minWidth: "36px", textAlign: "center" }}
                            >
                              {supplierLabel}
                            </span>
                          )}
                          {isInactive && (
                            <span className="shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-700">
                              Inactive
                            </span>
                          )}
                          <span
                            className="text-xs font-medium flex-1 min-w-0 truncate"
                            style={{ color: "hsl(215 65% 40%)" }}
                          >
                            {l.name}
                          </span>
                        </div>
                        <span className="shrink-0 flex items-center gap-1.5 ml-2">
                          <span className="text-xs font-semibold" style={{ color: "hsl(215 30% 20%)" }}>
                            ${l.sell_price.toFixed(2)}
                          </span>
                          {isInactive && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditLens(l); }}
                              className="p-0.5 hover:bg-muted rounded"
                              title="Edit lens for inclusion"
                            >
                              <Pencil className="h-3 w-3 text-amber-500" />
                            </button>
                          )}
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
                ? `${lenses.length} lens${lenses.length !== 1 ? "es" : ""} ${showAll ? "(all)" : "with pricelist enabled & BBD sell price"}`
                : `${addons.length} active add-on${addons.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lens Form Dialog for editing inactive or adding new lenses */}
      <LensFormDialog
        open={addLensOpen || !!editLens}
        onOpenChange={(v) => { if (!v) { setAddLensOpen(false); setEditLens(null); } }}
        lens={editLens}
        onSubmit={async (form) => {
          if (editLens) {
            await updateMutation.mutateAsync({ id: editLens.id, form });
          } else {
            await createMutation.mutateAsync(form);
          }
          setEditLens(null);
          setAddLensOpen(false);
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
};
