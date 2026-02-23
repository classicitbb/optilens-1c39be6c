import { useState, useMemo, useCallback } from "react";
import {
  useMatrixAllocations,
  MATERIAL_COLUMNS,
  TREATMENT_TYPES,
  TreatmentType,
  MatrixAllocation } from
"@/hooks/useMatrixAllocations";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import { usePricelistCatalogRowUpsert } from "@/hooks/usePricelistCatalogRowUpsert";
import { useLenses, Lens } from "@/hooks/useLenses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  CheckCircle,
  Save,
  Pencil,
  Plus } from
"lucide-react";
import { cn } from "@/lib/utils";
import { fieldsMatch } from "@/lib/wildcardMatch";
import { useMaterialUpgrades } from "@/hooks/useMaterialUpgrades";
import { usePricelistVersions } from "@/hooks/usePricelistVersions";
import LensFormDialog from "@/components/admin/LensFormDialog";
import { Switch } from "@/components/ui/switch";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TreatmentMatricesAccordionProps {
  versionId: number;
  showUSD: boolean;
  fxRate: number;
  /** Called whenever matrix changes create pending List Catalog rows */
  onPendingChange?: (pendingKeys: Set<string>) => void;
}

const TREATMENT_LABELS: Record<TreatmentType, string> = {
  clear: "Clear Lenses",
  transitions: "Transitions",
  photochromic: "Photochromic",
  polarized: "Polarized",
  bluefilter: "Bluefilter"
};

const fmt = (val: number | null, showUSD: boolean, fxRate: number): string => {
  if (val === null || val === undefined) return "";
  const v = showUSD ? val * fxRate : val;
  return v === 0 ? "" : v.toFixed(2);
};

/** Build the row_key used in pricelist_catalog_rows from matrix coords */
const buildRowKey = (
treatment: TreatmentType,
category: string,
material: string) =>
`matrix::${treatment}::${category}::${material}`;

/** Build human-readable Matrix Cell label */
const buildMatrixCellLabel = (
treatmentLabel: string,
category: string,
material: string) =>
`${treatmentLabel} – ${category} ${material}`;

// ─── Lens Picker Modal ────────────────────────────────────────────────────────
interface LensPickerModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (lensId: string, lensName: string, sellPrice: number) => void;
  onClear?: () => void;
  currentLensId: string | null;
  categoryFilter?: string;
  materialFilter?: string;
  catalogLensIds: Set<string>;
}

const LensPickerModal = ({
  open,
  onClose,
  onPick,
  onClear,
  currentLensId,
  categoryFilter,
  materialFilter,
  catalogLensIds
}: LensPickerModalProps) => {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [editLens, setEditLens] = useState<Lens | null>(null);
  const [addLensOpen, setAddLensOpen] = useState(false);
  const { data: allLenses, isLoading, refetch, createMutation, updateMutation } = useLenses();

  const lenses = useMemo(() => {
    let base = (allLenses ?? []).filter((l) => {
      if (l.finishtype?.name?.toLowerCase() === "finished") return false;
      if (!showAll) {
        return l.show_in_pricelist && l.sell_price > 0 && l.is_active && l.base_price > 0;
      }
      return true;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((l) => fieldsMatch(q, l.name, l.supplier?.name, l.supplier?.abbrev));
    }
    return base;
  }, [allLenses, search, showAll]);

  return (
    <>
      <Dialog open={open && !editLens && !addLensOpen} onOpenChange={(v) => {if (!v) {setSearch("");onClose();}}}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-sm font-semibold text-foreground">
                Select Lens
                {categoryFilter &&
                <span className="ml-2 font-normal text-muted-foreground">
                    — {categoryFilter} / {materialFilter}
                  </span>
                }
              </DialogTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} title="Refresh lens list">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddLensOpen(true)} title="Add new lens to catalog">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="px-4 py-3 border-b border-border shrink-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lenses…"
                className="pl-8 h-8 text-xs" />

            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showAll} onCheckedChange={setShowAll} className="scale-75" />
              <span className="text-[10px] text-muted-foreground">Show all (incl. inactive &amp; out of range)</span>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-2 py-1">
            {isLoading ?
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div> :
            lenses.length === 0 ?
            <p className="text-xs text-muted-foreground text-center py-8">
                No lenses found.
              </p> :

            lenses.map((l) => {
              const isSelected = currentLensId === l.id;
              const inCatalog = catalogLensIds.has(l.id);
              const isInactive = !l.is_active;
              return (
                <button
                  key={l.id}
                  onClick={() => {
                    if (l.sell_price <= 0) return; // Block zero-price lenses from being picked
                    onPick(l.id, l.name, l.sell_price);
                    setSearch("");
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-muted/60 transition-colors group",
                    isInactive && "opacity-60",
                    l.sell_price <= 0 && "opacity-60 cursor-not-allowed"
                  )}>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {(l.supplier?.abbrev || l.supplier?.name) &&
                    <span
                      className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: "hsl(210 60% 93%)", color: "hsl(215 65% 28%)", minWidth: "36px", textAlign: "center" }}>

                          {l.supplier?.abbrev || l.supplier?.name}
                        </span>
                    }
                      {isInactive &&
                    <span className="shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-700">
                          Inactive
                        </span>
                    }
                      {l.sell_price <= 0 && !isInactive &&
                    <span className="shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded bg-red-100 text-red-700">
                          $0
                        </span>
                    }
                      <span className="text-xs font-medium flex-1 min-w-0 truncate text-primary">
                        {l.name}
                      </span>
                    </div>
                    <span className="shrink-0 flex items-center gap-2 ml-2">
                      {inCatalog &&
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          In List
                        </span>
                    }
                      <button
                      onClick={(e) => {e.stopPropagation();setEditLens(l);}}
                      className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit lens">

                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <span className="text-xs font-semibold text-foreground">
                        ${l.sell_price.toFixed(2)}
                      </span>
                      {isSelected &&
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    }
                    </span>
                  </button>);

            })
            }
          </div>

          <div className="px-4 py-2 border-t border-border shrink-0 bg-muted/30 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {lenses.length} lens{lenses.length !== 1 ? "es" : ""} {showAll ? "(all)" : "with cost & price assigned"}
            </p>
            {currentLensId && onClear &&
            <button
              className="text-[10px] text-destructive hover:underline"
              onClick={() => {onClear();onClose();}}>

                Clear cell
              </button>
            }
          </div>
        </DialogContent>
      </Dialog>

      <LensFormDialog
        open={addLensOpen || !!editLens}
        onOpenChange={(v) => {if (!v) {setAddLensOpen(false);setEditLens(null);}}}
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
        isPending={createMutation.isPending || updateMutation.isPending} />

    </>);

};

// ─── Single Treatment Grid ────────────────────────────────────────────────────
interface TreatmentGridProps {
  treatmentType: TreatmentType;
  label: string;
  onLabelChange?: (v: string) => void;
  categories: string[];
  allocations: MatrixAllocation[];
  clearAllocations: MatrixAllocation[];
  catalogLensIds: Set<string>;
  pendingRowKeys: Set<string>;
  lensNameMap: Map<string, string>;
  showUSD: boolean;
  fxRate: number;
  onCellPick: (category: string, materialIndex: string, treatmentType: TreatmentType) => void;
  isSaving: boolean;
}

const TreatmentGrid = ({
  treatmentType,
  label,
  onLabelChange,
  categories,
  allocations,
  clearAllocations,
  catalogLensIds,
  pendingRowKeys,
  lensNameMap,
  showUSD,
  fxRate,
  onCellPick,
  isSaving
}: TreatmentGridProps) => {
  const [editingLabel, setEditingLabel] = useState(false);

  const getAllocation = useCallback(
    (category: string, materialIndex: string): MatrixAllocation | undefined =>
    allocations.find(
      (a) =>
      a.category === category &&
      a.material_index === materialIndex &&
      a.treatment_type === treatmentType
    ),
    [allocations, treatmentType]
  );

  const getClearPrice = useCallback(
    (materialIndex: string): number | null => {
      const vals = clearAllocations.
      filter((a) => a.material_index === materialIndex && a.treatment_type === "clear" && a.allocated_price_bbd !== null).
      map((a) => a.allocated_price_bbd as number);
      if (vals.length === 0) return null;
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    },
    [clearAllocations]
  );

  const getColAvg = useCallback(
    (materialIndex: string): number | null => {
      const vals = categories.
      map((cat) => getAllocation(cat, materialIndex)?.allocated_price_bbd ?? null).
      filter((v): v is number => v !== null);
      if (vals.length === 0) return null;
      return vals.reduce((s, v) => s + v, 0) / vals.length;
    },
    [categories, getAllocation]
  );

  return (
    <div className="overflow-auto border border-border rounded-md">
      <table className="w-full text-xs border-collapse bg-background">
        <thead>
          <tr className="bg-muted/60 border-b border-border">
            <th className="px-3 py-2 text-left font-bold border-r border-border min-w-[200px] text-foreground">
              {onLabelChange ?
              editingLabel ?
              <Input
                autoFocus
                value={label}
                onChange={(e) => onLabelChange(e.target.value)}
                onBlur={() => setEditingLabel(false)}
                onKeyDown={(e) => {if (e.key === "Enter") setEditingLabel(false);}}
                className="h-6 text-xs font-bold px-1 w-full" /> :


              <span className="cursor-pointer hover:underline" title="Click to edit heading" onClick={() => setEditingLabel(true)}>
                    {label}
                  </span> :


              <span>{label}</span>
              }
            </th>
            {MATERIAL_COLUMNS.map((col) =>
            <th key={col.key} className="px-3 py-2 text-center font-bold border-r border-border last:border-r-0 min-w-[120px] text-foreground">
                {col.key}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, rowIdx) =>
          <tr
            key={cat}
            className={cn(
              "border-b border-border last:border-b-0 transition-colors",
              rowIdx % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30"
            )}>

              <td className="px-3 py-1.5 font-semibold border-r border-border whitespace-nowrap text-foreground">
                {cat}
              </td>
              {MATERIAL_COLUMNS.map((col) => {
              const alloc = getAllocation(cat, col.key);
              const inCatalog = alloc?.lens_id ? catalogLensIds.has(alloc.lens_id) : false;
              const rk = buildRowKey(treatmentType, cat, col.key);
              const isPending = pendingRowKeys.has(rk);

              return (
                <td key={col.key} className="border-r border-border last:border-r-0 p-0">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <div className="flex-1 px-2 py-1.5 text-right font-mono text-xs text-foreground min-w-0">
                          {alloc?.allocated_price_bbd != null ?
                        <span className="font-semibold">{fmt(alloc.allocated_price_bbd, showUSD, fxRate)}</span> :

                        <span className="text-muted-foreground/40">—</span>
                        }
                        </div>
                        {isPending &&
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-0.5 shrink-0" title="Pending sync to Price List" />
                      }
                        {inCatalog && !isPending &&
                      <CheckCircle className="h-3 w-3 shrink-0 text-emerald-500 mr-0.5" />
                      }
                        <button
                        onClick={() => onCellPick(cat, col.key, treatmentType)}
                        className={cn(
                          "shrink-0 px-1 py-1 hover:bg-primary/10 rounded transition-colors",
                          alloc ? "text-primary" : "text-muted-foreground"
                        )}
                        title="Link a lens to this cell"
                        disabled={isSaving}>

                          <Search className="h-3 w-3" />
                        </button>
                      </div>
                      {alloc?.lens_id &&
                    <div className="px-2 pb-0.5 text-[9px] truncate max-w-full text-primary/70" title={lensNameMap.get(alloc.lens_id) ?? alloc.lens_id}>
                          ↳ {lensNameMap.get(alloc.lens_id) ?? alloc.lens_id.slice(0, 8) + "…"}
                        </div>
                    }
                    </div>
                  </td>);

            })}
            </tr>
          )}

          {/* Column Averages row */}
          <tr className="bg-muted/40 border-t-2 border-border font-semibold">
            <td className="px-3 py-1.5 text-xs border-r border-border text-muted-foreground italic">Col. Averages</td>
            {MATERIAL_COLUMNS.map((col) => {
              const avg = getColAvg(col.key);
              return (
                <td key={col.key} className="px-3 py-1.5 text-right text-xs border-r border-border last:border-r-0 text-foreground">
                  {avg !== null ? fmt(avg, showUSD, fxRate) : "—"}
                </td>);

            })}
          </tr>

          {/* Delta vs Clear row */}
          {treatmentType !== "clear" &&
          <tr className="bg-amber-50/60 dark:bg-amber-900/10 border-t border-border">
              <td className="px-3 py-1.5 text-xs border-r border-border text-amber-700 dark:text-amber-400 italic">Δ vs Clear</td>
              {MATERIAL_COLUMNS.map((col) => {
              const treatAvg = getColAvg(col.key);
              const clearAvg = getClearPrice(col.key);
              const delta = treatAvg !== null && clearAvg !== null ? treatAvg - clearAvg : null;
              return (
                <td key={col.key} className="px-3 py-1.5 text-right text-xs border-r border-border last:border-r-0">
                    {delta !== null ?
                  <span className={cn("font-semibold", delta > 0 ? "text-emerald-600 dark:text-emerald-400" : delta < 0 ? "text-red-500" : "text-muted-foreground")}>
                        {delta > 0 ? "+" : ""}{fmt(delta, showUSD, fxRate)}
                      </span> :

                  <span className="text-muted-foreground/40">—</span>
                  }
                  </td>);

            })}
            </tr>
          }
        </tbody>
      </table>
    </div>);

};

// ─── Clear Lenses Grid ────────────────────────────────────────────────────────
interface ClearTreatmentGridProps {
  categories: string[];
  allocations: MatrixAllocation[];
  catalogLensIds: Set<string>;
  pendingRowKeys: Set<string>;
  lensNameMap: Map<string, string>;
  showUSD: boolean;
  fxRate: number;
  onCellPick: (category: string, materialIndex: string, treatmentType: TreatmentType) => void;
  isSaving: boolean;
}

const ClearTreatmentGrid = ({
  categories,
  allocations,
  catalogLensIds,
  pendingRowKeys,
  lensNameMap,
  showUSD,
  fxRate,
  onCellPick,
  isSaving
}: ClearTreatmentGridProps) => {
  const getAllocation = (category: string, materialIndex: string) =>
  allocations.find((a) => a.category === category && a.material_index === materialIndex && a.treatment_type === "clear");

  const getColAvg = (materialIndex: string): number | null => {
    const vals = categories.map((cat) => getAllocation(cat, materialIndex)?.allocated_price_bbd ?? null).filter((v): v is number => v !== null);
    if (vals.length === 0) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };

  return (
    <div className="overflow-auto border border-border rounded-md">
      <table className="w-full text-xs border-collapse bg-background">
        <thead>
          <tr className="bg-muted/60 border-b border-border">
            <th className="px-3 py-2 text-left font-bold border-r border-border min-w-[200px] text-foreground">Category</th>
            {MATERIAL_COLUMNS.map((col) =>
            <th key={col.key} className="px-3 py-2 text-center font-bold border-r border-border last:border-r-0 min-w-[120px] text-foreground">{col.key}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, rowIdx) =>
          <tr key={cat} className={cn("border-b border-border last:border-b-0 transition-colors", rowIdx % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30")}>
              <td className="px-3 py-1.5 font-semibold border-r border-border whitespace-nowrap text-foreground">{cat}</td>
              {MATERIAL_COLUMNS.map((col) => {
              const alloc = getAllocation(cat, col.key);
              const inCatalog = alloc?.lens_id ? catalogLensIds.has(alloc.lens_id) : false;
              const lensName = alloc?.lens_id ? lensNameMap.get(alloc.lens_id) : undefined;
              const rk = buildRowKey("clear", cat, col.key);
              const isPending = pendingRowKeys.has(rk);

              return (
                <td key={col.key} className="border-r border-border last:border-r-0 p-0">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <div className="flex-1 px-2 py-1.5 text-right font-mono text-xs text-foreground min-w-0">
                          {alloc?.allocated_price_bbd != null ?
                        <span className="font-semibold">{fmt(alloc.allocated_price_bbd, showUSD, fxRate)}</span> :

                        <span className="text-muted-foreground/40">—</span>
                        }
                        </div>
                        {isPending &&
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-0.5 shrink-0" title="Pending sync to Price List" />
                      }
                        {inCatalog && !isPending &&
                      <CheckCircle className="h-3 w-3 shrink-0 text-emerald-500 mr-0.5" />
                      }
                        <button
                        onClick={() => onCellPick(cat, col.key, "clear")}
                        className="shrink-0 px-1 py-1 hover:bg-primary/10 rounded transition-colors"
                        title="Link a lens to this cell"
                        disabled={isSaving}>

                          <Search className="h-3 w-3" style={{ color: alloc ? "hsl(215 65% 50%)" : "hsl(215 15% 65%)" }} />
                        </button>
                      </div>
                      {lensName &&
                    <div className="px-2 pb-0.5 text-[9px] truncate max-w-full text-primary/70" title={lensName}>
                          ↳ {lensName}
                        </div>
                    }
                    </div>
                  </td>);

            })}
            </tr>
          )}
          <tr className="bg-muted/40 border-t-2 border-border font-semibold">
            <td className="px-3 py-1.5 text-xs border-r border-border text-muted-foreground italic">Col. Averages</td>
            {MATERIAL_COLUMNS.map((col) => {
              const avg = getColAvg(col.key);
              return (
                <td key={col.key} className="px-3 py-1.5 text-right text-xs border-r border-border last:border-r-0 text-foreground">
                  {avg !== null ? fmt(avg, showUSD, fxRate) : "—"}
                </td>);

            })}
          </tr>
        </tbody>
      </table>
    </div>);

};

// ─── Main Accordion ───────────────────────────────────────────────────────────
const TreatmentMatricesAccordion = ({
  versionId,
  showUSD,
  fxRate,
  onPendingChange
}: TreatmentMatricesAccordionProps) => {
  const { toast } = useToast();

  const { data: matrixRows, isLoading: matrixLoading } = usePriceMatrix();
  const {
    data: allocations = [],
    isLoading: allocLoading,
    upsertMutation,
    deleteMutation
  } = useMatrixAllocations(versionId);
  const { data: catalogRows } = usePricelistCatalogRows(versionId, "rx");
  const { upsertRow: upsertCatalogRow, deleteRow: deleteCatalogRow } = usePricelistCatalogRowUpsert(versionId, "rx");
  const { data: allLenses } = useLenses();

  // Track locally which row_keys are pending sync to List Catalog
  const [pendingRowKeys, setPendingRowKeys] = useState<Set<string>>(new Set());

  const catalogLensIds = useMemo(
    () => new Set((catalogRows ?? []).filter((r) => r.item_id).map((r) => r.item_id as string)),
    [catalogRows]
  );

  // row_key → catalog row map for quick lookup
  const catalogRowKeyMap = useMemo(
    () => new Map((catalogRows ?? []).map((r) => [r.row_key, r])),
    [catalogRows]
  );

  const lensNameMap = useMemo(
    () => new Map((allLenses ?? []).map((l) => [l.id, l.name])),
    [allLenses]
  );

  const categories = useMemo(
    () => (matrixRows ?? []).map((r) => r.category),
    [matrixRows]
  );

  const [treatmentLabels, setTreatmentLabels] = useState<Record<TreatmentType, string>>({ ...TREATMENT_LABELS });

  const [expanded, setExpanded] = useState<Set<TreatmentType>>(new Set(["clear" as TreatmentType]));

  const toggleExpanded = (t: TreatmentType | "clear") => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);else
      next.add(t);
      return next;
    });
  };

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    category: string;
    materialIndex: string;
    treatmentType: TreatmentType;
  } | null>(null);

  // Clear confirmation dialog
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<typeof pickerTarget>(null);

  const currentCellLensId = useMemo(() => {
    if (!pickerTarget) return null;
    return (
      allocations.find(
        (a) => a.category === pickerTarget.category && a.material_index === pickerTarget.materialIndex && a.treatment_type === pickerTarget.treatmentType
      )?.lens_id ?? null);

  }, [pickerTarget, allocations]);

  const markPending = (rowKey: string) => {
    setPendingRowKeys((prev) => {
      const next = new Set(prev);
      next.add(rowKey);
      onPendingChange?.(next);
      return next;
    });
  };

  const unmarkPending = (rowKey: string) => {
    setPendingRowKeys((prev) => {
      const next = new Set(prev);
      next.delete(rowKey);
      onPendingChange?.(next);
      return next;
    });
  };

  const handleCellPick = (category: string, materialIndex: string, treatmentType: TreatmentType) => {
    setPickerTarget({ category, materialIndex, treatmentType });
    setPickerOpen(true);
  };

  /** Sync a picked lens to pricelist_catalog_rows using direct upsert (no bulk delete) */
  const syncToCatalog = async (
  treatment: TreatmentType,
  category: string,
  material: string,
  lensId: string,
  lensName: string,
  sellPrice: number) =>
  {
    const rowKey = buildRowKey(treatment, category, material);
    const treatLabel = treatmentLabels[treatment];
    const section = `${treatLabel} — ${category}`;
    const existingCount = (catalogRows ?? []).filter((r) => r.row_type === "lens").length;

    markPending(rowKey);
    try {
      await upsertCatalogRow.mutateAsync({
        row_key: rowKey,
        row_type: "lens",
        section,
        display_description: lensName,
        bbd_price: sellPrice,
        item_id: lensId,
        sort_order: existingCount
      });
      unmarkPending(rowKey);
    } catch {



      // keep pending — user must manually save
    }};const handlePick = async (lensId: string, lensName: string, sellPrice: number) => {
    if (!pickerTarget) return;
    try {
      await upsertMutation.mutateAsync({
        category: pickerTarget.category,
        material_index: pickerTarget.materialIndex,
        treatment_type: pickerTarget.treatmentType,
        lens_id: lensId,
        allocated_price_bbd: sellPrice
      });

      // Auto-sync to List Catalog
      await syncToCatalog(
        pickerTarget.treatmentType,
        pickerTarget.category,
        pickerTarget.materialIndex,
        lensId,
        lensName,
        sellPrice
      );

      toast({
        title: "Cell updated & synced to Price List",
        description: `${lensName} → $${sellPrice.toFixed(2)} BBD`
      });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleClearRequest = () => {
    if (!pickerTarget) return;
    const alloc = allocations.find(
      (a) => a.category === pickerTarget.category && a.material_index === pickerTarget.materialIndex && a.treatment_type === pickerTarget.treatmentType
    );
    if (!alloc) return;
    setClearTarget(pickerTarget);
    setPickerOpen(false);
    setClearConfirmOpen(true);
  };

  const handleClearConfirm = async () => {
    if (!clearTarget) return;
    const alloc = allocations.find(
      (a) => a.category === clearTarget.category && a.material_index === clearTarget.materialIndex && a.treatment_type === clearTarget.treatmentType
    );
    if (!alloc) {setClearConfirmOpen(false);return;}

    try {
      await deleteMutation.mutateAsync(alloc.id);

      // Also delete the matching catalog row directly
      const rowKey = buildRowKey(clearTarget.treatmentType, clearTarget.category, clearTarget.materialIndex);
      await deleteCatalogRow.mutateAsync(rowKey);

      toast({ title: "Cell cleared", description: "Removed from Matrix and Price List." });
    } catch (e: any) {
      toast({ title: "Clear failed", description: e.message, variant: "destructive" });
    }
    setClearConfirmOpen(false);
  };

  const handleRecalculate = () => {
    toast({ title: "Deltas recalculated", description: "All delta rows updated." });
  };

  if (matrixLoading || allocLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>);

  }

  const clearAllocations = allocations.filter((a) => a.treatment_type === "clear");
  const collapsibleTreatments: TreatmentType[] = ["transitions", "photochromic", "polarized", "bluefilter"];

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Price Matrix{" "}
            <span className="font-normal text-muted-foreground text-xs">
              — Shared Editor for Matrix &amp; List Formats
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click <Search className="inline h-3 w-3" /> to link a lens. Green{" "}
            <CheckCircle className="inline h-3 w-3 text-emerald-500" /> = in Price List.{" "}
            Red dot = pending sync. Lens selection auto-creates Price List row.
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleRecalculate}>
          <RefreshCw className="h-3 w-3" />
          Recalculate All Deltas
        </Button>
      </div>

      {/* Currency badge */}
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
        Displaying: {showUSD ? "USD" : "BBD"}
      </div>

      {/* ── CLEAR LENSES ─────────────────────────────────────────────────────── */}
      <div className="border rounded-lg overflow-hidden border-[#1e4cb8]">
        <button
          className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-border transition-colors text-left bg-[#1e4cb8]"
          onClick={() => toggleExpanded("clear" as any)}>

          {expanded.has("clear" as any) ?
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> :

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          }
          <span className="text-sm font-bold text-primary-foreground">Clear Lenses</span>
        </button>
        {expanded.has("clear" as any) &&
        <div className="p-3">
            <ClearTreatmentGrid
            categories={categories}
            allocations={allocations}
            catalogLensIds={catalogLensIds}
            pendingRowKeys={pendingRowKeys}
            lensNameMap={lensNameMap}
            showUSD={showUSD}
            fxRate={fxRate}
            onCellPick={handleCellPick}
            isSaving={upsertMutation.isPending} />

          </div>
        }
      </div>

      {/* ── COLLAPSIBLE TREATMENT SECTIONS ─────────────────────────────────── */}
      {collapsibleTreatments.map((treatment) => {
        const isOpen = expanded.has(treatment);
        const treatAllocs = allocations.filter((a) => a.treatment_type === treatment);

        return (
          <div key={treatment} className="border border-border rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border hover:bg-muted/70 transition-colors text-left"
              onClick={() => toggleExpanded(treatment)}>

              {isOpen ?
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> :

              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              }
              <span className="text-sm font-semibold text-foreground flex-1">{treatmentLabels[treatment]}</span>
              {/* Delta summary chips */}
              <span className="flex gap-1.5 ml-2">
                {MATERIAL_COLUMNS.map((col) => {
                  const treatAvgs = categories.
                  map((cat) => treatAllocs.find((a) => a.category === cat && a.material_index === col.key)?.allocated_price_bbd ?? null).
                  filter((v): v is number => v !== null);
                  const clearAvgs = clearAllocations.
                  filter((a) => a.material_index === col.key && a.allocated_price_bbd !== null).
                  map((a) => a.allocated_price_bbd as number);
                  const tAvg = treatAvgs.length > 0 ? treatAvgs.reduce((s, v) => s + v, 0) / treatAvgs.length : null;
                  const cAvg = clearAvgs.length > 0 ? clearAvgs.reduce((s, v) => s + v, 0) / clearAvgs.length : null;
                  const delta = tAvg !== null && cAvg !== null ? tAvg - cAvg : null;
                  return (
                    <span key={col.key} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background border border-border" title={`${col.key} Δ`}>
                      <span className="text-muted-foreground mr-0.5">{col.key}:</span>
                      {delta !== null ?
                      <span className={delta > 0 ? "text-emerald-600 dark:text-emerald-400" : delta < 0 ? "text-red-500" : "text-muted-foreground"}>
                          {delta > 0 ? "+" : ""}{fmt(delta, showUSD, fxRate)}
                        </span> :

                      <span className="text-muted-foreground/40">—</span>
                      }
                    </span>);

                })}
              </span>
            </button>

            {isOpen &&
            <div className="p-3 space-y-2">
                <TreatmentGrid
                treatmentType={treatment}
                label={treatmentLabels[treatment]}
                onLabelChange={(v) => setTreatmentLabels((prev) => ({ ...prev, [treatment]: v }))}
                categories={categories}
                allocations={allocations}
                clearAllocations={clearAllocations}
                catalogLensIds={catalogLensIds}
                pendingRowKeys={pendingRowKeys}
                lensNameMap={lensNameMap}
                showUSD={showUSD}
                fxRate={fxRate}
                onCellPick={handleCellPick}
                isSaving={upsertMutation.isPending} />

              </div>
            }
          </div>);

      })}

      {/* Footer */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleRecalculate}>
          <RefreshCw className="h-3 w-3" />
          Recalculate All Deltas
        </Button>
      </div>

      {/* Lens Picker Modal */}
      <LensPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
        onClear={currentCellLensId ? handleClearRequest : undefined}
        currentLensId={currentCellLensId}
        categoryFilter={pickerTarget?.category}
        materialFilter={pickerTarget?.materialIndex}
        catalogLensIds={catalogLensIds} />


      {/* Clear Confirmation Dialog */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">Clear Matrix Cell?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure? This will remove the lens from the matrix cell{" "}
              {clearTarget &&
              <strong>
                  {clearTarget.treatmentType} / {clearTarget.category} / {clearTarget.materialIndex}
                </strong>
              }{" "}
              <span className="text-destructive font-medium">and delete the matching row from the List Catalog.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClearConfirm}>

              Yes, Clear Cell
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

};

export default TreatmentMatricesAccordion;
export { buildRowKey, buildMatrixCellLabel, TREATMENT_LABELS };