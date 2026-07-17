import { useMemo, useState } from "react";
import { useMatrixAllocations, MATERIAL_COLUMNS, type MatrixAllocation, type TreatmentType } from "@/hooks/useMatrixAllocations";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import { usePricelistCatalogRowUpsert } from "@/hooks/usePricelistCatalogRowUpsert";
import { useLenses, type Lens } from "@/hooks/useLenses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Link2Off,
  Lock,
  LockOpen,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import LensFormDialog from "@/components/admin/LensFormDialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { fieldsMatch } from "@/lib/wildcardMatch";
import { useRxPricingStructure } from "@/hooks/useRxPricingStructure";
import { buildMatrixRowKey, buildMatrixSectionLabel } from "@/features/admin/rx-pricing/structure";
import { usePriceHierarchy } from "@/hooks/usePriceHierarchy";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { buildCombos, excludeLensFromAnchor, lensIdFor, upsertPricingItems, type ComboWithProvenance } from "@/lib/pricing/combos";
import { pricedMatrix } from "@/lib/pricing/engine";
import { categoryKeyFor, groupingKeyFor, materialKeyFor } from "@/lib/pricing/groupingMap";
import { APPROVED } from "@/lib/pricing/classifier";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Ban, Filter, Save as SaveIcon, Sparkles, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LineOverrideDialog from "@/components/admin/LineOverrideDialog";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import {
  computeSavePlan,
  applySavePlan,
  computeForkPlan,
  applyForkPlan,
  type SavePlan,
  type ForkPlan,
  type LensLookupRow,
} from "@/lib/pricing/save";

interface AutoPricePlanItem {
  groupingKey: string;
  groupingName: string;
  categoryKey: string;
  categoryName: string;
  materialKey: string;
  lensId: string;
  lensName: string;
  preferredSupplier: string;
  priceUSD: number;
  allocatedBbd: number;
  // Which supplier's cost the price is actually floored against, and the
  // specific lens row that represents it — so the operator can review and,
  // if it's not who they want setting the floor, exclude it right here
  // rather than hunting the row down in the catalog separately.
  anchorSupplier: string;
  anchorCost: number;
  anchorLensId: string | null;
}

interface AutoPricePlan {
  items: AutoPricePlanItem[];
  skippedExisting: number;
  skippedUnmapped: number;
}

interface TreatmentMatricesAccordionProps {
  versionId: number;
  showUSD: boolean;
  fxRate: number;
  onPendingChange?: (pendingKeys: Set<string>) => void;
}

const fmt = (val: number | null, showUSD: boolean, fxRate: number): string => {
  if (val === null || val === undefined) return "";
  const v = showUSD ? val * fxRate : val;
  return v === 0 ? "" : v.toFixed(2);
};

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
  catalogLensIds,
}: LensPickerModalProps) => {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [editLens, setEditLens] = useState<Lens | null>(null);
  const [addLensOpen, setAddLensOpen] = useState(false);
  const { data: allLenses, isLoading, refetch, createMutation, updateMutation } = useLenses();

  const lenses = useMemo(() => {
    let base = (allLenses ?? []).filter((lens) => {
      if (lens.finishtype?.name?.toLowerCase() === "finished") return false;
      if (!showAll) return lens.show_in_pricelist && lens.sell_price > 0 && lens.is_active && lens.base_price > 0;
      return true;
    });
    if (search.trim()) {
      const query = search.toLowerCase();
      base = base.filter((lens) => fieldsMatch(query, lens.name, lens.supplier?.name, lens.supplier?.abbrev));
    }
    return base;
  }, [allLenses, search, showAll]);

  return (
    <>
      <Dialog
        open={open && !editLens && !addLensOpen}
        onOpenChange={(value) => {
          if (!value) {
            setSearch("");
            onClose();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="text-sm font-semibold text-foreground">
                Select Lens
                {categoryFilter && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    — {categoryFilter} / {materialFilter}
                  </span>
                )}
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
              <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lenses…" className="pl-8 h-8 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showAll} onCheckedChange={setShowAll} className="scale-75" />
              <span className="text-[10px] text-muted-foreground">Show all (incl. inactive &amp; out of range)</span>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-2 py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : lenses.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No lenses found.</p>
            ) : (
              lenses.map((lens) => {
                const isSelected = currentLensId === lens.id;
                const inCatalog = catalogLensIds.has(lens.id);
                const isInactive = !lens.is_active;
                return (
                  <button
                    key={lens.id}
                    onClick={() => {
                      if (lens.sell_price <= 0) return;
                      onPick(lens.id, lens.name, lens.sell_price);
                      setSearch("");
                      onClose();
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-muted/60 transition-colors group",
                      isInactive && "opacity-60",
                      lens.sell_price <= 0 && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {(lens.supplier?.abbrev || lens.supplier?.name) && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 min-w-[36px] text-center">
                          {lens.supplier?.abbrev || lens.supplier?.name}
                        </span>
                      )}
                      {isInactive && <span className="shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-700">Inactive</span>}
                      {lens.sell_price <= 0 && !isInactive && <span className="shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded bg-red-100 text-red-700">$0</span>}
                      <span className="text-xs font-medium flex-1 min-w-0 truncate text-primary">{lens.name}</span>
                    </div>
                    <span className="shrink-0 flex items-center gap-2 ml-2">
                      {inCatalog && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">In List</span>}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditLens(lens);
                        }}
                        className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit lens"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <span className="text-xs font-semibold text-foreground">${lens.sell_price.toFixed(2)}</span>
                      {isSelected && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-border shrink-0 bg-muted/30 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {lenses.length} lens{lenses.length !== 1 ? "es" : ""} {showAll ? "(all)" : "with cost & price assigned"}
            </p>
            {currentLensId && onClear && (
              <button className="text-[10px] text-destructive hover:underline" onClick={() => { onClear(); onClose(); }}>
                Clear cell
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <LensFormDialog
        open={addLensOpen || !!editLens}
        onOpenChange={(value) => {
          if (!value) {
            setAddLensOpen(false);
            setEditLens(null);
          }
        }}
        lens={editLens}
        onSubmit={async (form) => {
          if (editLens) await updateMutation.mutateAsync({ id: editLens.id, form });
          else await createMutation.mutateAsync(form);
          setEditLens(null);
          setAddLensOpen(false);
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
};

interface PickedCustomer {
  id: number;
  name: string;
  accountNumber: string | null;
}

interface CustomerPickerModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (customer: PickedCustomer) => void;
}

// Same pattern as LensPickerModal and CatalogPublisherPage's AssignDialog —
// fetch the whole table once, filter client-side. customers stays small
// enough (every other consumer in this codebase does the same, no
// pagination anywhere) that a server-side search would be inconsistent
// with the rest of the app, not more correct.
const CustomerPickerModal = ({ open, onClose, onPick }: CustomerPickerModalProps) => {
  const [search, setSearch] = useState("");
  const { data: customers = [], isLoading } = useQuery<PickedCustomer[]>({
    queryKey: ["customers-picker"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("customers") as any).select("id,name,account_number").order("name");
      if (error) throw error;
      return (data ?? []).map((c: any) => ({ id: c.id, name: c.name, accountNumber: c.account_number }));
    },
    enabled: open,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.accountNumber?.toLowerCase().includes(q));
  }, [customers, search]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">Save As New — pick a customer</DialogTitle>
        </DialogHeader>
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or account #…" className="pl-8 h-8 text-xs" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-2 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No customers found.</p>
          ) : (
            filtered.map((customer) => (
              <button
                key={customer.id}
                onClick={() => {
                  onPick(customer);
                  setSearch("");
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-muted/60 transition-colors"
              >
                <span className="text-xs font-medium text-primary">{customer.name}</span>
                {customer.accountNumber && <span className="text-[10px] text-muted-foreground">{customer.accountNumber}</span>}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TreatmentMatricesAccordion = ({ versionId, showUSD, fxRate, onPendingChange }: TreatmentMatricesAccordionProps) => {
  const { toast } = useToast();
  const { isAdmin } = useAdminRole();
  const { data: allocations = [], isLoading: allocLoading, upsertMutation, deleteMutation } = useMatrixAllocations(versionId);
  const { data: catalogRows = [] } = usePricelistCatalogRows(versionId, "rx");
  const { upsertRow: upsertCatalogRow, deleteRow: deleteCatalogRow } = usePricelistCatalogRowUpsert(versionId, "rx");
  const { lineOverrides, hasOverride } = usePriceHierarchy(versionId);
  const { data: allLenses } = useLenses();
  const { versions: pricingVersions } = usePricingSettings();
  const {
    structure,
    isLoading: structureLoading,
    createGrouping,
    createCategory,
    renameGrouping,
    renameCategory,
    bumpGrouping,
    bumpCategory,
    archiveGrouping,
    archiveCategory,
  } = useRxPricingStructure(versionId);

  const [pendingRowKeys, setPendingRowKeys] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["clear"]));
  const [structureLocked, setStructureLocked] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ groupKey: string; groupName: string; categoryKey: string; categoryName: string; materialIndex: string } | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<typeof pickerTarget>(null);
  const [nameDialog, setNameDialog] = useState<
    | null
    | { mode: "create-group"; title: string; value: string }
    | { mode: "rename-group"; title: string; value: string; groupingId: number }
    | { mode: "create-category"; title: string; value: string; groupingId: number; groupingKey: string }
    | { mode: "rename-category"; title: string; value: string; categoryId: number }
  >(null);
  const [archiveDialog, setArchiveDialog] = useState<null | { type: "group"; id: number; key: string; name: string; protected?: boolean } | { type: "category"; id: number; groupingKey: string; key: string; name: string }>(null);
  const [autoPriceComputing, setAutoPriceComputing] = useState(false);
  const [autoPriceApplying, setAutoPriceApplying] = useState(false);
  const [autoPricePlan, setAutoPricePlan] = useState<AutoPricePlan | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Supplier scope: per-run, NOT persisted to lenses.excluded_from_anchor —
  // that flag is global/permanent (bad data, discontinued SKUs). This is
  // for "don't let Essilor set the floor in THIS pricelist" or "only price
  // this customer's list off Essilor" — different pricelists, different
  // scope, same underlying catalog. Defaults to every approved supplier.
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [supplierScopeMode, setSupplierScopeMode] = useState<"all" | "exclude" | "only">("all");
  const [supplierScopeSet, setSupplierScopeSet] = useState<Set<string>>(new Set());
  const [overrideTarget, setOverrideTarget] = useState<null | {
    allocationId: string;
    itemName: string;
    cost: number | null;
    currentPrice: number | null;
    cellLabel: string;
    supplierLabel: string | null;
    inclusionMode: "auto" | "manual";
  }>(null);

  const catalogLensIds = useMemo(() => new Set(catalogRows.filter((row) => row.item_id).map((row) => row.item_id as string)), [catalogRows]);
  const lensNameMap = useMemo(() => new Map((allLenses ?? []).map((lens) => [lens.id, lens.name])), [allLenses]);
  const lensMetaMap = useMemo(() => new Map((allLenses ?? []).map((lens) => [lens.id, lens])), [allLenses]);
  const marginFloorPercent = useMemo(() => {
    const active = pricingVersions.find((v) => v.is_active) ?? pricingVersions[0];
    const floors = active?.category_margin_floors as Record<string, number> | undefined;
    return ((floors?.lenses ?? 0.30) * 100);
  }, [pricingVersions]);
  const lensLookup = useMemo(
    () =>
      new Map<string, LensLookupRow>(
        (allLenses ?? []).map((lens) => [
          lens.id,
          { name: lens.name, mftype: lens.mftype?.name ?? null, lenstype: lens.lenstype?.name ?? null, material: lens.material?.name ?? null },
        ])
      ),
    [allLenses]
  );

  // Save / Save As New — BS1-05 task 7. Commits the matrix's CURRENT state
  // (auto-priced or hand-linked, doesn't matter) into pricelist_lines, the
  // layer effective_price() actually reads. Auto Price only ever wrote
  // matrix_allocations; this is the separate step that makes prices real.
  const [savePlan, setSavePlan] = useState<SavePlan | null>(null);
  const [saveComputing, setSaveComputing] = useState(false);
  const [saveApplying, setSaveApplying] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [forkCustomer, setForkCustomer] = useState<PickedCustomer | null>(null);
  const [forkPlan, setForkPlan] = useState<ForkPlan | null>(null);
  const [forkComputing, setForkComputing] = useState(false);
  const [forkApplying, setForkApplying] = useState(false);

  const allocationMap = useMemo(() => {
    const map = new Map<string, MatrixAllocation>();
    allocations.forEach((allocation) => {
      map.set(`${allocation.treatment_type}::${allocation.category}::${allocation.material_index}`, allocation);
    });
    return map;
  }, [allocations]);

  const currentCellLensId = useMemo(() => {
    if (!pickerTarget) return null;
    return allocationMap.get(`${pickerTarget.groupKey}::${pickerTarget.categoryKey}::${pickerTarget.materialIndex}`)?.lens_id ?? null;
  }, [allocationMap, pickerTarget]);

  const showStructureControls = isAdmin && !structureLocked;

  const markPending = (rowKey: string) => {
    setPendingRowKeys((previous) => {
      const next = new Set(previous);
      next.add(rowKey);
      onPendingChange?.(next);
      return next;
    });
  };

  const unmarkPending = (rowKey: string) => {
    setPendingRowKeys((previous) => {
      const next = new Set(previous);
      next.delete(rowKey);
      onPendingChange?.(next);
      return next;
    });
  };

  const getAllocation = (groupKey: string, categoryKey: string, materialIndex: string) => allocationMap.get(`${groupKey}::${categoryKey}::${materialIndex}`);

  const openMatrixOverride = (
    allocation: MatrixAllocation,
    groupingName: string,
    categoryName: string,
    materialKey: string,
    wasAutoPriced: boolean
  ) => {
    if (!allocation.id) return;
    const lens = allocation.lens_id ? lensMetaMap.get(allocation.lens_id) : null;
    const lensName = lens?.name ?? (allocation.lens_id ? lensNameMap.get(allocation.lens_id) : null) ?? "Unlinked matrix cell";
    setOverrideTarget({
      allocationId: String(allocation.id),
      itemName: lensName,
      cost: lens?.base_price != null ? lens.base_price * 2 : null,
      currentPrice: allocation.allocated_price_bbd,
      cellLabel: `${groupingName} - ${categoryName} - ${materialKey}`,
      supplierLabel: lens?.supplier?.abbrev || lens?.supplier?.name || null,
      inclusionMode: wasAutoPriced ? "auto" : "manual",
    });
  };

  const getGroupColAvg = (groupKey: string, categoryKeys: string[], materialIndex: string) => {
    const values = categoryKeys
      .map((categoryKey) => getAllocation(groupKey, categoryKey, materialIndex)?.allocated_price_bbd ?? null)
      .filter((value): value is number => value !== null);
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const clearGroup = structure.find((grouping) => grouping.key === "clear") ?? null;

  const syncToCatalog = async (groupKey: string, groupName: string, categoryKey: string, categoryName: string, material: string, lensId: string, lensName: string, sellPrice: number) => {
    const rowKey = buildMatrixRowKey(groupKey, categoryKey, material);
    markPending(rowKey);
    try {
      await upsertCatalogRow.mutateAsync({
        row_key: rowKey,
        row_type: "lens",
        section: buildMatrixSectionLabel(groupName, categoryName),
        display_description: lensName,
        bbd_price: sellPrice,
        item_id: lensId,
        sort_order: catalogRows.filter((row) => row.row_type === "lens").length,
      });
      unmarkPending(rowKey);
    } catch {
      // keep as pending so the user sees follow-up action is still required
    }
  };

  const handlePick = async (lensId: string, lensName: string, sellPrice: number) => {
    if (!pickerTarget) return;
    try {
      await upsertMutation.mutateAsync({
        category: pickerTarget.categoryKey,
        material_index: pickerTarget.materialIndex,
        treatment_type: pickerTarget.groupKey,
        lens_id: lensId,
        allocated_price_bbd: sellPrice,
      });
      await syncToCatalog(
        pickerTarget.groupKey,
        pickerTarget.groupName,
        pickerTarget.categoryKey,
        pickerTarget.categoryName,
        pickerTarget.materialIndex,
        lensId,
        lensName,
        sellPrice
      );
      toast({ title: "Cell updated & synced to Price List", description: `${lensName} → $${sellPrice.toFixed(2)} BBD` });
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
  };

  const handleClearRequest = (target = pickerTarget) => {
    if (!target) return;
    const allocation = getAllocation(target.groupKey, target.categoryKey, target.materialIndex);
    if (!allocation) return;
    setClearTarget(target);
    setPickerOpen(false);
    setClearConfirmOpen(true);
  };

  const handleClearConfirm = async () => {
    if (!clearTarget) return;
    const allocation = getAllocation(clearTarget.groupKey, clearTarget.categoryKey, clearTarget.materialIndex);
    if (!allocation) {
      setClearConfirmOpen(false);
      return;
    }

    try {
      await deleteMutation.mutateAsync(allocation.id);
      await deleteCatalogRow.mutateAsync(buildMatrixRowKey(clearTarget.groupKey, clearTarget.categoryKey, clearTarget.materialIndex));
      toast({ title: "Cell cleared", description: "Removed from Matrix and Price List." });
    } catch (error: any) {
      toast({ title: "Clear failed", description: error.message, variant: "destructive" });
    }
    setClearConfirmOpen(false);
  };

  // Auto Price: classify the live lenses catalog into anchor-priced combos
  // (src/lib/pricing), map each combo onto a real matrix cell, and stage
  // only the EMPTY cells for confirmation — never overwrites a cell someone
  // already linked by hand. Nothing is written until the plan is confirmed.
  // Resolve the current scope selection into engine.ts's `excluded` option —
  // a supplier NAME list to drop from availableSuppliers()/anchorOf() for
  // this run only. "only" mode is just "exclude everyone except these",
  // computed here so the pure engine functions never need an "allowlist"
  // concept of their own.
  const scopedExcludedSuppliers = useMemo((): string[] => {
    if (supplierScopeMode === "exclude") return [...supplierScopeSet];
    if (supplierScopeMode === "only") return APPROVED.filter((s) => !supplierScopeSet.has(s));
    return [];
  }, [supplierScopeMode, supplierScopeSet]);

  const scopeLabel = useMemo(() => {
    if (supplierScopeMode === "all" || supplierScopeSet.size === 0) return "All suppliers";
    const names = [...supplierScopeSet];
    const preview = names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
    return supplierScopeMode === "exclude" ? `Excluding: ${preview}` : `Only: ${preview}`;
  }, [supplierScopeMode, supplierScopeSet]);

  const computeAutoPricePlan = async () => {
    setAutoPriceComputing(true);
    try {
      const { combos } = await buildCombos();
      if (combos.length) await upsertPricingItems(combos);
      const priced = pricedMatrix(combos, { floorMargin: 0.15, rounding: 0.5, excluded: scopedExcludedSuppliers });
      const comboByKey = new Map<string, ComboWithProvenance>(combos.map((combo) => [combo.key, combo]));

      const items: AutoPricePlanItem[] = [];
      let skippedExisting = 0;
      let skippedUnmapped = 0;
      let skippedUnsafe = 0;

      for (const row of priced) {
        if (!row.available || !row.key || !row.treatment || !row.tier || !row.material || !row.preferredSupplier || !row.anchorSupplier) continue;

        // Defense in depth: standardPrice() computes prices that should
        // ALWAYS clear the floor margin against every available supplier by
        // construction (price is derived FROM the anchor, then only ever
        // rounded up). Never write a row where that isn't true, even though
        // it should be mathematically impossible — "should be impossible"
        // isn't the same guarantee as "provably didn't happen."
        if (row.safe === false) {
          skippedUnsafe++;
          continue;
        }

        const groupingKey = groupingKeyFor(row.treatment);
        const categoryKey = categoryKeyFor(row.tier);
        const materialKey = materialKeyFor(row.material);
        if (!groupingKey || !categoryKey || !materialKey) {
          skippedUnmapped++;
          continue;
        }

        const grouping = structure.find((candidate) => candidate.key === groupingKey);
        const category = grouping?.categories.find((candidate) => candidate.key === categoryKey);
        if (!grouping || !category) {
          skippedUnmapped++;
          continue;
        }

        if (getAllocation(groupingKey, categoryKey, materialKey)?.lens_id) {
          skippedExisting++;
          continue;
        }

        const combo = comboByKey.get(row.key);
        const lensId = combo ? lensIdFor(combo, row.preferredSupplier) : null;
        if (!combo || !lensId) {
          skippedUnmapped++;
          continue;
        }

        const lensName = combo.provenance[row.preferredSupplier]?.sourceName ?? row.preferredSupplier;
        const allocatedBbd = fxRate > 0 ? row.priceUSD! / fxRate : row.priceUSD!;
        const anchorLensId = lensIdFor(combo, row.anchorSupplier);

        items.push({
          groupingKey,
          groupingName: grouping.name,
          categoryKey,
          categoryName: category.name,
          materialKey,
          lensId,
          lensName,
          preferredSupplier: row.preferredSupplier,
          priceUSD: row.priceUSD!,
          allocatedBbd: Math.round(allocatedBbd * 100) / 100,
          anchorSupplier: row.anchorSupplier,
          anchorCost: row.anchorCost!,
          anchorLensId,
        });
      }

      setAutoPricePlan({ items, skippedExisting, skippedUnmapped });
      if (skippedUnsafe) {
        toast({
          title: "Unsafe prices blocked",
          description: `${skippedUnsafe} combo(s) computed a price that didn't clear the floor margin against every available supplier and were NOT staged. This should not be possible — worth reporting if you see it.`,
          variant: "destructive",
        });
      }
      if (!items.length && !skippedUnsafe) {
        toast({
          title: "Nothing to price",
          description: skippedExisting
            ? `${skippedExisting} matching cells are already linked; nothing else classified.`
            : "No live lens rows classified into an empty matrix cell.",
        });
      }
    } catch (error: any) {
      toast({ title: "Auto Price failed", description: error.message, variant: "destructive" });
    } finally {
      setAutoPriceComputing(false);
    }
  };

  const excludeAnchorAndRecompute = async (item: AutoPricePlanItem) => {
    if (!item.anchorLensId) return;
    setAutoPriceComputing(true);
    try {
      await excludeLensFromAnchor(item.anchorLensId, `Excluded during Auto Price review (was anchor for ${item.groupingName} / ${item.categoryName} / ${item.materialKey})`);
      toast({ title: "Supplier excluded", description: `${item.anchorSupplier}'s price no longer counts toward the anchor for this cell. Recomputing…` });
      await computeAutoPricePlan();
    } catch (error: any) {
      toast({ title: "Exclude failed", description: error.message, variant: "destructive" });
      setAutoPriceComputing(false);
    }
  };

  const applyAutoPricePlan = async () => {
    if (!autoPricePlan) return;
    setAutoPriceApplying(true);
    let applied = 0;
    try {
      for (const item of autoPricePlan.items) {
        await upsertMutation.mutateAsync({
          category: item.categoryKey,
          material_index: item.materialKey,
          treatment_type: item.groupingKey,
          lens_id: item.lensId,
          allocated_price_bbd: item.allocatedBbd,
        });
        await syncToCatalog(
          item.groupingKey,
          item.groupingName,
          item.categoryKey,
          item.categoryName,
          item.materialKey,
          item.lensId,
          item.lensName,
          item.allocatedBbd
        );
        applied++;
      }
      toast({ title: "Auto Price applied", description: `${applied} cell${applied === 1 ? "" : "s"} priced and linked.` });
    } catch (error: any) {
      toast({
        title: "Auto Price stopped partway",
        description: `${applied} of ${autoPricePlan.items.length} cells applied before this error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setAutoPriceApplying(false);
      setAutoPricePlan(null);
    }
  };

  // Reset Matrix: clear every allocation (and its synced Price List row) for
  // the current version. Destructive and irreversible via undo — behind the
  // structure lock, admin-only, same as Add Grouping. Not the local tool's
  // "Reset" (that was clearing an unsaved draft; this editor has no draft
  // layer — see BS1-05 task 6). This clears real, already-saved data, so it
  // gets its own confirm dialog rather than reusing the single-cell one.
  const handleResetMatrix = async () => {
    setResetting(true);
    let cleared = 0;
    try {
      for (const allocation of allocations) {
        await deleteMutation.mutateAsync(allocation.id);
        await deleteCatalogRow.mutateAsync(buildMatrixRowKey(allocation.treatment_type, allocation.category, allocation.material_index));
        cleared++;
      }
      toast({ title: "Matrix reset", description: `Cleared ${cleared} cell${cleared === 1 ? "" : "s"}.` });
    } catch (error: any) {
      toast({
        title: "Reset stopped partway",
        description: `${cleared} of ${allocations.length} cells cleared before this error: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setResetting(false);
      setResetConfirmOpen(false);
    }
  };

  const computeSave = async () => {
    setSaveComputing(true);
    try {
      const plan = await computeSavePlan(allocations, lensLookup, fxRate);
      setSavePlan(plan);
      if (!plan.items.length) {
        toast({ title: "Nothing to save", description: "No linked cells resolve to a price-able item." });
      }
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } finally {
      setSaveComputing(false);
    }
  };

  const applySave = async () => {
    if (!savePlan) return;
    setSaveApplying(true);
    try {
      const applied = await applySavePlan(savePlan.items);
      toast({ title: "Saved to master", description: `${applied} price${applied === 1 ? "" : "s"} committed to the master pricelist.` });
    } catch (error: any) {
      toast({ title: "Save stopped partway", description: error.message, variant: "destructive" });
    } finally {
      setSaveApplying(false);
      setSavePlan(null);
    }
  };

  const onCustomerPicked = async (customer: PickedCustomer) => {
    setForkCustomer(customer);
    setCustomerPickerOpen(false);
    setForkComputing(true);
    try {
      const plan = await computeForkPlan(allocations, lensLookup, fxRate);
      setForkPlan(plan);
      if (!plan.items.length) {
        toast({
          title: "Nothing to fork",
          description: plan.skippedNoChange
            ? `Every linked cell already matches ${customer.name}'s current effective price — nothing to save as new.`
            : "No linked cells resolve to a price-able item.",
        });
      }
    } catch (error: any) {
      toast({ title: "Save As New failed", description: error.message, variant: "destructive" });
    } finally {
      setForkComputing(false);
    }
  };

  const applyFork = async () => {
    if (!forkPlan || !forkCustomer) return;
    setForkApplying(true);
    try {
      const applied = await applyForkPlan(forkCustomer.id, forkPlan.items, `Save As New from pricelist version ${versionId}`);
      toast({ title: "Forked", description: `${applied} custom price${applied === 1 ? "" : "s"} saved for ${forkCustomer.name}.` });
    } catch (error: any) {
      toast({ title: "Save As New stopped partway", description: error.message, variant: "destructive" });
    } finally {
      setForkApplying(false);
      setForkPlan(null);
      setForkCustomer(null);
    }
  };

  const handleNameSubmit = async () => {
    if (!nameDialog) return;
    try {
      if (nameDialog.mode === "create-group") {
        await createGrouping.mutateAsync({ name: nameDialog.value });
        toast({ title: "Grouping created", description: `Added ${nameDialog.value.trim()} to every price list version.` });
      } else if (nameDialog.mode === "rename-group") {
        await renameGrouping.mutateAsync({ groupingId: nameDialog.groupingId, name: nameDialog.value });
        toast({ title: "Grouping renamed", description: "Saved across all price list versions." });
      } else if (nameDialog.mode === "create-category") {
        await createCategory.mutateAsync({ name: nameDialog.value });
        setExpanded((previous) => new Set(previous).add(nameDialog.groupingKey));
        toast({ title: "Category created", description: `Added ${nameDialog.value.trim()} across all groupings and materials.` });
      } else if (nameDialog.mode === "rename-category") {
        await renameCategory.mutateAsync({ categoryId: nameDialog.categoryId, name: nameDialog.value });
        toast({ title: "Category renamed", description: "Saved for this price list version." });
      }
      setNameDialog(null);
    } catch (error: any) {
      toast({ title: "Unable to save", description: error.message, variant: "destructive" });
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveDialog) return;
    if (archiveDialog.type === "group") {
      if (archiveDialog.protected) {
        toast({ title: "Grouping locked", description: "Clear Lenses stays available as the pricing baseline.", variant: "destructive" });
        setArchiveDialog(null);
        return;
      }
      try {
        await archiveGrouping.mutateAsync({ groupingId: archiveDialog.id, groupingKey: archiveDialog.key });
        toast({ title: "Grouping removed", description: `${archiveDialog.name} was removed or archived safely.` });
      } catch (error: any) {
        toast({ title: "Unable to remove grouping", description: error.message, variant: "destructive" });
      }
    } else {
      try {
        await archiveCategory.mutateAsync({ categoryId: archiveDialog.id });
        toast({ title: "Category removed", description: `${archiveDialog.name} was removed or archived safely.` });
      } catch (error: any) {
        toast({ title: "Unable to remove category", description: error.message, variant: "destructive" });
      }
    }
    setArchiveDialog(null);
  };

  if (allocLoading || structureLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Price Matrix <span className="font-normal text-muted-foreground text-xs">— Shared Editor for Matrix &amp; List Formats</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click <Search className="inline h-3 w-3" /> to link a lens. Green <CheckCircle className="inline h-3 w-3 text-emerald-500" /> = in Price List. Red dot = pending sync.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setStructureLocked((current) => !current)}
                title={structureLocked ? "Unlock structure editing" : "Lock structure editing"}
                aria-label={structureLocked ? "Unlock structure editing" : "Lock structure editing"}
              >
                {structureLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
              </Button>
              {showStructureControls && (
                <>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setNameDialog({ mode: "create-group", title: "Add Grouping", value: "" })}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Grouping
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setResetConfirmOpen(true)}
                    disabled={resetting || !allocations.length}
                    title="Clear every linked cell in this pricelist version"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Reset Matrix
                  </Button>
                </>
              )}
            </>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => toast({ title: "Deltas recalculated", description: "All delta rows updated." })}>
            <RefreshCw className="h-3.5 w-3.5" />
            Recalculate All Deltas
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={cn("h-8 text-xs gap-1.5", supplierScopeMode !== "all" && "border-amber-400 text-amber-700")}
            onClick={() => setScopeDialogOpen(true)}
            title="Which suppliers count toward this run's anchor/floor pricing — separate from lenses.excluded_from_anchor, applies only here"
          >
            <Filter className="h-3.5 w-3.5" />
            {scopeLabel}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={computeAutoPricePlan}
            disabled={autoPriceComputing || autoPriceApplying}
            title="Classify the live lens catalog and fill empty matrix cells with anchor-priced lenses"
          >
            {autoPriceComputing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Auto Price
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={computeSave}
            disabled={saveComputing || saveApplying || !allocations.length}
            title="Commit this matrix's current prices to the master pricelist (pricelist_lines) — what effective_price() actually reads"
          >
            {saveComputing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => setCustomerPickerOpen(true)}
            disabled={forkComputing || forkApplying || !allocations.length}
            title="Fork this matrix's prices to one customer — only the cells that differ from the master price get saved"
          >
            {forkComputing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Save As New
          </Button>
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">
        Displaying: {showUSD ? "USD" : "BBD"}
      </div>

      {structure.map((grouping, groupingIndex) => {
        const isOpen = expanded.has(grouping.key);
        const categoryKeys = grouping.categories.map((category) => category.key);
        const clearCategoryKeys = clearGroup?.categories.map((category) => category.key) ?? [];
        const headerClasses = grouping.key === "clear" ? "bg-[#1e4cb8] text-primary-foreground" : "bg-muted/50 text-foreground";

        return (
          <div key={grouping.id} className="border border-border rounded-lg overflow-hidden">
            <button className={cn("w-full flex items-center gap-2 px-4 py-2.5 border-b border-border text-left", headerClasses)} onClick={() => setExpanded((previous) => {
              const next = new Set(previous);
              if (next.has(grouping.key)) next.delete(grouping.key);
              else next.add(grouping.key);
              return next;
            })}>
              {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <span className="text-sm font-semibold flex-1">{grouping.name}</span>
              <span className="hidden md:flex items-center gap-1.5">
                {grouping.key !== "clear" && MATERIAL_COLUMNS.map((column) => {
                  const treatAvg = getGroupColAvg(grouping.key, categoryKeys, column.key);
                  const clearAvg = getGroupColAvg("clear", clearCategoryKeys, column.key);
                  const delta = grouping.key !== "clear" && treatAvg !== null && clearAvg !== null ? treatAvg - clearAvg : null;
                  return (
                    <span key={column.key} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-background/90 text-foreground border border-border">
                      <span className="text-muted-foreground mr-0.5">{column.key}:</span>
                      {delta !== null ? <span className={delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-muted-foreground"}>{delta > 0 ? "+" : ""}{fmt(delta, showUSD, fxRate)}</span> : <span className="text-muted-foreground/40">—</span>}
                    </span>
                  );
                })}
              </span>
            </button>
            {isOpen && (
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[11px] text-muted-foreground">Grouping names and order are global across all price list versions.</div>
                  {showStructureControls && (
                    <div className="flex items-center gap-1.5">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => bumpGrouping.mutate({ groupingId: grouping.id, direction: -1 })} disabled={groupingIndex === 0 || bumpGrouping.isPending} title="Move grouping up">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => bumpGrouping.mutate({ groupingId: grouping.id, direction: 1 })} disabled={groupingIndex === structure.length - 1 || bumpGrouping.isPending} title="Move grouping down">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setNameDialog({ mode: "rename-group", title: "Rename Grouping", value: grouping.name, groupingId: grouping.id })} title="Rename grouping">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setNameDialog({ mode: "create-category", title: `Add Category (All Groups) to ${grouping.name}`, value: "", groupingId: grouping.id, groupingKey: grouping.key })}>
                        <Plus className="h-3.5 w-3.5" />
                        Add Category (All Groups)
                      </Button>
                      <Button size="icon" variant="outline" className="h-7 w-7 text-destructive" onClick={() => setArchiveDialog({ type: "group", id: grouping.id, key: grouping.key, name: grouping.name, protected: grouping.key === "clear" })} title="Remove grouping">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="overflow-auto border border-border rounded-md">
                  <table className="w-full text-xs border-collapse bg-background">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        <th className="px-3 py-2 text-left font-bold border-r border-border min-w-[240px] text-foreground">Category</th>
                        {MATERIAL_COLUMNS.map((column) => (
                          <th key={column.key} className="px-3 py-2 text-center font-bold border-r border-border last:border-r-0 min-w-[120px] text-foreground">
                            {column.key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grouping.categories.map((category, categoryIndex) => (
                        <tr key={category.id} className={cn("border-b border-border last:border-b-0 transition-colors", categoryIndex % 2 === 0 ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/30")}>
                          <td className="px-3 py-1.5 border-r border-border align-top">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-semibold text-foreground whitespace-nowrap">{category.name}</div>
                              {showStructureControls && (
                                <div className="flex items-center gap-1 no-print">
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => bumpCategory.mutate({ categoryId: category.id, direction: -1 })} disabled={categoryIndex === 0 || bumpCategory.isPending} title="Move category up">
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => bumpCategory.mutate({ categoryId: category.id, direction: 1 })} disabled={categoryIndex === grouping.categories.length - 1 || bumpCategory.isPending} title="Move category down">
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setNameDialog({ mode: "rename-category", title: "Rename Category", value: category.name, categoryId: category.id })} title="Rename category">
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setArchiveDialog({ type: "category", id: category.id, groupingKey: grouping.key, key: category.key, name: category.name })} title="Remove category">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </td>
                          {MATERIAL_COLUMNS.map((column) => {
                            const allocation = getAllocation(grouping.key, category.key, column.key);
                            const inCatalog = allocation?.lens_id ? catalogLensIds.has(allocation.lens_id) : false;
                            const rowKey = buildMatrixRowKey(grouping.key, category.key, column.key);
                            const isPending = pendingRowKeys.has(rowKey);
                            const allocationId = allocation?.id ? String(allocation.id) : undefined;
                            const isOverridden = allocationId ? hasOverride(allocationId, "matrix_allocation") : false;
                            const overrideRow = allocationId
                              ? lineOverrides.find((entry) => entry.reference_type === "matrix_allocation" && entry.reference_id === allocationId)
                              : null;
                            const displayPrice = overrideRow?.overridden_price_bbd ?? allocation?.allocated_price_bbd ?? null;
                            return (
                              <td key={column.key} className="border-r border-border last:border-r-0 p-0">
                                <div className={cn("group/cell flex flex-col", isOverridden && "bg-amber-100/40 dark:bg-amber-900/20")}>
                                  <div className="flex items-center">
                                    <div className="flex-1 px-2 py-1.5 text-right font-mono text-xs text-foreground min-w-0">
                                      {displayPrice != null ? <span className="font-semibold">{fmt(displayPrice, showUSD, fxRate)}</span> : <span className="text-muted-foreground/40">—</span>}
                                    </div>
                                    {isOverridden && <Link2Off className="h-3 w-3 shrink-0 text-amber-600 mr-0.5" />}
                                    {isPending && <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-0.5 shrink-0" title="Pending sync to Price List" />}
                                    {inCatalog && !isPending && <CheckCircle className="h-3 w-3 shrink-0 text-emerald-500 mr-0.5" />}
                                    {allocation && (
                                      <button
                                        type="button"
                                        onClick={() => openMatrixOverride(allocation, grouping.name, category.name, column.key, true)}
                                        className={cn(
                                          "shrink-0 px-1 py-1 rounded transition-colors hover:bg-primary/10",
                                          isOverridden ? "text-amber-600" : "text-primary"
                                        )}
                                        title="Override price for this matrix cell"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                    )}
                                    {allocation && (
                                      <button
                                        onClick={() => handleClearRequest({ groupKey: grouping.key, groupName: grouping.name, categoryKey: category.key, categoryName: category.name, materialIndex: column.key })}
                                        className="shrink-0 px-1 py-1 rounded transition-colors opacity-0 group-hover/cell:opacity-100 hover:bg-destructive/10 text-destructive"
                                        title="Clear this matrix cell and delete the linked list row"
                                        disabled={deleteMutation.isPending || deleteCatalogRow.isPending}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setPickerTarget({ groupKey: grouping.key, groupName: grouping.name, categoryKey: category.key, categoryName: category.name, materialIndex: column.key });
                                        setPickerOpen(true);
                                      }}
                                      className={cn("shrink-0 px-1 py-1 hover:bg-primary/10 rounded transition-colors", allocation ? "text-primary" : "text-muted-foreground")}
                                      title="Link a lens to this cell"
                                      disabled={upsertMutation.isPending}
                                    >
                                      <Search className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {allocation?.lens_id && (
                                    <div className="px-2 pb-0.5 text-[9px] truncate max-w-full text-primary/70" title={lensNameMap.get(allocation.lens_id) ?? allocation.lens_id}>
                                      ↳ {lensNameMap.get(allocation.lens_id) ?? allocation.lens_id.slice(0, 8) + "…"}
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      <tr className="bg-muted/40 border-t-2 border-border font-semibold">
                        <td className="px-3 py-1.5 text-xs border-r border-border text-muted-foreground italic">Col. Averages</td>
                        {MATERIAL_COLUMNS.map((column) => {
                          const avg = getGroupColAvg(grouping.key, categoryKeys, column.key);
                          return (
                            <td key={column.key} className="px-3 py-1.5 text-right text-xs border-r border-border last:border-r-0 text-foreground">
                              {avg !== null ? fmt(avg, showUSD, fxRate) : "—"}
                            </td>
                          );
                        })}
                      </tr>

                      {grouping.key !== "clear" && (
                        <tr className="bg-amber-50/60 dark:bg-amber-900/10 border-t border-border">
                          <td className="px-3 py-1.5 text-xs border-r border-border text-amber-700 dark:text-amber-400 italic">Δ vs Clear</td>
                          {MATERIAL_COLUMNS.map((column) => {
                            const treatAvg = getGroupColAvg(grouping.key, categoryKeys, column.key);
                            const baseAvg = getGroupColAvg("clear", clearCategoryKeys, column.key);
                            const delta = treatAvg !== null && baseAvg !== null ? treatAvg - baseAvg : null;
                            return (
                              <td key={column.key} className="px-3 py-1.5 text-right text-xs border-r border-border last:border-r-0">
                                {delta !== null ? <span className={cn("font-semibold", delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-muted-foreground")}>{delta > 0 ? "+" : ""}{fmt(delta, showUSD, fxRate)}</span> : <span className="text-muted-foreground/40">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <LensPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
        onClear={currentCellLensId ? handleClearRequest : undefined}
        currentLensId={currentCellLensId}
        categoryFilter={pickerTarget?.categoryName}
        materialFilter={pickerTarget?.materialIndex}
        catalogLensIds={catalogLensIds}
      />

      <LineOverrideDialog
        open={!!overrideTarget}
        onOpenChange={(value) => {
          if (!value) setOverrideTarget(null);
        }}
        versionId={versionId}
        sectionType="RX Lens Prices"
        referenceType="matrix_allocation"
        referenceId={overrideTarget?.allocationId ?? ""}
        itemName={overrideTarget?.itemName ?? ""}
        cost={overrideTarget?.cost ?? null}
        currentPrice={overrideTarget?.currentPrice ?? null}
        marginFloor={marginFloorPercent}
        context={overrideTarget ? {
          cellLabel: overrideTarget.cellLabel,
          sourceLabel: "Matrix allocation",
          supplierLabel: overrideTarget.supplierLabel,
          inclusionMode: overrideTarget.inclusionMode,
          notes: [
            "Auto Price can fill this cell from active, approved, positive-cost lens rows that classify into the same grouping, category, and material.",
            "Manual lens selection still happens from the matrix search control beside this pencil.",
            "This override changes only the matrix cell price; it does not remove the linked lens or disable Auto Price review.",
          ],
        } : undefined}
      />

      <Dialog open={!!nameDialog} onOpenChange={(value) => !value && setNameDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{nameDialog?.title ?? "Edit Name"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Name</label>
            <Input
              autoFocus
              value={nameDialog?.value ?? ""}
              onChange={(event) => setNameDialog((current) => (current ? { ...current, value: event.target.value } : current))}
              placeholder="Enter a name"
            />
            <p className="text-[11px] text-muted-foreground">This name is required. Grouping names save globally; category renames save for the active version.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialog(null)}>Cancel</Button>
            <Button onClick={handleNameSubmit} disabled={createGrouping.isPending || createCategory.isPending || renameGrouping.isPending || renameCategory.isPending || !(nameDialog?.value.trim())}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">Clear Matrix Cell?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This removes the selected lens from the matrix and deletes the matching price list line for the active version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleClearConfirm}>
              Yes, Clear Cell
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Auto Price supplier scope</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Applies only to Auto Price runs in <strong>this pricelist version</strong> — not persisted to the catalog. For
            permanently excluding a bad-data lens everywhere, use the Exclude action in the review step instead.
          </p>
          <RadioGroup value={supplierScopeMode} onValueChange={(v) => setSupplierScopeMode(v as typeof supplierScopeMode)} className="gap-2">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="scope-all" />
              <label htmlFor="scope-all" className="text-xs">All approved suppliers (default)</label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="exclude" id="scope-exclude" />
              <label htmlFor="scope-exclude" className="text-xs">Exclude selected suppliers — e.g. keep Essilor out of the main book</label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="only" id="scope-only" />
              <label htmlFor="scope-only" className="text-xs">Only selected suppliers — e.g. an Essilor-only pricelist for one customer</label>
            </div>
          </RadioGroup>
          {supplierScopeMode !== "all" && (
            <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto border border-border rounded-md p-2">
              {APPROVED.map((supplier) => (
                <label key={supplier} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={supplierScopeSet.has(supplier)}
                    onCheckedChange={(checked) =>
                      setSupplierScopeSet((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(supplier);
                        else next.delete(supplier);
                        return next;
                      })
                    }
                  />
                  {supplier}
                </label>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setSupplierScopeMode("all");
                setSupplierScopeSet(new Set());
              }}
            >
              Reset to all
            </Button>
            <Button className="h-7 text-xs" onClick={() => setScopeDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!autoPricePlan} onOpenChange={(value) => !value && !autoPriceApplying && !autoPriceComputing && setAutoPricePlan(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <DialogTitle className="text-sm font-semibold">Review Auto Price</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Every price floors against the <strong>anchor</strong> — the most expensive available, non-excluded supplier for that
              cell — so margin holds no matter which supplier actually fulfils the order. Exclude a supplier below to drop it from
              the anchor calc and recompute before anything is written.
            </p>
            {supplierScopeMode !== "all" && (
              <p className="text-xs font-medium text-amber-700">Supplier scope active for this run: {scopeLabel}</p>
            )}
          </DialogHeader>

          <div className="px-4 py-2 border-b border-border shrink-0 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span>
              <strong className="text-foreground">{autoPricePlan?.items.length ?? 0}</strong> cell{autoPricePlan?.items.length === 1 ? "" : "s"} to fill
            </span>
            {!!autoPricePlan?.skippedExisting && <span>{autoPricePlan.skippedExisting} already linked by hand (untouched)</span>}
            {!!autoPricePlan?.skippedUnmapped && <span>{autoPricePlan.skippedUnmapped} unmapped (no matching cell)</span>}
          </div>

          <div className="overflow-y-auto flex-1">
            {autoPriceComputing ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : !autoPricePlan?.items.length ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nothing to review.</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-background border-b border-border">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-semibold text-foreground">Cell</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-foreground">Anchor supplier (floors the price)</th>
                    <th className="px-3 py-1.5 text-left font-semibold text-foreground">Links to</th>
                    <th className="px-3 py-1.5 text-right font-semibold text-foreground">Price</th>
                    <th className="px-3 py-1.5 text-right font-semibold text-foreground" />
                  </tr>
                </thead>
                <tbody>
                  {autoPricePlan.items.map((item) => (
                    <tr key={`${item.groupingKey}::${item.categoryKey}::${item.materialKey}`} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-1.5 whitespace-nowrap align-top">
                        <div className="font-medium text-foreground">{item.categoryName}</div>
                        <div className="text-muted-foreground text-[10px]">{item.groupingName} · {item.materialKey}</div>
                      </td>
                      <td className="px-3 py-1.5 align-top">
                        <div className="font-medium text-foreground">{item.anchorSupplier}</div>
                        <div className="text-muted-foreground text-[10px]">${item.anchorCost.toFixed(2)} USD · worst case this cell must clear</div>
                      </td>
                      <td className="px-3 py-1.5 align-top max-w-[220px] truncate" title={item.lensName}>
                        {item.lensName}
                        {item.preferredSupplier !== item.anchorSupplier && (
                          <div className="text-muted-foreground text-[10px]">{item.preferredSupplier} — cheaper than anchor, floor still holds</div>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono align-top">
                        {showUSD ? `$${item.priceUSD.toFixed(2)}` : item.allocatedBbd.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right align-top">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-[10px] gap-1 text-destructive hover:text-destructive"
                          disabled={autoPriceComputing || autoPriceApplying || !item.anchorLensId}
                          onClick={() => excludeAnchorAndRecompute(item)}
                          title={`Exclude ${item.anchorSupplier} from this cell's anchor calculation and recompute`}
                        >
                          <Ban className="h-3 w-3" />
                          Exclude
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <DialogFooter className="px-4 py-3 border-t border-border shrink-0">
            <Button variant="outline" className="h-7 text-xs" disabled={autoPriceApplying} onClick={() => setAutoPricePlan(null)}>
              Cancel
            </Button>
            <Button
              className="h-7 text-xs"
              disabled={autoPriceApplying || autoPriceComputing || !autoPricePlan?.items.length}
              onClick={applyAutoPricePlan}
            >
              {autoPriceApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Fill {autoPricePlan?.items.length ?? 0} Cell{autoPricePlan?.items.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resetConfirmOpen} onOpenChange={(value) => !resetting && setResetConfirmOpen(value)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">Reset the entire matrix?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This clears all <strong>{allocations.length}</strong> linked cell{allocations.length === 1 ? "" : "s"} in this pricelist version — every
              lens link and its synced Price List row. This cannot be undone; re-run Auto Price or re-link cells by hand afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs" disabled={resetting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={resetting} onClick={handleResetMatrix}>
              Yes, Reset Matrix
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!savePlan} onOpenChange={(value) => !value && !saveApplying && setSavePlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">Save to master pricelist?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-1">
              <span className="block">
                Will write <strong>{savePlan?.items.length ?? 0}</strong> price{savePlan?.items.length === 1 ? "" : "s"} to the
                master pricelist — the read path <code className="text-[10px]">effective_price()</code> uses. This is the
                canonical price for every customer without a custom fork.
              </span>
              {!!savePlan?.skippedUnlinked && (
                <span className="block text-muted-foreground">{savePlan.skippedUnlinked} cell(s) have no linked lens or no price, skipped.</span>
              )}
              {!!savePlan?.skippedUnresolvable && (
                <span className="block text-muted-foreground">
                  {savePlan.skippedUnresolvable} linked lens(es) don't resolve to a combo (design/material gap), skipped.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs" disabled={saveApplying}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs" disabled={saveApplying || !savePlan?.items.length} onClick={applySave}>
              Save {savePlan?.items.length ?? 0} Price{savePlan?.items.length === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerPickerModal open={customerPickerOpen} onClose={() => setCustomerPickerOpen(false)} onPick={onCustomerPicked} />

      <AlertDialog
        open={!!forkPlan}
        onOpenChange={(value) => {
          if (!value && !forkApplying) {
            setForkPlan(null);
            setForkCustomer(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">Save As New — {forkCustomer?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-1">
              <span className="block">
                Will fork <strong>{forkPlan?.items.length ?? 0}</strong> price{forkPlan?.items.length === 1 ? "" : "s"} to{" "}
                {forkCustomer?.name}'s own custom pricelist — sparse, only where this matrix's price differs from the master's.
              </span>
              {!!forkPlan?.skippedNoChange && (
                <span className="block text-muted-foreground">{forkPlan.skippedNoChange} cell(s) already match the master price, no fork line needed.</span>
              )}
              {!!forkPlan?.skippedUnlinked && (
                <span className="block text-muted-foreground">{forkPlan.skippedUnlinked} cell(s) have no linked lens or no price, skipped.</span>
              )}
              {!!forkPlan?.skippedUnresolvable && (
                <span className="block text-muted-foreground">{forkPlan.skippedUnresolvable} linked lens(es) don't resolve to a combo, skipped.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs" disabled={forkApplying}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs" disabled={forkApplying || !forkPlan?.items.length} onClick={applyFork}>
              Fork {forkPlan?.items.length ?? 0} Price{forkPlan?.items.length === 1 ? "" : "s"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!archiveDialog} onOpenChange={(value) => !value && setArchiveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-semibold">Remove Item?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              If the item has no live usage it will be deleted. Otherwise it will be archived safely so published pricing does not break.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleArchiveConfirm}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TreatmentMatricesAccordion;
export { buildMatrixRowKey as buildRowKey };
