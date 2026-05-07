import { useState, useMemo, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ArrowUpDown, Globe, Lock, Unlock, Copy, Trash2, ListChecks, ThumbsDown, ThumbsUp,
  FlaskConical, Building2, ClipboardList, RefreshCw,
} from "lucide-react";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import MultiSelectFilter from "./MultiSelectFilter";
import type { Lens } from "@/hooks/useLenses";
import { usePricelistUsedItems } from "@/hooks/usePricelistUsedItems";
import { fieldsMatch } from "@/lib/wildcardMatch";
import { getStoreProductRoute } from "@/hooks/useStoreProducts";

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "name" | "supplier" | "brand" | "material" | "mftype" | "lenstype" | "option" | "finishtype" | "base_price" | "sell_price" | "sell_usd";
type SortDir = "asc" | "desc";
type Filter = "all" | "active" | "inactive" | "web" | "zero_cost" | "zero_sell" | "in_pricelist" | "liked" | "disliked" | "compare_tight" | "compare_loose" | "unique";
type ColumnFilterKey = "supplier" | "brand" | "material" | "mftype" | "lenstype" | "option" | "finishtype";

interface Props {
  lenses: Lens[];
  preferences?: Record<string, "liked" | "disliked">;
  search: string;
  filterVersion?: number;
  onRowClick: (lens: Lens) => void;
  onToggleActive: (lens: Lens) => void;
  onDuplicate?: (lens: Lens) => void;
  onDelete?: (lens: Lens) => void;
  canDelete?: boolean;
  filter?: Filter;
  onFilterChange?: (f: Filter) => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSortChange?: (key: SortKey, dir: SortDir) => void;
  colFilters?: Record<ColumnFilterKey, string[]>;
  onColFiltersChange?: (cf: Record<ColumnFilterKey, string[]>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fkName = (fk: { name: string } | null) => fk?.name ?? "";
const fkAbbrev = (fk: { abbrev?: string } | null) => fk?.abbrev ?? "";
const optionNames = (lens: Lens) =>
  (lens.lens_lens_options ?? []).map((o) => o.lens_option?.name ?? "").filter(Boolean).join(", ");
const optionAbbrevs = (lens: Lens) =>
  (lens.lens_lens_options ?? []).map((o) => o.lens_option?.abbrev ?? "").filter(Boolean).join(", ");

const emptyColFilters: Record<ColumnFilterKey, string[]> = {
  supplier: [], brand: [], material: [], mftype: [], lenstype: [], option: [], finishtype: [],
};

// Normalize lens name for loose comparison: remove leading index "1.50 " etc.
const normalizeLensName = (name: string) =>
  name.toLowerCase().replace(/^\d+\.\d+\s+/, "").trim();

// ── Supplier colors ───────────────────────────────────────────────────────────
// Hues chosen to avoid red/orange/yellow (used for row risk states)
const SUPPLIER_HUES = [195, 210, 240, 265, 285, 310, 160, 145, 115, 175, 225, 200, 250, 130, 170];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getSupplierStyle(name: string): { bg: string; text: string } {
  const hue = SUPPLIER_HUES[hashStr(name) % SUPPLIER_HUES.length];
  const isDark = document.documentElement.classList.contains("dark");
  return isDark
    ? { bg: `hsl(${hue} 40% 22%)`, text: `hsl(${hue} 65% 78%)` }
    : { bg: `hsl(${hue} 60% 90%)`, text: `hsl(${hue} 60% 22%)` };
}

// ── Compare display types ─────────────────────────────────────────────────────
type CompareRow =
  | { kind: "header"; groupName: string; lensCount: number; minCost: number }
  | { kind: "lens"; lens: Lens; isBestCost: boolean };

function buildCompareRows(items: Lens[], groupKeyFn: (l: Lens) => string): CompareRow[] {
  const groups = new Map<string, Lens[]>();
  for (const l of items) {
    const key = groupKeyFn(l);
    const arr = groups.get(key) ?? [];
    arr.push(l);
    groups.set(key, arr);
  }
  const rows: CompareRow[] = [];
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
  for (const key of sortedKeys) {
    const group = (groups.get(key) ?? []).slice().sort((a, b) => a.base_price - b.base_price);
    const minCost = group[0]?.base_price ?? 0;
    rows.push({ kind: "header", groupName: key, lensCount: group.length, minCost });
    for (const lens of group) {
      rows.push({ kind: "lens", lens, isBestCost: lens.base_price === minCost });
    }
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────

const LensDataTable = ({
  lenses, preferences = {}, search, filterVersion, onRowClick, onToggleActive, onDuplicate, onDelete, canDelete,
  filter: filterProp, onFilterChange,
  sortKey: sortKeyProp, sortDir: sortDirProp, onSortChange,
  colFilters: colFiltersProp, onColFiltersChange,
}: Props) => {
  const { canEdit } = useAdminRole();
  const { canEditFeature } = useRolePermissions();
  const canEditCatalog = canEditFeature("catalog");
  const { data: usedItems = new Set<string>() } = usePricelistUsedItems();

  const showCost = canEdit;
  const { settings } = usePricingEngine();

  const [filterLocal, setFilterLocal] = useState<Filter>("active");
  const [sortKeyLocal, setSortKeyLocal] = useState<SortKey>("name");
  const [sortDirLocal, setSortDirLocal] = useState<SortDir>("asc");
  const [colFiltersLocal, setColFiltersLocal] = useState<Record<ColumnFilterKey, string[]>>(emptyColFilters);
  const [visibleCount, setVisibleCount] = useState(50);
  const [unlocked, setUnlocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["lenses"] });
    setRefreshing(false);
  };

  const filter = filterProp ?? filterLocal;
  const sortKey = sortKeyProp ?? sortKeyLocal;
  const sortDir = sortDirProp ?? sortDirLocal;
  const colFiltersArr = colFiltersProp ?? colFiltersLocal;

  const colFilters = useMemo<Record<ColumnFilterKey, Set<string>>>(() => ({
    supplier: new Set(colFiltersArr.supplier),
    brand: new Set(colFiltersArr.brand),
    material: new Set(colFiltersArr.material),
    mftype: new Set(colFiltersArr.mftype),
    lenstype: new Set(colFiltersArr.lenstype),
    option: new Set(colFiltersArr.option),
    finishtype: new Set(colFiltersArr.finishtype),
  }), [colFiltersArr]);

  useEffect(() => {
    if (filterVersion !== undefined) {
      setColFiltersLocal(emptyColFilters);
      onColFiltersChange?.(emptyColFilters);
      setFilterLocal("active");
      onFilterChange?.("active");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterVersion]);

  const fxRate = useMemo(() => {
    if (!settings) return 2;
    const rates = settings.fx_rates as Record<string, number>;
    return (rates["USD"] ?? 1) * (1 + settings.fx_risk_buffer);
  }, [settings]);

  const setFilter = useCallback((f: Filter) => {
    setFilterLocal(f);
    onFilterChange?.(f);
    setVisibleCount(50);
  }, [onFilterChange]);

  const toggleSort = useCallback((key: SortKey) => {
    const newDir: SortDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortKeyLocal(key);
    setSortDirLocal(newDir);
    onSortChange?.(key, newDir);
    setVisibleCount(50);
  }, [sortKey, sortDir, onSortChange]);

  const setColFilter = useCallback((key: ColumnFilterKey, val: Set<string>) => {
    const arr = Array.from(val);
    setColFiltersLocal((prev) => ({ ...prev, [key]: arr }));
    onColFiltersChange?.({ ...colFiltersArr, [key]: arr });
    setVisibleCount(50);
  }, [colFiltersArr, onColFiltersChange]);

  const applyStatusFilter = useCallback((items: Lens[], targetFilter: Filter) => {
    switch (targetFilter) {
      case "active": return items.filter((i) => i.is_active);
      case "inactive": return items.filter((i) => !i.is_active);
      case "web": return items.filter((i) => i.show_on_website);
      case "zero_cost": return items.filter((i) => i.base_price === 0);
      case "zero_sell": return items.filter((i) => i.sell_price === 0);
      case "in_pricelist": return items.filter((i) => i.show_in_pricelist || usedItems.has(i.id));
      case "liked": return items.filter((i) => preferences[i.id] === "liked");
      case "disliked": return items.filter((i) => preferences[i.id] === "disliked");
      case "compare_tight": {
        const counts = new Map<string, number>();
        items.forEach((i) => counts.set(i.name.toLowerCase(), (counts.get(i.name.toLowerCase()) ?? 0) + 1));
        return items.filter((i) => (counts.get(i.name.toLowerCase()) ?? 0) >= 2);
      }
      case "compare_loose": {
        const counts = new Map<string, number>();
        items.forEach((i) => counts.set(normalizeLensName(i.name), (counts.get(normalizeLensName(i.name)) ?? 0) + 1));
        return items.filter((i) => (counts.get(normalizeLensName(i.name)) ?? 0) >= 2);
      }
      case "unique": {
        const counts = new Map<string, number>();
        items.forEach((i) => counts.set(i.name.toLowerCase(), (counts.get(i.name.toLowerCase()) ?? 0) + 1));
        return items.filter((i) => (counts.get(i.name.toLowerCase()) ?? 0) === 1);
      }
      default: return items;
    }
  }, [preferences, usedItems]);

  const columnOptions = useMemo(() => {
    const withoutColFilter = (excludeKey: ColumnFilterKey) => {
      let items = lenses;
      if (excludeKey !== "supplier" && colFilters.supplier.size > 0) items = items.filter((i) => colFilters.supplier.has(fkName(i.supplier)));
      if (excludeKey !== "brand" && colFilters.brand.size > 0) items = items.filter((i) => colFilters.brand.has(fkName(i.brand)));
      if (excludeKey !== "material" && colFilters.material.size > 0) items = items.filter((i) => colFilters.material.has(fkName(i.material)));
      if (excludeKey !== "mftype" && colFilters.mftype.size > 0) items = items.filter((i) => colFilters.mftype.has(fkName(i.mftype)));
      if (excludeKey !== "lenstype" && colFilters.lenstype.size > 0) items = items.filter((i) => colFilters.lenstype.has(fkName(i.lenstype)));
      if (excludeKey !== "finishtype" && colFilters.finishtype.size > 0) items = items.filter((i) => colFilters.finishtype.has(fkName(i.finishtype)));
      if (excludeKey !== "option" && colFilters.option.size > 0) items = items.filter((i) => {
        const names = (i.lens_lens_options ?? []).map((o) => o.lens_option?.name ?? "");
        return names.some((n) => colFilters.option.has(n));
      });
      if (search) {
        const q = search.toLowerCase();
        items = items.filter((i) =>
          fieldsMatch(q, i.name, fkName(i.supplier), fkAbbrev(i.supplier),
            fkName(i.brand), fkAbbrev(i.brand), fkName(i.material), fkAbbrev(i.material),
            fkName(i.lenstype), fkAbbrev(i.lenstype), fkName(i.finishtype), fkAbbrev(i.finishtype),
            fkName(i.mftype), fkAbbrev(i.mftype), optionNames(i), optionAbbrevs(i), i.notes)
        );
      }
      return applyStatusFilter(items, filter);
    };

    const collect = (key: ColumnFilterKey, source: Lens[]) => {
      const map = new Map<string, string>();
      for (const l of source) {
        if (key === "option") {
          for (const o of l.lens_lens_options ?? []) {
            const n = o.lens_option?.name ?? "";
            if (n && !map.has(n)) map.set(n, n);
          }
          continue;
        }
        const name = fkName(l[key as keyof Lens] as any);
        if (name && !map.has(name)) map.set(name, name);
      }
      return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
    };

    return {
      supplier: collect("supplier", withoutColFilter("supplier")),
      brand: collect("brand", withoutColFilter("brand")),
      material: collect("material", withoutColFilter("material")),
      mftype: collect("mftype", withoutColFilter("mftype")),
      lenstype: collect("lenstype", withoutColFilter("lenstype")),
      option: collect("option", withoutColFilter("option")),
      finishtype: collect("finishtype", withoutColFilter("finishtype")),
    };
  }, [lenses, colFilters, search, filter, applyStatusFilter]);

  const baseFiltered = useMemo(() => {
    let items = lenses;
    if (colFilters.supplier.size > 0) items = items.filter((i) => colFilters.supplier.has(fkName(i.supplier)));
    if (colFilters.brand.size > 0) items = items.filter((i) => colFilters.brand.has(fkName(i.brand)));
    if (colFilters.material.size > 0) items = items.filter((i) => colFilters.material.has(fkName(i.material)));
    if (colFilters.mftype.size > 0) items = items.filter((i) => colFilters.mftype.has(fkName(i.mftype)));
    if (colFilters.lenstype.size > 0) items = items.filter((i) => colFilters.lenstype.has(fkName(i.lenstype)));
    if (colFilters.finishtype.size > 0) items = items.filter((i) => colFilters.finishtype.has(fkName(i.finishtype)));
    if (colFilters.option.size > 0) items = items.filter((i) => {
      const names = (i.lens_lens_options ?? []).map((o) => o.lens_option?.name ?? "");
      return names.some((n) => colFilters.option.has(n));
    });
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) =>
        fieldsMatch(q, i.name, fkName(i.supplier), fkAbbrev(i.supplier),
          fkName(i.brand), fkAbbrev(i.brand), fkName(i.material), fkAbbrev(i.material),
          fkName(i.lenstype), fkAbbrev(i.lenstype), fkName(i.finishtype), fkAbbrev(i.finishtype),
          fkName(i.mftype), fkAbbrev(i.mftype), optionNames(i), optionAbbrevs(i), i.notes)
      );
    }
    return items;
  }, [lenses, colFilters, search]);

  const filterCounts = useMemo(() => {
    const allItems = baseFiltered;
    // tight/loose: count groups with 2+, unique: count single-name items
    const tightCounts = new Map<string, number>();
    const looseCounts = new Map<string, number>();
    allItems.forEach((i) => {
      tightCounts.set(i.name.toLowerCase(), (tightCounts.get(i.name.toLowerCase()) ?? 0) + 1);
      looseCounts.set(normalizeLensName(i.name), (looseCounts.get(normalizeLensName(i.name)) ?? 0) + 1);
    });
    const compareTight = allItems.filter((i) => (tightCounts.get(i.name.toLowerCase()) ?? 0) >= 2);
    const compareLoose = allItems.filter((i) => (looseCounts.get(normalizeLensName(i.name)) ?? 0) >= 2);
    const uniqueNames = allItems.filter((i) => (tightCounts.get(i.name.toLowerCase()) ?? 0) === 1);
    const tightGroups = new Set(compareTight.map((i) => i.name.toLowerCase())).size;
    const looseGroups = new Set(compareLoose.map((i) => normalizeLensName(i.name))).size;

    return {
      active: applyStatusFilter(allItems, "active").length,
      inactive: applyStatusFilter(allItems, "inactive").length,
      all: allItems.length,
      web: applyStatusFilter(allItems, "web").length,
      zero_cost: applyStatusFilter(allItems, "zero_cost").length,
      zero_sell: applyStatusFilter(allItems, "zero_sell").length,
      in_pricelist: applyStatusFilter(allItems, "in_pricelist").length,
      liked: applyStatusFilter(allItems, "liked").length,
      disliked: applyStatusFilter(allItems, "disliked").length,
      compare_tight: tightGroups,
      compare_loose: looseGroups,
      unique: uniqueNames.length,
    };
  }, [baseFiltered, applyStatusFilter]);

  const filtered = useMemo(() => {
    const items = applyStatusFilter(baseFiltered, filter);
    if (filter === "compare_tight" || filter === "compare_loose") {
      // Sorting is handled per-group in buildCompareRows; just return as-is for count
      return items;
    }
    return [...items].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "supplier": av = fkName(a.supplier); bv = fkName(b.supplier); break;
        case "brand": av = fkName(a.brand); bv = fkName(b.brand); break;
        case "material": av = fkName(a.material); bv = fkName(b.material); break;
        case "mftype": av = fkName(a.mftype); bv = fkName(b.mftype); break;
        case "lenstype": av = fkName(a.lenstype); bv = fkName(b.lenstype); break;
        case "option": av = optionNames(a); bv = optionNames(b); break;
        case "finishtype": av = fkName(a.finishtype); bv = fkName(b.finishtype); break;
        case "sell_usd": av = fxRate > 0 ? a.sell_price / fxRate : 0; bv = fxRate > 0 ? b.sell_price / fxRate : 0; break;
        default: av = a[sortKey] as any; bv = b[sortKey] as any;
      }
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [baseFiltered, filter, sortKey, sortDir, applyStatusFilter, fxRate]);

  const isCompareMode = filter === "compare_tight" || filter === "compare_loose";

  const compareRows = useMemo((): CompareRow[] => {
    if (!isCompareMode) return [];
    const keyFn = filter === "compare_tight"
      ? (l: Lens) => l.name.toLowerCase()
      : (l: Lens) => normalizeLensName(l.name);
    return buildCompareRows(filtered, keyFn);
  }, [filtered, filter, isCompareMode]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = !isCompareMode && visibleCount < filtered.length;

  const filterTabs: { label: string; value: Filter; count: number; group?: string }[] = [
    { label: "Active", value: "active", count: filterCounts.active },
    { label: "Inactive", value: "inactive", count: filterCounts.inactive },
    { label: "All", value: "all", count: filterCounts.all },
    { label: "Web", value: "web", count: filterCounts.web },
    { label: "In Pricelist", value: "in_pricelist", count: filterCounts.in_pricelist },
    { label: "Liked", value: "liked", count: filterCounts.liked },
    { label: "Disliked", value: "disliked", count: filterCounts.disliked },
    { label: "Zero Cost", value: "zero_cost", count: filterCounts.zero_cost },
    { label: "Zero Sell", value: "zero_sell", count: filterCounts.zero_sell },
    { label: "Compare ≡", value: "compare_tight", count: filterCounts.compare_tight, group: "cmp" },
    { label: "Compare ~", value: "compare_loose", count: filterCounts.compare_loose, group: "cmp" },
    { label: "Unique", value: "unique", count: filterCounts.unique, group: "cmp" },
  ];

  const currency = (v: number) => `$${Number(v).toFixed(2)}`;
  const showActions = unlocked && canEditCatalog;
  const costCols = showCost ? 1 : 0;
  const colCount = 14 + costCols + (showActions ? 2 : 0);

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground whitespace-nowrap" onClick={() => toggleSort(k)}>
      {label}<ArrowUpDown className="h-3 w-3 shrink-0" />
    </button>
  );

  const FilterHeader = ({ label, k, sortK }: { label: string; k: ColumnFilterKey; sortK: SortKey }) => (
    <div className="flex items-center gap-1">
      <button className="flex items-center gap-0.5 hover:text-foreground whitespace-nowrap" onClick={() => toggleSort(sortK)}>
        {label}<ArrowUpDown className="h-3 w-3 shrink-0" />
      </button>
      <MultiSelectFilter
        label=""
        options={columnOptions[k]}
        selected={colFilters[k]}
        onChange={(v) => setColFilter(k, v)}
        storageKey={`lens_col_${k}`}
      />
    </div>
  );

  // ── Row background resolver ─────────────────────────────────────────────────
  const getRowBg = (lens: Lens, idx: number, isBestCost?: boolean) => {
    if (isBestCost) return "hsl(var(--admin-table-row-best))";
    const cost = lens.base_price;
    const sell = lens.sell_price;
    if (cost === 0) return "hsl(var(--admin-table-row-risk))";
    if (sell > 0 && sell <= cost * fxRate) return "hsl(var(--admin-table-row-loss))";
    if (sell > 0) {
      const fullCostApprox = cost * fxRate * 1.15;
      if ((sell - fullCostApprox) / sell < 0.15) return "hsl(var(--admin-table-row-warning))";
    }
    return idx % 2 === 1 ? "hsl(var(--admin-table-row-alt))" : undefined;
  };

  // ── Shared lens row renderer ────────────────────────────────────────────────
  const renderLensRow = (lens: Lens, idx: number, isBestCost = false) => {
    const supplierName = fkName(lens.supplier);
    const supplierStyle = supplierName ? getSupplierStyle(supplierName) : null;
    const rowBg = getRowBg(lens, idx, isBestCost);

    return (
      <TableRow
        key={lens.id}
        className={canEditCatalog ? "cursor-pointer" : ""}
        style={rowBg ? { background: rowBg } : undefined}
        onClick={() => canEditCatalog && onRowClick(lens)}
      >
        <TableCell className="font-medium text-xs py-1.5">
          <span className="flex items-center gap-1.5 flex-wrap">
            {lens.name}
            {usedItems.has(lens.id) && (
              <span title="Used in a pricelist" className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full shrink-0" style={{ background: "hsl(var(--admin-accent))", color: "hsl(var(--admin-accent-fg))" }}>
                <ListChecks className="h-2 w-2" />
              </span>
            )}
            {preferences[lens.id] === "liked" && (
              <ThumbsUp className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--admin-success))" }} />
            )}
            {preferences[lens.id] === "disliked" && (
              <ThumbsDown className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--admin-destructive))" }} />
            )}
          </span>
        </TableCell>
        <TableCell className="text-xs py-1.5">
          {supplierName && supplierStyle ? (
            <span
              className="inline-block text-[10px] leading-none px-1.5 py-[2px] rounded-full whitespace-nowrap font-medium"
              style={{ background: supplierStyle.bg, color: supplierStyle.text }}
            >
              {supplierName}
            </span>
          ) : null}
        </TableCell>
        <TableCell className="text-xs py-1.5">{fkName(lens.brand)}</TableCell>
        <TableCell className="text-xs py-1.5">{fkName(lens.material)}</TableCell>
        <TableCell className="text-xs py-1.5">{fkName(lens.mftype)}</TableCell>
        <TableCell className="text-xs py-1.5">{fkName(lens.lenstype)}</TableCell>
        <TableCell className="text-xs py-1.5">{optionNames(lens) || "—"}</TableCell>
        <TableCell className="text-xs py-1.5">{fkName(lens.finishtype)}</TableCell>
        {showCost && <TableCell className="text-xs py-1.5">{currency(lens.base_price)}</TableCell>}
        <TableCell className="text-xs font-semibold py-1.5">{currency(lens.sell_price)}</TableCell>
        <TableCell className="text-xs py-1.5" style={{ color: "hsl(var(--admin-muted-fg))" }}>
          {fxRate > 0 ? currency(lens.sell_price / fxRate) : "—"}
        </TableCell>
        {/* PL */}
        <TableCell className="text-center py-1.5 w-10 px-1">
          {(lens.show_in_pricelist || usedItems.has(lens.id)) && (
            <ClipboardList className="h-3 w-3 mx-auto" style={{ color: "hsl(var(--admin-accent))" }} />
          )}
        </TableCell>
        {/* LAB */}
        <TableCell className="text-center py-1.5 w-10 px-1">
          {lens.full_lab && (
            <FlaskConical className="h-3 w-3 mx-auto" style={{ color: "hsl(210 70% 55%)" }} />
          )}
        </TableCell>
        {/* WSPL */}
        <TableCell className="text-center py-1.5 w-12 px-1">
          {lens.show_in_ws_pricelist && (
            <Building2 className="h-3 w-3 mx-auto" style={{ color: "hsl(270 55% 58%)" }} />
          )}
        </TableCell>
        {/* WEB */}
        <TableCell className="text-center py-1.5 w-10 px-1" onClick={(e) => e.stopPropagation()}>
          {lens.show_on_website && (
            <button
              title="Open product page"
              className="inline-flex items-center justify-center mx-auto"
              onClick={() => window.open(getStoreProductRoute({ id: lens.id, product_type: "lens" }), "_blank", "noopener,noreferrer")}
            >
              <Globe className="h-3 w-3" style={{ color: "hsl(var(--admin-success))" }} />
            </button>
          )}
        </TableCell>
        {showActions && (
          <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
            <Switch checked={lens.is_active} onCheckedChange={() => onToggleActive(lens)} className="scale-75" />
          </TableCell>
        )}
        {showActions && (
          <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicate" onClick={() => onDuplicate?.(lens)}>
                <Copy className="h-3.5 w-3.5" style={{ color: "hsl(var(--admin-muted-fg))" }} />
              </Button>
              {canDelete && (
                <Button variant="ghost" size="icon" className="h-6 w-6" title="Delete" onClick={() => onDelete?.(lens)}>
                  <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--admin-destructive))" }} />
                </Button>
              )}
            </div>
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {filterTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className="px-2.5 py-1 text-xs font-medium rounded transition-colors"
            style={{
              background: filter === t.value
                ? t.group === "cmp" ? "hsl(var(--admin-success) / 0.15)" : "hsl(var(--admin-accent) / 0.12)"
                : "transparent",
              color: filter === t.value
                ? t.group === "cmp" ? "hsl(var(--admin-success))" : "hsl(var(--admin-accent))"
                : "hsl(var(--admin-muted-fg))",
            }}
          >
            {`${t.label} (${t.count})`}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-xs py-1" style={{ color: "hsl(var(--admin-muted-fg))" }}>
          <button onClick={handleRefresh} disabled={refreshing} className="p-0.5 transition-colors hover:bg-muted/50" title="Refresh results">
            <RefreshCw className={`h-3.5 w-3.5${refreshing ? " animate-spin" : ""}`} />
          </button>
          {canEditCatalog && (
            <button
              onClick={() => setUnlocked((u) => !u)}
              className="p-0.5 transition-colors hover:bg-muted/50"
              title={unlocked ? "Lock actions" : "Unlock actions"}
            >
              {unlocked
                ? <Unlock className="h-3.5 w-3.5" style={{ color: "hsl(var(--admin-warning))" }} />
                : <Lock className="h-3.5 w-3.5" />
              }
            </button>
          )}
          {isCompareMode
            ? `${filtered.length} lens${filtered.length !== 1 ? "es" : ""} in ${new Set(filtered.map((l) => filter === "compare_tight" ? l.name.toLowerCase() : normalizeLensName(l.name))).size} groups`
            : `${visibleCount < filtered.length ? `${visibleCount} of ` : ""}${filtered.length} record${filtered.length !== 1 ? "s" : ""}`
          }
        </span>
      </div>

      {/* Table */}
      <div className="border rounded overflow-hidden flex-1 min-h-0" style={{ borderColor: "hsl(var(--admin-border))", background: "hsl(var(--admin-table-bg))" }}>
        <Table>
          <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(var(--admin-table-header-bg))", boxShadow: "inset 0 -1px 0 hsl(var(--admin-border))" }}>
            <TableRow>
              <TableHead><SortHeader label="Name" k="name" /></TableHead>
              <TableHead><FilterHeader label="Supplier" k="supplier" sortK="supplier" /></TableHead>
              <TableHead><FilterHeader label="Brand" k="brand" sortK="brand" /></TableHead>
              <TableHead><FilterHeader label="Material" k="material" sortK="material" /></TableHead>
              <TableHead><FilterHeader label="MF Type" k="mftype" sortK="mftype" /></TableHead>
              <TableHead><FilterHeader label="Lens Type" k="lenstype" sortK="lenstype" /></TableHead>
              <TableHead><FilterHeader label="Option" k="option" sortK="option" /></TableHead>
              <TableHead><FilterHeader label="Finish Type" k="finishtype" sortK="finishtype" /></TableHead>
              {showCost && <TableHead><SortHeader label="Cost (USD)" k="base_price" /></TableHead>}
              <TableHead><SortHeader label="Sell (BBD)" k="sell_price" /></TableHead>
              <TableHead><SortHeader label="Sell (USD)" k="sell_usd" /></TableHead>
              <TableHead className="w-10 px-1 text-center text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "hsl(var(--admin-accent))" }}>PL</TableHead>
              <TableHead className="w-10 px-1 text-center text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "hsl(210 70% 55%)" }}>LAB</TableHead>
              <TableHead className="w-12 px-1 text-center text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "hsl(270 55% 58%)" }}>WSPL</TableHead>
              <TableHead className="w-10 px-1 text-center text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: "hsl(var(--admin-success))" }}>WEB</TableHead>
              {showActions && <TableHead />}
              {showActions && <TableHead className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--admin-muted-fg))" }}>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isCompareMode ? (
              compareRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-8 text-xs" style={{ color: "hsl(var(--admin-muted-fg))" }}>
                    No grouped lenses found.
                  </TableCell>
                </TableRow>
              ) : (
                compareRows.map((row, idx) => {
                  if (row.kind === "header") {
                    return (
                      <TableRow key={`grp-${row.groupName}`}>
                        <TableCell
                          colSpan={colCount}
                          className="text-xs font-semibold py-1 px-3"
                          style={{ background: "hsl(var(--admin-table-group-header))", color: "hsl(var(--admin-content-fg))" }}
                        >
                          <span className="capitalize">{row.groupName}</span>
                          <span className="ml-2 font-normal text-[10px]" style={{ color: "hsl(var(--admin-muted-fg))" }}>
                            {row.lensCount} variants · best cost {currency(row.minCost)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return renderLensRow(row.lens, idx, row.isBestCost);
                })
              )
            ) : (
              <>
                {visibleItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="text-center py-8 text-xs" style={{ color: "hsl(var(--admin-muted-fg))" }}>
                      No lenses found.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleItems.map((lens, idx) => renderLensRow(lens, idx))
                )}
                {hasMore && (
                  <TableRow>
                    <TableCell colSpan={colCount} className="text-center py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        style={{ color: "hsl(var(--admin-accent))" }}
                        onClick={(e) => { e.stopPropagation(); setVisibleCount((v) => v + 50); }}
                      >
                        Load more ({filtered.length - visibleCount} remaining)
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LensDataTable;
