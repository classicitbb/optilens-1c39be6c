import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useLenses } from "@/hooks/useLenses";
import { useAddons } from "@/hooks/useAddons";
import { useSupplies } from "@/hooks/useSupplies";
import { usePricelistCatalogRows, PricelistCatalogRow } from "@/hooks/usePricelistCatalogRows";
import { Button } from "@/components/ui/button";
import { FileText, Table2, FileSpreadsheet, Loader2, Plus, X, Search, Save, ArrowUpDown, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Pencil, Link2Off } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { writeAoaWorkbook } from "@/lib/excelExport";
import { LensPickerPopover, PickedItem } from "@/components/admin/LensPickerPopover";
import { SupplyPickerPopover, PickedSupply } from "@/components/admin/SupplyPickerPopover";
import MarginBadge from "@/components/admin/MarginBadge";
import LineOverrideDialog from "@/components/admin/LineOverrideDialog";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { useMatrixAllocations } from "@/hooks/useMatrixAllocations";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePriceHierarchy } from "@/hooks/usePriceHierarchy";
import { compareCategoryOrder } from "@/lib/sortOrder";
import { useRxPricingStructure } from "@/hooks/useRxPricingStructure";
import { buildMatrixSectionLabel, parseMatrixRowKey } from "@/features/admin/rx-pricing/structure";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { usePricelistCatalogRowUpsert } from "@/hooks/usePricelistCatalogRowUpsert";

const BLUE_BG = "#1e4db7";
const BLUE_TEXT = "#fff";

export interface CatalogRow {
  key: string;
  section: string;
  description: string;
  bbd: number | null;
  usd: number | null;
  margin: number | null;
  lensId?: string;
  addonId?: string;
  supplyId?: string;
  matrixCell?: string; // screen-only, hidden on print/export
  supplier?: string; // supplier abbrev
}

type SortDir = "asc" | "desc" | null;

interface ListCatalogTabProps {
  fxRate: number;
  showUSD: boolean;
  catalogType?: "rx" | "stock" | "buysell";
  lensFilter?: "wspl" | "web" | "pricelist" | "none";
  pageTitle?: string;
  pageName?: string;
  showTreatmentsAddons?: boolean;
  versionId?: number | null;
  /** Row keys that are pending (newly synced from matrix, not yet viewed+saved) */
  pendingMatrixRowKeys?: Set<string>;
  /** Called when user clicks Save All Changes so parent can clear pending */
  onSaved?: () => void;
  /** If provided, save controls are rendered via this callback instead of inline */
  renderSaveBar?: (saveBar: React.ReactNode) => void;
  /** Emits current in-editor rows so external previews can update without save */
  onRowsChange?: (rows: Omit<PricelistCatalogRow, "id">[]) => void;
}

const ListCatalogTab = ({
  fxRate,
  showUSD,
  catalogType = "rx",
  lensFilter = "pricelist",
  pageTitle = "Custom Catalog",
  pageName,
  showTreatmentsAddons = false,
  versionId = null,
  pendingMatrixRowKeys,
  onSaved,
  renderSaveBar,
  onRowsChange
}: ListCatalogTabProps) => {
  const { data: allLenses, isLoading: lLoading } = useLenses();
  const { data: allAddons, isLoading: aLoading } = useAddons();
  const { data: allSupplies, isLoading: sLoading } = useSupplies();
  const { data: priceMatrixData } = usePriceMatrix();
  const { data: allocations = [], upsertMutation: upsertMatrixAllocation, deleteMutation: deleteMatrixAllocation } = useMatrixAllocations(versionId ?? null);
  const { data: mftypeRef = [] } = useReferenceData("mftypes");
  const { data: savedRows, isLoading: rowsLoading, saveRows } = usePricelistCatalogRows(
    versionId ?? null,
    catalogType
  );
  const { structure: rxStructure } = useRxPricingStructure(versionId ?? null);
  const { toast } = useToast();
  const { data: companySettings } = useCompanySettings();
  const { hasOverride, lineOverrides } = usePriceHierarchy(versionId);
  const { versions: pricingVersions } = usePricingSettings();
  const { upsertRow: upsertCatalogRow, deleteRow: deleteCatalogRow } = usePricelistCatalogRowUpsert(versionId ?? null, catalogType);
  const printRef = useRef<HTMLDivElement>(null);

  // Determine the margin floor based on catalog type
  const marginFloorPercent = useMemo(() => {
    const active = pricingVersions.find((v) => v.is_active) ?? pricingVersions[0];
    if (!active) return 20;
    const floors = active.category_margin_floors as Record<string, number>;
    if (catalogType === "stock") return (floors.wspl ?? 0.25) * 100;
    if (catalogType === "buysell") return (floors.supplies ?? 0.25) * 100;
    return (floors.lenses ?? 0.30) * 100;
  }, [pricingVersions, catalogType]);

  const [lensRows, setLensRows] = useState<Map<string, CatalogRow[]>>(new Map());
  const [addonRows, setAddonRows] = useState<Map<string, CatalogRow[]>>(new Map());
  const [supplyRows, setSupplyRows] = useState<Map<string, CatalogRow[]>>(new Map());
  const [isDirty, setIsDirty] = useState(false);
  const [editingDesc, setEditingDesc] = useState<{key: string;value: string;} | null>(null);
  const [editingPrice, setEditingPrice] = useState<{key: string;value: string;} | null>(null);
  const [sortState, setSortState] = useState<Map<string, {col: string;dir: SortDir;}>>(new Map());
  const [hasViewed, setHasViewed] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [editingSectionName, setEditingSectionName] = useState<{oldName: string; value: string; rowType: "lens"|"addon"|"supply"} | null>(null);

  const [lensPickerOpen, setLensPickerOpen] = useState(false);
  const [supplyPickerOpen, setSupplyPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    section: string;rowKey: string;
    mode: "cell" | "add-lens" | "add-addon" | "add-supply";
    addonSection?: string;
  } | null>(null);

  // Line override dialog state
  const [overrideTarget, setOverrideTarget] = useState<{
    referenceType: string;
    referenceId: string;
    itemName: string;
    cost: number | null;
    currentPrice: number | null;
    sectionType: string;
  } | null>(null);

  const CATALOG_TO_SECTION_LABEL: Record<string, string> = {
    rx: "RX Lens Prices",
    stock: "Stock Lens Prices",
    buysell: "Supplies Prices"
  };

  const rxGroupingMap = useMemo(() => new Map(rxStructure.map((grouping) => [grouping.key, grouping])), [rxStructure]);
  const rxCategoryMap = useMemo(() => new Map(rxStructure.flatMap((grouping) => grouping.categories.map((category) => [`${grouping.key}::${category.key}`, { grouping, category }] as const))), [rxStructure]);

  const isLoading = lLoading || aLoading || sLoading || rowsLoading;
  const hasPending = (pendingMatrixRowKeys?.size ?? 0) > 0;

  // Mark as viewed when tab is opened
  useEffect(() => {
    setHasViewed(true);
  }, []);

  // When savedRows changes, reset local state from DB
  useEffect(() => {
    if (!versionId) {setLensRows(new Map());setAddonRows(new Map());setSupplyRows(new Map());setIsDirty(false);return;}
    if (!savedRows) return;
    if (savedRows.length === 0) {setLensRows(new Map());setAddonRows(new Map());setSupplyRows(new Map());setIsDirty(false);return;}
    const newLens = new Map<string, CatalogRow[]>();
    const newAddon = new Map<string, CatalogRow[]>();
    const newSupply = new Map<string, CatalogRow[]>();
    const lensMap = new Map((allLenses ?? []).map((l) => [l.id, l]));
    const addonMap = new Map((allAddons ?? []).map((a) => [a.id, a]));
    const supplyMap = new Map((allSupplies ?? []).map((s) => [s.id, s]));
    for (const r of savedRows) {
      const linkedLens = r.item_id && r.row_type === "lens" ? lensMap.get(r.item_id) : undefined;
      const linkedAddon = r.item_id && r.row_type === "addon" ? addonMap.get(r.item_id) : undefined;
      const linkedSupply = r.item_id && r.row_type === "supply" ? supplyMap.get(r.item_id) : undefined;
      // Compute margin from linked item cost
      let itemCost: number | null = null;
      if (linkedLens) itemCost = linkedLens.base_price * 2; // landed cost approx
      else if (linkedAddon) itemCost = linkedAddon.cost;else
      if (linkedSupply) itemCost = linkedSupply.base_price * 2;
      const sellPrice = r.bbd_price;
      const computedMargin = itemCost != null && itemCost > 0 && sellPrice != null && sellPrice > 0 ?
      parseFloat(((sellPrice - itemCost) / sellPrice * 100).toFixed(1)) :
      null;
      const parsedMatrixKey = parseMatrixRowKey(r.row_key);
      const mappedMatrixMeta = parsedMatrixKey ? rxCategoryMap.get(`${parsedMatrixKey.groupKey}::${parsedMatrixKey.categoryKey}`) : null;
      const derivedSection = mappedMatrixMeta ? buildMatrixSectionLabel(mappedMatrixMeta.grouping.name, mappedMatrixMeta.category.name) : r.section;
      const row: CatalogRow = {
        key: r.row_key,
        section: derivedSection,
        description: r.display_description,
        bbd: r.bbd_price,
        usd: r.bbd_price !== null ? r.bbd_price * fxRate : null,
        margin: computedMargin,
        lensId: r.row_type === "lens" ? r.item_id ?? undefined : undefined,
        addonId: r.row_type === "addon" ? r.item_id ?? undefined : undefined,
        supplyId: r.row_type === "supply" ? r.item_id ?? undefined : undefined,
        matrixCell: mappedMatrixMeta && parsedMatrixKey ? `${mappedMatrixMeta.grouping.name} – ${mappedMatrixMeta.category.name} – ${parsedMatrixKey.material}` : r.row_key.startsWith("matrix::") ? r.row_key.replace("matrix::", "").replace(/::/g, " – ") : undefined,
        supplier: linkedLens?.supplier?.abbrev || linkedLens?.supplier?.name || linkedAddon?.supplier_name || linkedSupply?.supplier_name || ""
      };
      if (r.row_type === "lens") {const arr = newLens.get(derivedSection) ?? [];arr.push(row);newLens.set(derivedSection, arr);} else
      if (r.row_type === "addon") {const arr = newAddon.get(r.section) ?? [];arr.push(row);newAddon.set(r.section, arr);} else
      {const arr = newSupply.get(r.section) ?? [];arr.push(row);newSupply.set(r.section, arr);}
    }
    setLensRows(newLens);setAddonRows(newAddon);setSupplyRows(newSupply);setIsDirty(false);
  }, [savedRows, versionId, allLenses, allAddons, allSupplies, fxRate, rxCategoryMap]);

  /* ── Default rows from catalog ── */
  const defaultLensRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const map = new Map<string, CatalogRow[]>();
    if (lensFilter === "none" || catalogType === "buysell") return map;
    const plLenses = (allLenses ?? []).filter((l) => {
      if (!l.is_active) return false;
      if (lensFilter === "wspl") return l.show_in_ws_pricelist && l.sell_price > 0;
      if (lensFilter === "web") return l.show_on_website && l.sell_price > 0;
      return l.show_in_pricelist && l.sell_price > 0;
    });
    if (catalogType === "stock") {
      const mfGroups = new Map<string, typeof plLenses>();
      for (const l of plLenses) {
        const mf = l.mftype?.name || "Standard";
        if (!mfGroups.has(mf)) mfGroups.set(mf, []);
        mfGroups.get(mf)!.push(l);
      }
      for (const [mf, lenses] of mfGroups) {
        map.set(mf, lenses.map((l) => ({ key: `lens-${l.id}`, section: mf, description: l.name, bbd: l.sell_price, usd: l.sell_price * fxRate, margin: l.base_price > 0 ? parseFloat(((l.sell_price - l.base_price * 2) / l.sell_price * 100).toFixed(1)) : null, lensId: l.id, supplier: l.supplier?.abbrev || l.supplier?.name || "" })));
      }
    } else {
      const finishGroups = new Map<string, Map<string, typeof plLenses>>();
      for (const l of plLenses) {
        const finish = l.finishtype?.name || "Finished";
        const mf = l.mftype?.name || "Standard";
        if (!finishGroups.has(finish)) finishGroups.set(finish, new Map());
        const mfMap = finishGroups.get(finish)!;
        if (!mfMap.has(mf)) mfMap.set(mf, []);
        mfMap.get(mf)!.push(l);
      }
      for (const [finish, mfMap] of finishGroups) {
        for (const [mf, lenses] of mfMap) {
          const key = `${finish} — ${mf}`;
          map.set(key, lenses.map((l) => ({ key: `lens-${l.id}`, section: key, description: l.name, bbd: l.sell_price, usd: l.sell_price * fxRate, margin: l.base_price > 0 ? parseFloat(((l.sell_price - l.base_price * 2) / l.sell_price * 100).toFixed(1)) : null, lensId: l.id, supplier: l.supplier?.abbrev || l.supplier?.name || "" })));
        }
      }
    }
    return map;
  }, [allLenses, fxRate, catalogType, lensFilter]);

  const defaultAddonRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const map = new Map<string, CatalogRow[]>();
    if (!showTreatmentsAddons || catalogType === "buysell" || catalogType === "stock") return map;
    const active = (allAddons ?? []).filter((a) => a.is_active);
    const cats = [...new Set(active.map((a) => a.category))].sort();
    for (const cat of cats) {
      const items = active.filter((a) => a.category === cat);
      if (!items.length) continue;
      map.set(cat, items.map((a) => ({ key: `addon-${a.id}`, section: cat, description: a.name + (a.description ? ` — ${a.description}` : ""), bbd: a.price, usd: a.price * fxRate, margin: a.cost > 0 ? parseFloat(((a.price - a.cost) / a.price * 100).toFixed(1)) : null, addonId: a.id, supplier: a.supplier_name || "" })));
    }
    return map;
  }, [allAddons, fxRate, showTreatmentsAddons, catalogType]);

  const defaultSupplyRows = useMemo<Map<string, CatalogRow[]>>(() => {
    const map = new Map<string, CatalogRow[]>();
    if (catalogType !== "buysell") return map;
    const active = (allSupplies ?? []).filter((s) => s.is_active && s.show_in_pricelist && s.sell_price > 0);
    const cats = [...new Set(active.map((s) => s.category))].sort();
    for (const cat of cats) {
      const items = active.filter((s) => s.category === cat);
      if (!items.length) continue;
      map.set(cat, items.map((s) => ({ key: `supply-${s.id}`, section: cat, description: s.name + (s.description ? ` — ${s.description}` : ""), bbd: s.sell_price, usd: s.sell_price * fxRate, margin: s.base_price > 0 ? parseFloat(((s.sell_price - s.base_price * 2) / s.sell_price * 100).toFixed(1)) : null, supplyId: s.id, supplier: s.supplier_name || "" })));
    }
    return map;
  }, [allSupplies, fxRate, catalogType]);

  const usePersistedRows = useMemo(() => {
    if (!versionId || !savedRows) return false;
    if (catalogType === "buysell") return true;
    return savedRows.length > 0;
  }, [catalogType, savedRows, versionId]);
  const effectiveLensRows = useMemo<Map<string, CatalogRow[]>>(() => {if (usePersistedRows) return lensRows;const m = new Map(defaultLensRows);lensRows.forEach((r, s) => m.set(s, r));return m;}, [defaultLensRows, lensRows, usePersistedRows]);
  const effectiveAddonRows = useMemo<Map<string, CatalogRow[]>>(() => {if (usePersistedRows) return addonRows;const m = new Map(defaultAddonRows);addonRows.forEach((r, s) => m.set(s, r));return m;}, [defaultAddonRows, addonRows, usePersistedRows]);
  const effectiveSupplyRows = useMemo<Map<string, CatalogRow[]>>(() => {if (usePersistedRows) return supplyRows;const m = new Map(defaultSupplyRows);supplyRows.forEach((r, s) => m.set(s, r));return m;}, [defaultSupplyRows, supplyRows, usePersistedRows]);

  const toggleSort = (section: string, col: string) => {
    setSortState((prev) => {const next = new Map(prev);const cur = prev.get(section);if (!cur || cur.col !== col) {next.set(section, { col, dir: "asc" });} else if (cur.dir === "asc") {next.set(section, { col, dir: "desc" });} else {next.set(section, { col: "", dir: null });}return next;});
  };

  const sortedRows = useCallback((section: string, rows: CatalogRow[]): CatalogRow[] => {
    const s = sortState.get(section);
    if (!s || !s.dir || !s.col) return rows;
    return [...rows].sort((a, b) => {
      let aVal: any, bVal: any;
      if (s.col === "description") {aVal = a.description;bVal = b.description;} else
      if (s.col === "bbd") {aVal = a.bbd ?? -Infinity;bVal = b.bbd ?? -Infinity;} else
      if (s.col === "usd") {aVal = a.usd ?? -Infinity;bVal = b.usd ?? -Infinity;} else
      if (s.col === "margin") {aVal = a.margin ?? -Infinity;bVal = b.margin ?? -Infinity;} else
      return 0;
      if (typeof aVal === "string") return s.dir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return s.dir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [sortState]);

  /* ── Description editing ── */
  const commitDesc = (type: "lens" | "addon" | "supply", section: string, rowKey: string, value: string) => {
    const setter = type === "lens" ? setLensRows : type === "addon" ? setAddonRows : setSupplyRows;
    const effectiveMap = type === "lens" ? effectiveLensRows : type === "addon" ? effectiveAddonRows : effectiveSupplyRows;
    setter((prev) => {const next = new Map(prev);const rows = [...(effectiveMap.get(section) ?? [])];const idx = rows.findIndex((r) => r.key === rowKey);if (idx !== -1) rows[idx] = { ...rows[idx], description: value };next.set(section, rows);return next;});
    setEditingDesc(null);setIsDirty(true);
  };

  const buildPersistedRows = useCallback((): Omit<PricelistCatalogRow, "id">[] => {
    if (!versionId) return [];

    let sortOrder = 0;
    const rows: Omit<PricelistCatalogRow, "id">[] = [];

    for (const [sec, secRows] of effectiveLensRows) {
      for (const r of secRows) {
        rows.push({
          pricelist_version_id: versionId,
          catalog_type: catalogType,
          row_key: r.key,
          row_type: "lens",
          section: sec,
          display_description: r.description,
          bbd_price: r.bbd,
          item_id: r.lensId ?? null,
          sort_order: sortOrder++,
        });
      }
    }

    for (const [sec, secRows] of effectiveAddonRows) {
      for (const r of secRows) {
        rows.push({
          pricelist_version_id: versionId,
          catalog_type: catalogType,
          row_key: r.key,
          row_type: "addon",
          section: sec,
          display_description: r.description,
          bbd_price: r.bbd,
          item_id: r.addonId ?? null,
          sort_order: sortOrder++,
        });
      }
    }

    for (const [sec, secRows] of effectiveSupplyRows) {
      for (const r of secRows) {
        rows.push({
          pricelist_version_id: versionId,
          catalog_type: catalogType,
          row_key: r.key,
          row_type: "supply",
          section: sec,
          display_description: r.description,
          bbd_price: r.bbd,
          item_id: r.supplyId ?? null,
          sort_order: sortOrder++,
        });
      }
    }

    return rows;
  }, [catalogType, effectiveAddonRows, effectiveLensRows, effectiveSupplyRows, versionId]);

  const persistedRowsPreview = useMemo(() => buildPersistedRows(), [buildPersistedRows]);
  const lastEmittedRowsSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!onRowsChange) return;
    const nextSignature = JSON.stringify(persistedRowsPreview);
    if (lastEmittedRowsSignatureRef.current === nextSignature) return;
    lastEmittedRowsSignatureRef.current = nextSignature;
    onRowsChange(persistedRowsPreview);
  }, [onRowsChange, persistedRowsPreview]);

  const syncMatrixLinkedRow = async (
    row: CatalogRow,
    section: string,
    nextPrice: number | null,
    rowType: "lens" | "addon" | "supply"
  ) => {
    const currentSortOrder = buildPersistedRows().find((saved) => saved.row_key === row.key)?.sort_order
      ?? savedRows?.find((saved) => saved.row_key === row.key)?.sort_order
      ?? 0;
    await upsertCatalogRow.mutateAsync({
      row_key: row.key,
      row_type: rowType,
      section,
      display_description: row.description,
      bbd_price: nextPrice,
      item_id: row.lensId ?? row.addonId ?? row.supplyId ?? null,
      sort_order: currentSortOrder,
    });

    const matrixCell = parseMatrixRowKey(row.key);
    if (matrixCell && row.lensId) {
      await upsertMatrixAllocation.mutateAsync({
        category: matrixCell.categoryKey,
        material_index: matrixCell.material,
        treatment_type: matrixCell.groupKey,
        lens_id: row.lensId,
        allocated_price_bbd: nextPrice,
      });
    }
  };

  const clearMatrixLinkedRow = async (rowKey: string) => {
    const matrixCell = parseMatrixRowKey(rowKey);
    if (!matrixCell) return false;

    const allocation = allocations.find((entry) =>
      entry.treatment_type === matrixCell.groupKey &&
      entry.category === matrixCell.categoryKey &&
      entry.material_index === matrixCell.material
    );

    if (allocation) {
      await deleteMatrixAllocation.mutateAsync(allocation.id);
    }

    await deleteCatalogRow.mutateAsync(rowKey);
    return true;
  };

  const commitPrice = async (
    row: CatalogRow,
    section: string,
    rowType: "lens" | "addon" | "supply",
    rawValue: string
  ) => {
    const trimmed = rawValue.trim();
    const nextPrice = trimmed === "" ? null : Number(trimmed);
    if (trimmed !== "" && Number.isNaN(nextPrice)) {
      toast({ title: "Invalid price", description: "Enter a valid numeric price.", variant: "destructive" });
      return;
    }

    const setter = rowType === "lens" ? setLensRows : rowType === "addon" ? setAddonRows : setSupplyRows;
    const effectiveMap = rowType === "lens" ? effectiveLensRows : rowType === "addon" ? effectiveAddonRows : effectiveSupplyRows;

    setter((prev) => {
      const next = new Map(prev);
      const rows = [...(effectiveMap.get(section) ?? [])];
      const idx = rows.findIndex((candidate) => candidate.key === row.key);
      if (idx !== -1) {
        rows[idx] = {
          ...rows[idx],
          bbd: nextPrice,
          usd: nextPrice != null ? nextPrice * fxRate : null,
        };
        next.set(section, rows);
      }
      return next;
    });

    setEditingPrice(null);
    setIsDirty(true);

    if (row.key.startsWith("matrix::")) {
      try {
        await syncMatrixLinkedRow(row, section, nextPrice, rowType);
        setIsDirty(false);
      } catch (error: any) {
        toast({
          title: "Live sync failed",
          description: error?.message || "The list price changed locally but did not sync to the matrix.",
          variant: "destructive",
        });
      }
    }
  };

  /* ── Picker handlers ── */
  const handleLensPick = (item: PickedItem) => {
    if (!pickerTarget) return;
    const { section, rowKey, mode } = pickerTarget;
    if (mode === "cell" && item.type === "lens") {
      const currentRow = (effectiveLensRows.get(section) ?? []).find((row) => row.key === rowKey);
      const nextRow = currentRow ? {
        ...currentRow,
        description: item.name,
        bbd: item.sell_price,
        usd: item.sell_price * fxRate,
        lensId: item.id,
      } : null;

      setLensRows((prev) => {
        const next = new Map(prev);
        const rows = [...(effectiveLensRows.get(section) ?? [])];
        const idx = rows.findIndex((r) => r.key === rowKey);
        if (idx !== -1 && nextRow) rows[idx] = nextRow;
        next.set(section, rows);
        return next;
      });
      setIsDirty(true);

      if (nextRow?.key.startsWith("matrix::")) {
        void syncMatrixLinkedRow(nextRow, section, nextRow.bbd, "lens")
          .then(() => setIsDirty(false))
          .catch((error: any) => {
            toast({
              title: "Live sync failed",
              description: error?.message || "The linked lens changed locally but did not sync to the matrix.",
              variant: "destructive",
            });
          });
      }
    } else if (mode === "add-lens" && item.type === "lens") {
      const newRow: CatalogRow = { key: `lens-${item.id}-${Date.now()}`, section, description: item.name, bbd: item.sell_price, usd: item.sell_price * fxRate, margin: null, lensId: item.id };
      setLensRows((prev) => {const next = new Map(prev);next.set(section, [...(effectiveLensRows.get(section) ?? []), newRow]);return next;});
      setIsDirty(true);
    } else if (mode === "add-addon" && item.type === "addon") {
      const target = pickerTarget.addonSection ?? "ADD ONS";
      const newRow: CatalogRow = { key: `addon-${item.id}-${Date.now()}`, section: target, description: item.name + ((item as any).description ? ` — ${(item as any).description}` : ""), bbd: (item as any).price ?? 0, usd: ((item as any).price ?? 0) * fxRate, margin: null, addonId: item.id };
      setAddonRows((prev) => {const next = new Map(prev);next.set(target, [...(effectiveAddonRows.get(target) ?? []), newRow]);return next;});
      setIsDirty(true);
    }
  };

  const handleSupplyPick = (item: PickedSupply) => {
    if (!pickerTarget) return;
    const targetSection = item.category?.trim() || "Uncategorized";
    const newRow: CatalogRow = { key: `supply-${item.id}-${Date.now()}`, section: targetSection, description: item.name + (item.description ? ` — ${item.description}` : ""), bbd: item.sell_price, usd: item.sell_price * fxRate, margin: null, supplyId: item.id };
    setSupplyRows((prev) => {const next = new Map(prev);next.set(targetSection, [...(effectiveSupplyRows.get(targetSection) ?? []), newRow]);return next;});
    setIsDirty(true);
  };

  const removeRow = async (section: string, rowKey: string, type: "lens" | "addon" | "supply") => {
    const removeLocalRow = () => {
      if (type === "supply") setSupplyRows((prev) => {const next = new Map(prev);next.set(section, (effectiveSupplyRows.get(section) ?? []).filter((r) => r.key !== rowKey));return next;});else
      if (type === "addon") setAddonRows((prev) => {const next = new Map(prev);next.set(section, (effectiveAddonRows.get(section) ?? []).filter((r) => r.key !== rowKey));return next;});else
      setLensRows((prev) => {const next = new Map(prev);next.set(section, (effectiveLensRows.get(section) ?? []).filter((r) => r.key !== rowKey));return next;});
    };

    if (type === "lens" && rowKey.startsWith("matrix::")) {
      try {
        await clearMatrixLinkedRow(rowKey);
        removeLocalRow();
        setIsDirty(false);
        toast({ title: "Row removed", description: "Cleared the linked matrix cell and deleted the list row." });
      } catch (error: any) {
        toast({
          title: "Delete failed",
          description: error?.message || "The list row could not be removed from the matrix.",
          variant: "destructive",
        });
      }
      return;
    }

    removeLocalRow();
    setIsDirty(true);
  };

  const moveRow = (section: string, rowKey: string, direction: "up" | "down", type: "lens" | "addon" | "supply") => {
    const setter = type === "lens" ? setLensRows : type === "addon" ? setAddonRows : setSupplyRows;
    const effectiveMap = type === "lens" ? effectiveLensRows : type === "addon" ? effectiveAddonRows : effectiveSupplyRows;
    setter((prev) => {
      const next = new Map(prev);
      const rows = [...(effectiveMap.get(section) ?? [])];
      const idx = rows.findIndex((r) => r.key === rowKey);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= rows.length) return prev;
      [rows[idx], rows[swapIdx]] = [rows[swapIdx], rows[idx]];
      next.set(section, rows);
      return next;
    });
    setIsDirty(true);
  };

  /* ── Group management ── */
  const removeSection = (sectionName: string, rowType: "lens" | "addon" | "supply", force = false) => {
    const effectiveMap = rowType === "lens" ? effectiveLensRows : rowType === "addon" ? effectiveAddonRows : effectiveSupplyRows;
    const setter = rowType === "lens" ? setLensRows : rowType === "addon" ? setAddonRows : setSupplyRows;
    const rowsInSection = effectiveMap.get(sectionName) ?? [];
    if (!force && rowsInSection.length > 0) {
      const ok = window.confirm(`"${sectionName}" has ${rowsInSection.length} item(s). Remove this group and all of its items?`);
      if (!ok) return;
    }
    setter(() => {
      const next = new Map(effectiveMap);
      next.delete(sectionName);
      return next;
    });
    setIsDirty(true);
  };

  const renameSection = (oldName: string, newName: string, rowType: "lens" | "addon" | "supply") => {
    const trimmed = newName.trim();
    if (!trimmed) {
      const shouldRemove = window.confirm("Group name is empty. Do you want to remove this group?");
      if (shouldRemove) removeSection(oldName, rowType, true);
      setEditingSectionName(null);
      return;
    }
    if (trimmed === oldName) { setEditingSectionName(null); return; }
    const effectiveMap = rowType === "lens" ? effectiveLensRows : rowType === "addon" ? effectiveAddonRows : effectiveSupplyRows;
    const setter = rowType === "lens" ? setLensRows : rowType === "addon" ? setAddonRows : setSupplyRows;
    setter(() => {
      const next = new Map<string, CatalogRow[]>();
      for (const [key, rows] of effectiveMap) {
        if (key === oldName) {
          next.set(trimmed, rows.map(r => ({...r, section: trimmed})));
        } else {
          next.set(key, rows);
        }
      }
      return next;
    });
    setEditingSectionName(null);
    setIsDirty(true);
  };

  const addNewGroup = (rowType: "lens" | "addon" | "supply") => {
    const effectiveMap = rowType === "lens" ? effectiveLensRows : rowType === "addon" ? effectiveAddonRows : effectiveSupplyRows;
    const setter = rowType === "lens" ? setLensRows : rowType === "addon" ? setAddonRows : setSupplyRows;
    const name = "New Group";
    let uniqueName = name;
    let counter = 1;
    while (effectiveMap.has(uniqueName)) { uniqueName = `${name} ${counter++}`; }
    setter(() => {
      const next = new Map(effectiveMap);
      next.set(uniqueName, []);
      return next;
    });
    setEditingSectionName({oldName: uniqueName, value: "", rowType});
    setIsDirty(true);
  };

  const handleRestore = useCallback(() => {
    setLensRows(new Map());
    setAddonRows(new Map());
    setSupplyRows(new Map());
    setIsDirty(false);
    setEditingSectionName(null);
    toast({ title: "Restored", description: "Reverted to last saved state." });
  }, [toast]);

  /* ── Save to DB ── */
  const handleSave = async () => {
    if (!versionId) {toast({ title: "No version selected", variant: "destructive" });return;}
    const rows = buildPersistedRows();
    saveRows.mutate(rows, {
      onSuccess: () => {
        setIsDirty(false);
        onSaved?.();
        toast({ title: "Catalog saved", description: "All changes saved." });
      },
      onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" })
    });
  };

  /* ── Exports ── */
  const buildExportRows = () => {
    const all: any[] = [];
    const addSection = (sec: string, rows: CatalogRow[]) => {
      all.push({ isHeader: true, title: sec });
      for (const r of rows) all.push(r);
    };
    for (const [s, r] of effectiveSupplyRows) addSection(s, r);
    for (const [s, r] of effectiveLensRows) addSection(s, r);
    for (const [s, r] of effectiveAddonRows) addSection(s, r);
    return all;
  };

  const handleExcelExport = () => {
    const exportRows = buildExportRows();
    const headers = showUSD ? ["Description", "USD $ COST", "Margin %"] : ["Description", "BBD $ COST", "USD $ COST", "Margin %"];
    const data: any[][] = [[pageTitle], headers, ...exportRows.map((r: any) => r.isHeader ? [r.title, ...(showUSD ? ["", ""] : ["", "", ""])] : showUSD ? [r.description, r.usd !== null ? parseFloat(r.usd.toFixed(2)) : "", r.margin ?? ""] : [r.description, r.bbd ?? "", r.usd !== null ? parseFloat(r.usd.toFixed(2)) : "", r.margin ?? ""])];
    writeAoaWorkbook(data, "Catalog", `${pageTitle.replace(/\s+/g, "_")}.xlsx`);
    toast({ title: "Excel exported" });
  };

  const handleCSVExport = () => {
    const exportRows = buildExportRows();
    const header = showUSD ? "Description,USD $ COST,Margin %" : "Description,BBD $ COST,USD $ COST,Margin %";
    const lines = [header, ...exportRows.filter((r: any) => !r.isHeader).map((r: any) => showUSD ? [`"${r.description}"`, r.usd !== null ? r.usd.toFixed(2) : "", r.margin ?? ""].join(",") : [`"${r.description}"`, r.bbd ?? "", r.usd !== null ? r.usd.toFixed(2) : "", r.margin ?? ""].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");a.href = URL.createObjectURL(blob);a.download = `${pageTitle.replace(/\s+/g, "_")}.csv`;a.click();
    toast({ title: "CSV exported" });
  };

  const today = format(new Date(), "dd MMMM yyyy");

  const SortIcon = ({ section, col }: {section: string;col: string;}) => {
    const s = sortState.get(section);
    return <button className="ml-1 opacity-50 hover:opacity-100 transition-opacity no-print" onClick={(e) => {e.stopPropagation();toggleSort(section, col);}}><ArrowUpDown className="h-2.5 w-2.5 inline" style={{ color: s?.col === col && s.dir ? "hsl(215 65% 50%)" : "inherit" }} /></button>;
  };

  const getRowCost = (row: CatalogRow): number | null => {
    if (row.lensId) {
      const lens = (allLenses ?? []).find((l) => l.id === row.lensId);
      return lens ? lens.base_price * 2 : null;
    }
    if (row.addonId) {
      const addon = (allAddons ?? []).find((a) => a.id === row.addonId);
      return addon ? addon.cost : null;
    }
    if (row.supplyId) {
      const supply = (allSupplies ?? []).find((s) => s.id === row.supplyId);
      return supply ? supply.base_price * 2 : null;
    }
    return null;
  };

  const openOverride = (row: CatalogRow, rowType: string) => {
    const refId = row.lensId || row.addonId || row.supplyId;
    if (!refId) return;
    setOverrideTarget({
      referenceType: rowType,
      referenceId: refId,
      itemName: row.description,
      cost: getRowCost(row),
      currentPrice: row.bbd,
      sectionType: CATALOG_TO_SECTION_LABEL[catalogType] ?? "RX Lens Prices"
    });
  };

  const renderRow = (row: CatalogRow, i: number, rowType: "lens" | "addon" | "supply", section: string, totalRows?: number) => {
    const isEditingThisDesc = editingDesc?.key === row.key;
    const isEditingThisPrice = editingPrice?.key === row.key;
    const isPending = pendingMatrixRowKeys?.has(row.key);
    const showReorder = true;
    const rowCost = getRowCost(row);

    // Check for line-level override
    const refId = row.lensId || row.addonId || row.supplyId;
    const refType = row.lensId ? "lens" : row.addonId ? "addon" : row.supplyId ? "supply" : "";
    const isOverridden = refId && refType ? hasOverride(refId, refType) : false;
    const overrideData = isOverridden ? lineOverrides.find(o => o.reference_id === refId && o.reference_type === refType) : null;

    // Use override price if present
    const displayBbd = isOverridden && overrideData?.overridden_price_bbd != null ? overrideData.overridden_price_bbd : row.bbd;
    const displayUsd = displayBbd !== null ? displayBbd * fxRate : null;
    const displayMargin = rowCost != null && rowCost > 0 && displayBbd != null && displayBbd > 0
      ? parseFloat(((displayBbd - rowCost) / displayBbd * 100).toFixed(1))
      : row.margin;

    return (
      <tr key={row.key} className="group/row" style={{ background: isPending ? "hsl(var(--admin-table-row-pending))" : i % 2 === 0 ? "hsl(var(--admin-table-row-even))" : "hsl(var(--admin-table-row-odd))" }}>
        {/* Reorder arrows for addon/supply rows */}
        {showReorder &&
        <td className="border border-border p-0 no-print w-8">
            <div className="flex flex-col items-center opacity-0 group-hover/row:opacity-100 transition-opacity">
              <button className="p-0.5 hover:bg-muted/50 disabled:opacity-20" disabled={i === 0} onClick={() => moveRow(section, row.key, "up", rowType)}>
                <ArrowUp className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
              <button className="p-0.5 hover:bg-muted/50 disabled:opacity-20" disabled={totalRows != null && i >= totalRows - 1} onClick={() => moveRow(section, row.key, "down", rowType)}>
                <ArrowDown className="h-2.5 w-2.5 text-muted-foreground" />
              </button>
            </div>
          </td>
        }
        {/* Supplier — before description */}
        <td
          className="px-2 py-1.5 border border-border text-center align-top"
          style={{ color: "hsl(var(--admin-table-supplier-fg))", fontSize: "10px", minWidth: "72px", maxWidth: "140px", whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.2 }}
          title={row.supplier || "—"}
        >
          {row.supplier || "—"}
        </td>
        <td className="px-3 py-1.5 border border-border group relative" style={{ color: "hsl(var(--admin-table-fg))" }}>
          <div className="flex items-center gap-1">
            {isPending && <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" title="Pending — save to confirm" />}
            {isEditingThisDesc ?
            <input autoFocus className="flex-1 text-xs border rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary/30" value={editingDesc.value}
            onChange={(e) => setEditingDesc({ key: row.key, value: e.target.value })}
            onBlur={() => commitDesc(rowType, section, row.key, editingDesc.value)}
            onKeyDown={(e) => {if (e.key === "Enter") commitDesc(rowType, section, row.key, editingDesc.value);if (e.key === "Escape") setEditingDesc(null);}} /> :

            <span className="flex-1 truncate cursor-text hover:bg-primary/5 rounded px-0.5" title="Click to edit description" onClick={() => setEditingDesc({ key: row.key, value: row.description })}>{row.description}</span>
            }
            {rowType === "lens" && !isEditingThisDesc &&
            <button className="opacity-0 group-hover:opacity-100 transition-opacity no-print shrink-0" title="Change linked lens" onClick={() => {setPickerTarget({ section, rowKey: row.key, mode: "cell" });setLensPickerOpen(true);}}>
                <Search className="h-3 w-3" style={{ color: "hsl(var(--admin-table-link-fg))" }} />
              </button>
            }
          </div>
          {row.lensId && <div className="text-[9px] mt-0.5" style={{ color: "hsl(var(--admin-table-link-fg))" }}>↳ linked lens</div>}
          {row.supplyId && <div className="text-[9px] mt-0.5" style={{ color: "hsl(var(--admin-table-link-supply-fg))" }}>↳ linked supply</div>}
        </td>
        {/* Matrix Cell — screen-only, hidden on print/export — BEFORE BBD */}
        <td className="px-2 py-1.5 border border-border no-print max-w-[160px]" style={{ color: "hsl(var(--admin-table-matrix-fg))", fontSize: "10px" }}>
          {row.matrixCell ?
          <span className="truncate block" title={row.matrixCell}>{row.matrixCell}</span> :
          "—"}
        </td>
        {/* BBD always visible in editor */}
        <td className={`px-3 py-1.5 text-right border border-border font-medium ${showUSD ? "opacity-50" : ""}`} style={{ background: isOverridden ? "hsl(var(--admin-table-col-override))" : "hsl(var(--admin-table-col-bbd))", color: isOverridden ? "hsl(var(--admin-table-col-override-fg))" : "hsl(var(--admin-table-col-bbd-fg))" }}>
          <div className="flex items-center justify-end gap-1">
            {isOverridden && (
              <span title={`Override: $${displayBbd?.toFixed(2)} (was $${row.bbd?.toFixed(2)})`}>
                <Link2Off className="h-3 w-3 inline-block" style={{ color: "hsl(var(--admin-table-col-override-fg))" }} />
              </span>
            )}
            {isEditingThisPrice ?
            <input
              autoFocus
              className="w-24 rounded border px-1 py-0.5 text-right text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30"
              value={editingPrice.value}
              onChange={(e) => setEditingPrice({ key: row.key, value: e.target.value })}
              onBlur={() => commitPrice(row, section, rowType, editingPrice.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPrice(row, section, rowType, editingPrice.value);
                if (e.key === "Escape") setEditingPrice(null);
              }}
            /> :
            <button
              type="button"
              className="rounded px-1 py-0.5 transition-colors hover:bg-primary/10"
              title={row.key.startsWith("matrix::") ? "Edit price and sync to the matrix immediately" : "Edit price"}
              onClick={() => setEditingPrice({ key: row.key, value: displayBbd != null ? displayBbd.toFixed(2) : "" })}
            >
              {displayBbd !== null ? `$${displayBbd.toFixed(2)}` : "—"}
            </button>
            }
          </div>
        </td>
        <td className="px-3 py-1.5 text-right border border-border font-medium" style={{ background: "hsl(var(--admin-table-col-usd))", color: "hsl(var(--admin-table-col-usd-fg))" }}>
          {displayUsd !== null ? `$${displayUsd.toFixed(2)}` : "—"}
        </td>
        <td className="px-3 py-1.5 text-center border border-border no-print">
          <MarginBadge
            marginPercent={displayMargin}
            cost={rowCost}
            sellPrice={displayBbd}
            itemName={row.description}
            marginFloor={marginFloorPercent} />

        </td>
        {/* Pencil override icon */}
        <td className="border border-border p-0 no-print w-7">
          {(row.lensId || row.addonId || row.supplyId) && versionId &&
          <button
            className="w-full h-full flex items-center justify-center p-1 hover:bg-primary/10 transition-colors"
            title="Override price for this line"
            onClick={() => openOverride(row, rowType)}>

              <Pencil className="h-3 w-3" style={{ color: isOverridden ? "hsl(var(--admin-table-col-override-fg))" : "hsl(var(--admin-table-link-fg))" }} />
            </button>
          }
        </td>
        <td className="border border-border p-0 no-print">
          <button className="w-full h-full flex items-center justify-center p-1 hover:bg-destructive/10 transition-colors" onClick={() => removeRow(section, row.key, rowType)}>
            <X className="h-3 w-3 text-destructive/60 hover:text-destructive" />
          </button>
        </td>
      </tr>);

  };

  const renderSection = (title: string, rows: CatalogRow[], rowType: "lens" | "addon" | "supply") => {
    const displayRows = sortedRows(title, rows);
    const isEditingThisSection = editingSectionName?.oldName === title;
    const isUnnamed = !title.trim() || title.startsWith("New Group");
    return (
      <AccordionItem key={title} value={title} className="mt-3 px-2 border-none">
        <div className={`flex items-center justify-between px-4 py-2 mb-0.5 ${isUnnamed ? 'ring-2 ring-destructive/50 ring-inset' : ''}`} style={{ background: BLUE_BG, color: "white" }}>
          <AccordionTrigger className="p-0 hover:no-underline gap-2 font-bold text-sm uppercase tracking-wide [&>svg]:text-white flex-1 justify-start">
            {isEditingThisSection ? (
              <input
                autoFocus
                className="bg-white/20 text-white placeholder:text-white/50 border border-white/30 rounded px-2 py-0.5 text-sm font-bold uppercase w-48 outline-none"
                value={editingSectionName.value}
                placeholder="Enter group name..."
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditingSectionName({...editingSectionName, value: e.target.value})}
                onBlur={() => renameSection(title, editingSectionName.value, rowType)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") renameSection(title, editingSectionName.value, rowType);
                  if (e.key === "Escape") setEditingSectionName(null);
                }}
              />
            ) : (
              <span
                className="cursor-text hover:bg-white/10 rounded px-1 -mx-1 transition-colors"
                title="Click to rename group"
                onClick={(e) => { e.stopPropagation(); setEditingSectionName({oldName: title, value: title, rowType}); }}
              >
                {title}
                {isUnnamed && <span className="ml-2 text-[10px] font-normal normal-case text-red-200">⚠ Name required</span>}
              </span>
            )}
            <span className="text-[10px] font-normal normal-case tracking-normal opacity-70 ml-2">({displayRows.length})</span>
          </AccordionTrigger>
          <div className="flex items-center gap-1.5">
            {(displayRows.length === 0 || isUnnamed) && (
              <button
                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-red-500/30 hover:bg-red-500/50 transition-colors no-print"
                onClick={(e) => { e.stopPropagation(); removeSection(title, rowType); }}
              >
                <X className="h-3 w-3" /> Remove
              </button>
            )}
            <button className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors no-print"
            onClick={(e) => {e.stopPropagation();setPickerTarget({ section: title, rowKey: "", mode: rowType === "supply" ? "add-supply" : rowType === "addon" ? "add-addon" : "add-lens", addonSection: rowType === "addon" ? title : undefined });if (rowType === "supply") setSupplyPickerOpen(true);else setLensPickerOpen(true);}}>
              <Plus className="h-3 w-3" /> Add Line
            </button>
          </div>
        </div>
        <AccordionContent className="pb-0 pt-0">
          {displayRows.length === 0 ?
          <p className="text-xs text-muted-foreground px-3 py-3 italic">{catalogType === "stock" ? "No lens selected — click \"+ Add Line\" to add." : "No items — click \"Add Line\" to add."}</p> :

          <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-8 no-print border border-border" style={{ background: "hsl(var(--admin-table-subheader))" }} />
                  <th className="px-2 py-2 text-center font-semibold border border-border min-w-[72px] max-w-[140px]" style={{ background: "hsl(var(--admin-table-subheader))", color: "hsl(var(--admin-table-subheader-fg))", fontSize: "10px" }}>Supp.</th>
                  <th className="px-3 py-2 text-left font-semibold border border-border" style={{ background: "hsl(var(--admin-table-subheader))", color: "hsl(var(--admin-table-fg))" }}>Description <SortIcon section={title} col="description" /></th>
                  <th className="px-2 py-2 text-left font-semibold border border-border w-40 no-print" style={{ background: "hsl(var(--admin-table-subheader))", color: "hsl(var(--admin-table-subheader-fg))", fontSize: "10px" }}>
                    Matrix Cell
                  </th>
                  <th className={`px-3 py-2 text-right font-semibold border border-border w-28 ${showUSD ? "opacity-50" : ""}`} style={{ background: BLUE_BG, color: BLUE_TEXT }}>BBD <SortIcon section={title} col="bbd" /></th>
                  <th className="px-3 py-2 text-right font-semibold border border-border w-28" style={{ background: "hsl(var(--admin-table-col-usd))", color: "hsl(var(--admin-table-col-usd-fg))" }}>USD <SortIcon section={title} col="usd" /></th>
                  <th className="px-3 py-2 text-center font-semibold border border-border w-20 no-print" style={{ background: "hsl(var(--admin-table-col-margin))", color: "hsl(var(--admin-table-col-margin-fg))" }}>Margin % <SortIcon section={title} col="margin" /></th>
                  <th className="w-7 no-print border border-border" title="Override" />
                  <th className="w-6 no-print border border-border" />
                </tr>
              </thead>
              <tbody>{displayRows.map((row, i) => renderRow(row, i, rowType, title, displayRows.length))}</tbody>
            </table>
          }
        </AccordionContent>
      </AccordionItem>);
  };


  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);else
      next.add(key);
      return next;
    });
  };

  const renderRxGrouped = () => {
    const categoryOrder = rxStructure.flatMap((grouping) => grouping.categories.map((category) => category.name));
    const categoryMap = new Map<string, string[]>();

    for (const grouping of rxStructure) {
      for (const category of grouping.categories) {
        if (!categoryMap.has(category.name)) categoryMap.set(category.name, []);
        categoryMap.get(category.name)!.push(buildMatrixSectionLabel(grouping.name, category.name));
      }
    }

    for (const key of effectiveLensRows.keys()) {
      const parts = key.split(" — ");
      const category = parts.length > 1 ? parts.slice(1).join(" — ") : key;
      if (!categoryMap.has(category)) categoryMap.set(category, []);
      if (!categoryMap.get(category)!.includes(key)) categoryMap.get(category)!.push(key);
    }

    return [...categoryMap.entries()]
      .sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a[0]);
        const bIndex = categoryOrder.indexOf(b[0]);
        if (aIndex === -1 && bIndex === -1) return compareCategoryOrder(a[0], b[0]);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      .map(([category, sectionKeys]) => {
        const allRows = sectionKeys.flatMap((sectionKey) => effectiveLensRows.get(sectionKey) ?? []);
        const accKey = `cat::${category}`;
        const isOpen = openSections.has(accKey);
        const rowCount = allRows.length;
        const primarySectionKey = sectionKeys[0] ?? category;

        return (
          <div key={accKey} className="mt-4 border border-border overflow-hidden mx-[5px]">
            <div className="px-3 py-1.5 font-semibold text-xs uppercase tracking-wide flex items-center gap-2" style={{ background: "hsl(var(--admin-table-category-bg))", color: "hsl(var(--admin-table-category-fg))" }}>
              {category}
              <span className="ml-auto text-xs font-normal opacity-60">{rowCount} {rowCount === 1 ? "item" : "items"}</span>
            </div>
            <div className="border-t border-border">
              <button className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/30 transition-colors bg-muted/10" onClick={() => toggleSection(accKey)}>
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <span className="text-sm font-semibold text-foreground">{category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{rowCount} {rowCount === 1 ? "item" : "items"}</span>
                  <button
                    className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border border-border hover:bg-muted/50 transition-colors no-print"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPickerTarget({ section: primarySectionKey, rowKey: "", mode: "add-lens" });
                      setLensPickerOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3" /> Add Line
                  </button>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border">
                  {allRows.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-6 py-3 italic">No items yet — click "Add Line" to populate this category.</p>
                  ) : (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 text-center font-semibold border border-border min-w-[72px] max-w-[140px]" style={{ background: "hsl(var(--admin-table-subheader))", color: "hsl(var(--admin-table-subheader-fg))", fontSize: "10px" }}>Supp.</th>
                          <th className="px-3 py-2 text-left font-semibold border border-border" style={{ background: "hsl(var(--admin-table-subheader))", color: "hsl(var(--admin-table-fg))" }}>Description <SortIcon section={primarySectionKey} col="description" /></th>
                          <th className="px-2 py-2 text-left font-semibold border border-border w-40 no-print" style={{ background: "hsl(var(--admin-table-subheader))", color: "hsl(var(--admin-table-subheader-fg))", fontSize: "10px" }}>Matrix Cell</th>
                          <th className={`px-3 py-2 text-right font-semibold border border-border w-28 ${showUSD ? "opacity-50" : ""}`} style={{ background: BLUE_BG, color: BLUE_TEXT }}>BBD <SortIcon section={primarySectionKey} col="bbd" /></th>
                          <th className="px-3 py-2 text-right font-semibold border border-border w-28" style={{ background: "hsl(var(--admin-table-col-usd))", color: "hsl(var(--admin-table-col-usd-fg))" }}>USD <SortIcon section={primarySectionKey} col="usd" /></th>
                          <th className="px-3 py-2 text-center font-semibold border border-border w-20 no-print" style={{ background: "hsl(var(--admin-table-col-margin))", color: "hsl(var(--admin-table-col-margin-fg))" }}>Margin % <SortIcon section={primarySectionKey} col="margin" /></th>
                          <th className="w-7 no-print border border-border" title="Override" />
                          <th className="w-6 no-print border border-border" />
                        </tr>
                      </thead>
                      <tbody>{allRows.map((row, index) => renderRow(row, index, "lens", row.section))}</tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      });
  };

  const pendingCount = pendingMatrixRowKeys?.size ?? 0;
  const isSavingRows = saveRows.isPending;
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const saveBarContent = useMemo(() => (
    <div className="space-y-2 no-print">
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-1">
          {isDirty && !hasPending && <span className="text-xs" style={{ color: "hsl(38 92% 40%)" }}>⚠ Unsaved changes</span>}
          {hasPending && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
              {pendingCount} pending sync{pendingCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={handleRestore}>
              Restore
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            style={{ background: isDirty || hasPending ? "hsl(215 65% 50%)" : undefined }}
            variant={isDirty || hasPending ? "default" : "outline"}
            onClick={() => handleSaveRef.current()}
            disabled={isSavingRows}
          >
            {isSavingRows ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  ), [hasPending, isDirty, isSavingRows, pendingCount, handleRestore]);

  useEffect(() => {
    if (renderSaveBar) renderSaveBar(saveBarContent);
  }, [renderSaveBar, saveBarContent]);

  if (isLoading) return <div className="flex items-center justify-center h-40"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Inline save controls when no external saveBar handler */}
      {!renderSaveBar &&
      <div className="no-print">
          {saveBarContent}
        </div>
      }


      <div ref={printRef} className="catalog-print-area space-y-0 border">
        {/* Banner */}
        <div className="px-4 py-2.5 mb-4 border-primary/30 bg-primary/5 border-0">
          <h2 className="text-sm font-semibold text-primary tracking-wide">{pageName || pageTitle} List Editor</h2>
        </div>

        {catalogType === "buysell" && (
          <>
            <div className="flex items-center justify-end px-6 py-2 no-print">
              <button
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded border border-border hover:bg-muted/50 transition-colors"
                onClick={() => addNewGroup("supply")}
              >
                <Plus className="h-3 w-3" /> Add Group
              </button>
            </div>
            <Accordion type="multiple" defaultValue={[...effectiveSupplyRows.keys()]} className="space-y-0">
              {[...effectiveSupplyRows.entries()].map(([sec, rows]) => renderSection(sec, rows, "supply"))}
            </Accordion>
          </>
        )}
        {catalogType === "stock" && (() => {
          const activeMfTypes = mftypeRef.filter((m: any) => m.is_active).map((m: any) => m.name as string);
          const shownSections = new Set<string>();
          const items: { sec: string; rows: CatalogRow[] }[] = [];
          for (const [sec, rows] of effectiveLensRows) {
            shownSections.add(sec);
            items.push({ sec, rows });
          }
          for (const mfName of activeMfTypes) {
            if (!shownSections.has(mfName)) {
              items.push({ sec: mfName, rows: [] });
            }
          }
          return (
            <Accordion type="multiple" defaultValue={items.filter(i => i.rows.length > 0).map(i => i.sec)} className="space-y-0">
              {items.map(({ sec, rows }) => renderSection(sec, rows, "lens"))}
            </Accordion>
          );
        })()}
        {catalogType === "rx" && renderRxGrouped()}

        {showTreatmentsAddons && catalogType === "rx" &&
        <div className="mt-8 border-t-2 border-dashed border-border pt-4">
            <div className="flex items-center justify-between px-4 py-2 mb-2" style={{ background: "hsl(var(--admin-table-addon-header))", color: "hsl(var(--admin-table-addon-header-fg))" }}>
              <span className="text-xs font-bold tracking-wide">ADD-ONS & EXTRAS</span>
              <button
                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors no-print"
                onClick={() => addNewGroup("addon")}
              >
                <Plus className="h-3 w-3" /> Add Group
              </button>
            </div>
            {effectiveAddonRows.size > 0 ? (
              <Accordion type="multiple" defaultValue={[...effectiveAddonRows.keys()]} className="space-y-0">
                {[...effectiveAddonRows.entries()].map(([sec, rows]) => renderSection(sec, rows, "addon"))}
              </Accordion>
            ) : (
              <p className="text-xs text-muted-foreground px-4 py-4 italic">No add-on groups yet. Click "Add Group" to create one, or add-ons will auto-populate from active items.</p>
            )}
          </div>
        }

        <div className="mt-8 px-2 py-4 border-t border-border text-center">
          <p className="text-[10px] italic" style={{ color: "hsl(var(--admin-table-label-fg))" }}>
            {companySettings?.pdf_footer_html || "Prices subject to change without notice."} All prices in {showUSD ? "USD" : "BBD"} unless otherwise stated. {today}.
          </p>
        </div>
      </div>

      <LensPickerPopover open={lensPickerOpen} onOpenChange={setLensPickerOpen} onPick={handleLensPick} mode={pickerTarget?.mode === "add-addon" ? "all" : "lens-only"} currentId={null} hideFinished={catalogType === "rx"} wsplOnly={catalogType === "stock"} />
      <SupplyPickerPopover open={supplyPickerOpen} onOpenChange={setSupplyPickerOpen} onPick={handleSupplyPick} currentId={null} categoryFilter={null} />
      <LineOverrideDialog
        open={!!overrideTarget}
        onOpenChange={(v) => {if (!v) setOverrideTarget(null);}}
        versionId={versionId ?? null}
        sectionType={overrideTarget?.sectionType ?? ""}
        referenceType={overrideTarget?.referenceType ?? ""}
        referenceId={overrideTarget?.referenceId ?? ""}
        itemName={overrideTarget?.itemName ?? ""}
        cost={overrideTarget?.cost ?? null}
        currentPrice={overrideTarget?.currentPrice ?? null}
        marginFloor={marginFloorPercent} />

    </div>);

};

export default ListCatalogTab;
