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
import { useReferenceData } from "@/hooks/useReferenceData";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePriceHierarchy } from "@/hooks/usePriceHierarchy";
import { compareCategoryOrder } from "@/lib/sortOrder";
import { usePricingSettings } from "@/hooks/usePricingSettings";

const BLUE_BG = "#1e4db7";
const GREEN_BG = "#d4edda";
const BLUE_TEXT = "#fff";
const GREEN_TEXT = "#155724";
const LABEL = "hsl(215 15% 40%)";

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
  renderSaveBar
}: ListCatalogTabProps) => {
  const { data: allLenses, isLoading: lLoading } = useLenses();
  const { data: allAddons, isLoading: aLoading } = useAddons();
  const { data: allSupplies, isLoading: sLoading } = useSupplies();
  const { data: priceMatrixData } = usePriceMatrix();
  const { data: mftypeRef = [] } = useReferenceData("mftypes");
  const matrixCategories = useMemo(() => (priceMatrixData ?? []).map((r) => r.category), [priceMatrixData]);
  const { data: savedRows, isLoading: rowsLoading, saveRows } = usePricelistCatalogRows(
    versionId ?? null,
    catalogType
  );
  const { toast } = useToast();
  const { data: companySettings } = useCompanySettings();
  const { hasOverride, lineOverrides } = usePriceHierarchy(versionId);
  const { versions: pricingVersions } = usePricingSettings();
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
  const [sortState, setSortState] = useState<Map<string, {col: string;dir: SortDir;}>>(new Map());
  const [hasViewed, setHasViewed] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

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
      const row: CatalogRow = {
        key: r.row_key,
        section: r.section,
        description: r.display_description,
        bbd: r.bbd_price,
        usd: r.bbd_price !== null ? r.bbd_price * fxRate : null,
        margin: computedMargin,
        lensId: r.row_type === "lens" ? r.item_id ?? undefined : undefined,
        addonId: r.row_type === "addon" ? r.item_id ?? undefined : undefined,
        supplyId: r.row_type === "supply" ? r.item_id ?? undefined : undefined,
        matrixCell: r.row_key.startsWith("matrix::") ? r.row_key.replace("matrix::", "").replace(/::/g, " – ") : undefined,
        supplier: linkedLens?.supplier?.abbrev || linkedLens?.supplier?.name || linkedAddon?.supplier_name || linkedSupply?.supplier_name || ""
      };
      if (r.row_type === "lens") {const arr = newLens.get(r.section) ?? [];arr.push(row);newLens.set(r.section, arr);} else
      if (r.row_type === "addon") {const arr = newAddon.get(r.section) ?? [];arr.push(row);newAddon.set(r.section, arr);} else
      {const arr = newSupply.get(r.section) ?? [];arr.push(row);newSupply.set(r.section, arr);}
    }
    setLensRows(newLens);setAddonRows(newAddon);setSupplyRows(newSupply);setIsDirty(false);
  }, [savedRows, versionId]);

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

  const hasDbRows = savedRows && savedRows.length > 0;
  const effectiveLensRows = useMemo<Map<string, CatalogRow[]>>(() => {if (hasDbRows) return lensRows;const m = new Map(defaultLensRows);lensRows.forEach((r, s) => m.set(s, r));return m;}, [defaultLensRows, lensRows, hasDbRows]);
  const effectiveAddonRows = useMemo<Map<string, CatalogRow[]>>(() => {if (hasDbRows) return addonRows;const m = new Map(defaultAddonRows);addonRows.forEach((r, s) => m.set(s, r));return m;}, [defaultAddonRows, addonRows, hasDbRows]);
  const effectiveSupplyRows = useMemo<Map<string, CatalogRow[]>>(() => {if (hasDbRows) return supplyRows;const m = new Map(defaultSupplyRows);supplyRows.forEach((r, s) => m.set(s, r));return m;}, [defaultSupplyRows, supplyRows, hasDbRows]);

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

  /* ── Picker handlers ── */
  const handleLensPick = (item: PickedItem) => {
    if (!pickerTarget) return;
    const { section, rowKey, mode } = pickerTarget;
    if (mode === "cell" && item.type === "lens") {
      setLensRows((prev) => {const next = new Map(prev);const rows = [...(effectiveLensRows.get(section) ?? [])];const idx = rows.findIndex((r) => r.key === rowKey);if (idx !== -1) rows[idx] = { ...rows[idx], description: item.name, bbd: item.sell_price, usd: item.sell_price * fxRate, lensId: item.id };next.set(section, rows);return next;});
      setIsDirty(true);
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
    const targetSection = pickerTarget.section || item.category;
    const newRow: CatalogRow = { key: `supply-${item.id}-${Date.now()}`, section: targetSection, description: item.name + (item.description ? ` — ${item.description}` : ""), bbd: item.sell_price, usd: item.sell_price * fxRate, margin: null, supplyId: item.id };
    setSupplyRows((prev) => {const next = new Map(prev);next.set(targetSection, [...(effectiveSupplyRows.get(targetSection) ?? []), newRow]);return next;});
    setIsDirty(true);
  };

  const removeRow = (section: string, rowKey: string, type: "lens" | "addon" | "supply") => {
    if (type === "supply") setSupplyRows((prev) => {const next = new Map(prev);next.set(section, (effectiveSupplyRows.get(section) ?? []).filter((r) => r.key !== rowKey));return next;});else
    if (type === "addon") setAddonRows((prev) => {const next = new Map(prev);next.set(section, (effectiveAddonRows.get(section) ?? []).filter((r) => r.key !== rowKey));return next;});else
    setLensRows((prev) => {const next = new Map(prev);next.set(section, (effectiveLensRows.get(section) ?? []).filter((r) => r.key !== rowKey));return next;});
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

  /* ── Save to DB ── */
  const handleSave = async () => {
    if (!versionId) {toast({ title: "No version selected", variant: "destructive" });return;}
    let sortOrder = 0;
    const rows: Omit<PricelistCatalogRow, "id">[] = [];
    for (const [sec, secRows] of effectiveLensRows) {
      for (const r of secRows) {rows.push({ pricelist_version_id: versionId, catalog_type: catalogType, row_key: r.key, row_type: "lens", section: sec, display_description: r.description, bbd_price: r.bbd, item_id: r.lensId ?? null, sort_order: sortOrder++ });}
    }
    for (const [sec, secRows] of effectiveAddonRows) {
      for (const r of secRows) {rows.push({ pricelist_version_id: versionId, catalog_type: catalogType, row_key: r.key, row_type: "addon", section: sec, display_description: r.description, bbd_price: r.bbd, item_id: r.addonId ?? null, sort_order: sortOrder++ });}
    }
    for (const [sec, secRows] of effectiveSupplyRows) {
      for (const r of secRows) {rows.push({ pricelist_version_id: versionId, catalog_type: catalogType, row_key: r.key, row_type: "supply", section: sec, display_description: r.description, bbd_price: r.bbd, item_id: r.supplyId ?? null, sort_order: sortOrder++ });}
    }
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
      <tr key={row.key} className="group/row" style={{ background: isPending ? "hsl(0 80% 97%)" : i % 2 === 0 ? "white" : "hsl(215 20% 98%)" }}>
        {/* Reorder arrows for addon/supply rows */}
        {showReorder &&
        <td className="border border-slate-200 p-0 no-print w-8">
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
        <td className="px-2 py-1.5 border border-slate-200 text-center whitespace-nowrap" style={{ color: "hsl(215 50% 40%)", fontSize: "10px", minWidth: "48px", maxWidth: "64px" }}>
          {row.supplier || "—"}
        </td>
        <td className="px-3 py-1.5 border border-slate-200 group relative" style={{ color: "hsl(215 30% 15%)" }}>
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
                <Search className="h-3 w-3" style={{ color: "hsl(215 65% 50%)" }} />
              </button>
            }
          </div>
          {row.lensId && <div className="text-[9px] mt-0.5" style={{ color: "hsl(215 65% 45%)" }}>↳ linked lens</div>}
          {row.supplyId && <div className="text-[9px] mt-0.5" style={{ color: "hsl(130 55% 40%)" }}>↳ linked supply</div>}
        </td>
        {/* Matrix Cell — screen-only, hidden on print/export — BEFORE BBD */}
        <td className="px-2 py-1.5 border border-slate-200 no-print max-w-[160px]" style={{ color: "hsl(215 30% 55%)", fontSize: "10px" }}>
          {row.matrixCell ?
          <span className="truncate block" title={row.matrixCell}>{row.matrixCell}</span> :
          "—"}
        </td>
        {/* BBD always visible in editor */}
        <td className={`px-3 py-1.5 text-right border border-slate-200 font-medium ${showUSD ? "opacity-50" : ""}`} style={{ background: isOverridden ? "hsl(35 90% 95%)" : "hsl(215 60% 97%)", color: isOverridden ? "hsl(35 80% 30%)" : "hsl(215 60% 30%)" }}>
          <div className="flex items-center justify-end gap-1">
            {isOverridden && (
              <span title={`Override: $${displayBbd?.toFixed(2)} (was $${row.bbd?.toFixed(2)})`}>
                <Link2Off className="h-3 w-3 inline-block" style={{ color: "hsl(35 80% 45%)" }} />
              </span>
            )}
            {displayBbd !== null ? `$${displayBbd.toFixed(2)}` : "—"}
          </div>
        </td>
        <td className="px-3 py-1.5 text-right border border-slate-200 font-medium" style={{ background: "#f0fff4", color: GREEN_TEXT }}>
          {displayUsd !== null ? `$${displayUsd.toFixed(2)}` : "—"}
        </td>
        <td className="px-3 py-1.5 text-center border border-slate-200 no-print">
          <MarginBadge
            marginPercent={displayMargin}
            cost={rowCost}
            sellPrice={displayBbd}
            itemName={row.description}
            marginFloor={marginFloorPercent} />

        </td>
        {/* Pencil override icon */}
        <td className="border border-slate-200 p-0 no-print w-7">
          {(row.lensId || row.addonId || row.supplyId) && versionId &&
          <button
            className="w-full h-full flex items-center justify-center p-1 hover:bg-primary/10 transition-colors"
            title="Override price for this line"
            onClick={() => openOverride(row, rowType)}>

              <Pencil className="h-3 w-3" style={{ color: isOverridden ? "hsl(35 80% 45%)" : "hsl(215 65% 50%)" }} />
            </button>
          }
        </td>
        <td className="border border-slate-200 p-0 no-print">
          <button className="w-full h-full flex items-center justify-center p-1 hover:bg-red-50 transition-colors" onClick={() => removeRow(section, row.key, rowType)}>
            <X className="h-3 w-3 text-destructive/60 hover:text-destructive" />
          </button>
        </td>
      </tr>);

  };

  const renderSection = (title: string, rows: CatalogRow[], rowType: "lens" | "addon" | "supply") => {
    const displayRows = sortedRows(title, rows);
    return (
      <AccordionItem key={title} value={title} className="mt-3 px-2 border-none">
        <div className="flex items-center justify-between px-4 py-2 mb-0.5" style={{ background: BLUE_BG, color: "white" }}>
          <AccordionTrigger className="p-0 hover:no-underline gap-2 font-bold text-sm uppercase tracking-wide [&>svg]:text-white flex-1 justify-start">
            <span>{title}</span>
            <span className="text-[10px] font-normal normal-case tracking-normal opacity-70 ml-2">({displayRows.length})</span>
          </AccordionTrigger>
          <button className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors no-print"
          onClick={(e) => {e.stopPropagation();setPickerTarget({ section: title, rowKey: "", mode: rowType === "supply" ? "add-supply" : rowType === "addon" ? "add-addon" : "add-lens", addonSection: rowType === "addon" ? title : undefined });if (rowType === "supply") setSupplyPickerOpen(true);else setLensPickerOpen(true);}}>
            <Plus className="h-3 w-3" /> Add Line
          </button>
        </div>
        <AccordionContent className="pb-0 pt-0">
          {displayRows.length === 0 ?
          <p className="text-xs text-muted-foreground px-3 py-3 italic">{catalogType === "stock" ? "No lens selected — click \"+ Add Line\" to add." : "No items — click \"Add Line\" to add."}</p> :

          <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="w-8 no-print border border-slate-300" style={{ background: "hsl(215 15% 93%)" }} />
                  <th className="px-2 py-2 text-center font-semibold border border-slate-300 w-16" style={{ background: "hsl(215 15% 93%)", color: "hsl(215 30% 35%)", fontSize: "10px" }}>Supp.</th>
                  <th className="px-3 py-2 text-left font-semibold border border-slate-300" style={{ background: "hsl(215 15% 93%)", color: "hsl(215 30% 15%)" }}>Description <SortIcon section={title} col="description" /></th>
                  {/* Matrix Cell header — screen only, before BBD */}
                  <th className="px-2 py-2 text-left font-semibold border border-slate-300 w-40 no-print" style={{ background: "hsl(215 20% 90%)", color: "hsl(215 30% 35%)", fontSize: "10px" }}>
                    Matrix Cell
                  </th>
                  <th className={`px-3 py-2 text-right font-semibold border border-slate-300 w-28 ${showUSD ? "opacity-50" : ""}`} style={{ background: BLUE_BG, color: BLUE_TEXT }}>BBD <SortIcon section={title} col="bbd" /></th>
                  <th className="px-3 py-2 text-right font-semibold border border-slate-300 w-28" style={{ background: GREEN_BG, color: GREEN_TEXT }}>USD <SortIcon section={title} col="usd" /></th>
                  <th className="px-3 py-2 text-center font-semibold border border-slate-300 w-20 no-print" style={{ background: "hsl(280 30% 93%)", color: "hsl(280 40% 30%)" }}>Margin % <SortIcon section={title} col="margin" /></th>
                  <th className="w-7 no-print border border-slate-300" title="Override" />
                  <th className="w-6 no-print border border-slate-300" />
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
    // Group by CATEGORY only (ignore treatment type prefix).
    // Section keys from matrix sync look like "Clear Lenses — Progressive - Best"
    // or "Finished — SV". We want to group by the category part only.
    // For matrix-synced rows: strip known treatment prefixes; for DB rows use section as-is.
    const TREATMENT_PREFIXES = ["Clear Lenses", "Transitions", "Photochromic", "Polarized", "Bluefilter"];

    // Build: category → [sectionKeys that map to this category]
    const categoryMap = new Map<string, string[]>();
    for (const key of effectiveLensRows.keys()) {
      const parts = key.split(" — ");
      // If first part is a treatment prefix, the category is the rest
      const isMatrixKey = TREATMENT_PREFIXES.some((tp) => parts[0].trim() === tp);
      const category = isMatrixKey ? parts.slice(1).join(" — ") || key : key;
      if (!categoryMap.has(category)) categoryMap.set(category, []);
      categoryMap.get(category)!.push(key);
    }

    return [...categoryMap.entries()].sort((a, b) => compareCategoryOrder(a[0], b[0])).map(([category, sectionKeys]) => {
      // Merge all rows for this category regardless of treatment type
      const allRows = sectionKeys.flatMap((sk) => effectiveLensRows.get(sk) ?? []);
      const accKey = `cat::${category}`;
      const isOpen = openSections.has(accKey);
      const rowCount = allRows.length;
      // Use first sectionKey for picker/sort operations
      const primarySectionKey = sectionKeys[0];

      return (
        <div key={accKey} className="mt-4 border border-border rounded-lg overflow-hidden mx-[5px]">
          {/* Category header */}
          <div className="px-3 py-1.5 font-semibold text-xs uppercase tracking-wide flex items-center gap-2" style={{ background: "hsl(210 60% 93%)", color: "hsl(215 65% 28%)" }}>
            {category}
            <span className="ml-auto text-xs font-normal opacity-60">{rowCount} {rowCount === 1 ? "item" : "items"}</span>
          </div>

          {/* Accordion trigger */}
          <div className="border-t border-border">
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/30 transition-colors bg-muted/10"
              onClick={() => toggleSection(accKey)}>

              <div className="flex items-center gap-2">
                {isOpen ?
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> :
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                }
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
                  }}>

                  <Plus className="h-3 w-3" /> Add Line
                </button>
              </div>
            </button>

            {/* Accordion content */}
            {isOpen &&
            <div className="border-t border-border">
                {allRows.length === 0 ?
              <p className="text-xs text-muted-foreground px-6 py-3 italic">No items — click "Add Line" to add.</p> :

              <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-center font-semibold border border-slate-300 w-16" style={{ background: "hsl(215 15% 93%)", color: "hsl(215 30% 35%)", fontSize: "10px" }}>Supp.</th>
                        <th className="px-3 py-2 text-left font-semibold border border-slate-300" style={{ background: "hsl(215 15% 93%)", color: "hsl(215 30% 15%)" }}>Description <SortIcon section={primarySectionKey} col="description" /></th>
                        <th className="px-2 py-2 text-left font-semibold border border-slate-300 w-40 no-print" style={{ background: "hsl(215 20% 90%)", color: "hsl(215 30% 35%)", fontSize: "10px" }}>Matrix Cell</th>
                        <th className={`px-3 py-2 text-right font-semibold border border-slate-300 w-28 ${showUSD ? "opacity-50" : ""}`} style={{ background: BLUE_BG, color: BLUE_TEXT }}>BBD <SortIcon section={primarySectionKey} col="bbd" /></th>
                        <th className="px-3 py-2 text-right font-semibold border border-slate-300 w-28" style={{ background: GREEN_BG, color: GREEN_TEXT }}>USD <SortIcon section={primarySectionKey} col="usd" /></th>
                        <th className="px-3 py-2 text-center font-semibold border border-slate-300 w-20 no-print" style={{ background: "hsl(280 30% 93%)", color: "hsl(280 40% 30%)" }}>Margin % <SortIcon section={primarySectionKey} col="margin" /></th>
                        <th className="w-7 no-print border border-slate-300" title="Override" />
                        <th className="w-6 no-print border border-slate-300" />
                      </tr>
                    </thead>
                    <tbody>{allRows.map((row, i) => renderRow(row, i, "lens", row.section))}</tbody>
                  </table>
              }
              </div>
            }
          </div>
        </div>);

    });
  };

  const saveBarContent =
  <div className="space-y-2 no-print">
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-1">
          {isDirty && !hasPending && <span className="text-xs" style={{ color: "hsl(38 92% 40%)" }}>⚠ Unsaved changes</span>}
          {hasPending &&
        <span className="flex items-center gap-1 text-xs text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
              {pendingMatrixRowKeys!.size} pending sync{pendingMatrixRowKeys!.size > 1 ? "s" : ""}
            </span>
        }
        </div>
        <Button
        size="sm"
        className="h-8 text-xs gap-1.5"
        style={{ background: isDirty || hasPending ? "hsl(215 65% 50%)" : undefined }}
        variant={isDirty || hasPending ? "default" : "outline"}
        onClick={handleSave}
        disabled={saveRows.isPending}>

          {saveRows.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save All Changes
        </Button>
      </div>
    </div>;


  useEffect(() => {
    if (renderSaveBar) renderSaveBar(saveBarContent);
  });

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
        <div className="px-4 py-2.5 mb-4 rounded-md border-primary/30 bg-primary/5 border-0">
          <h2 className="text-sm font-semibold text-primary tracking-wide">{pageName || pageTitle} List Editor</h2>
        </div>

        {catalogType === "buysell" && (
          <Accordion type="multiple" defaultValue={[...effectiveSupplyRows.keys()]} className="space-y-0">
            {[...effectiveSupplyRows.entries()].map(([sec, rows]) => renderSection(sec, rows, "supply"))}
          </Accordion>
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

        {showTreatmentsAddons && catalogType === "rx" && effectiveAddonRows.size > 0 &&
        <div className="mt-8 border-t-2 border-dashed border-border pt-4">
            <div className="px-4 py-2 mb-2 rounded-sm text-xs font-bold tracking-wide" style={{ background: "hsl(215 15% 94%)", color: "hsl(215 30% 20%)" }}>
              ADD ONS
            </div>
            <Accordion type="multiple" defaultValue={[...effectiveAddonRows.keys()]} className="space-y-0">
              {[...effectiveAddonRows.entries()].map(([sec, rows]) => renderSection(sec, rows, "addon"))}
            </Accordion>
          </div>
        }

        <div className="mt-8 px-2 py-4 border-t border-border text-center">
          <p className="text-[10px] italic" style={{ color: LABEL }}>
            {companySettings?.pdf_footer_html || "Prices subject to change without notice."} All prices in {showUSD ? "USD" : "BBD"} unless otherwise stated. {today}.
          </p>
        </div>
      </div>

      <LensPickerPopover open={lensPickerOpen} onOpenChange={setLensPickerOpen} onPick={handleLensPick} mode={pickerTarget?.mode === "add-addon" ? "all" : "lens-only"} currentId={null} hideFinished={catalogType === "rx"} wsplOnly={catalogType === "stock"} />
      <SupplyPickerPopover open={supplyPickerOpen} onOpenChange={setSupplyPickerOpen} onPick={handleSupplyPick} currentId={null} categoryFilter={pickerTarget?.section} />
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