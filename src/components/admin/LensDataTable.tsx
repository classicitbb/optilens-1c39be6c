import { useState, useMemo, useCallback, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowUpDown, Globe, Lock, Unlock, Copy, Trash2, ListChecks } from "lucide-react";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import MultiSelectFilter from "./MultiSelectFilter";
import type { Lens } from "@/hooks/useLenses";
import { usePricelistUsedItems } from "@/hooks/usePricelistUsedItems";
import { fieldsMatch } from "@/lib/wildcardMatch";


type SortKey = "name" | "supplier" | "brand" | "material" | "mftype" | "lenstype" | "option" | "finishtype" | "base_price" | "sell_price" | "sell_usd";
type SortDir = "asc" | "desc";
type Filter = "all" | "active" | "inactive" | "web" | "zero_cost" | "zero_sell";
type ColumnFilterKey = "supplier" | "brand" | "material" | "mftype" | "lenstype" | "option" | "finishtype";

interface Props {
  lenses: Lens[];
  search: string;
  filterVersion?: number;
  onRowClick: (lens: Lens) => void;
  onToggleActive: (lens: Lens) => void;
  onDuplicate?: (lens: Lens) => void;
  onDelete?: (lens: Lens) => void;
  canDelete?: boolean;
  // Controlled state from parent (for persistence)
  filter?: Filter;
  onFilterChange?: (f: Filter) => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSortChange?: (key: SortKey, dir: SortDir) => void;
  colFilters?: Record<ColumnFilterKey, string[]>;
  onColFiltersChange?: (cf: Record<ColumnFilterKey, string[]>) => void;
}

const fkName = (fk: { name: string } | null) => fk?.name ?? "";
const fkAbbrev = (fk: { abbrev?: string } | null) => fk?.abbrev ?? "";
const optionNames = (lens: Lens) =>
  (lens.lens_lens_options ?? []).map((o) => o.lens_option?.name ?? "").filter(Boolean).join(", ");
const optionAbbrevs = (lens: Lens) =>
  (lens.lens_lens_options ?? []).map((o) => o.lens_option?.abbrev ?? "").filter(Boolean).join(", ");

const emptyColFilters: Record<ColumnFilterKey, string[]> = {
  supplier: [], brand: [], material: [], mftype: [], lenstype: [], option: [], finishtype: [],
};

const LensDataTable = ({
  lenses, search, filterVersion, onRowClick, onToggleActive, onDuplicate, onDelete, canDelete,
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

  // Local state (fallback when not controlled)
  const [filterLocal, setFilterLocal] = useState<Filter>("active");
  const [sortKeyLocal, setSortKeyLocal] = useState<SortKey>("name");
  const [sortDirLocal, setSortDirLocal] = useState<SortDir>("asc");
  const [colFiltersLocal, setColFiltersLocal] = useState<Record<ColumnFilterKey, string[]>>(emptyColFilters);

  const [visibleCount, setVisibleCount] = useState(50);
  const [unlocked, setUnlocked] = useState(false);

  // Resolve controlled vs local
  const filter = filterProp ?? filterLocal;
  const sortKey = sortKeyProp ?? sortKeyLocal;
  const sortDir = sortDirProp ?? sortDirLocal;
  const colFiltersArr = colFiltersProp ?? colFiltersLocal;

  // Convert string[] arrays to Sets for internal use
  const colFilters = useMemo<Record<ColumnFilterKey, Set<string>>>(() => ({
    supplier: new Set(colFiltersArr.supplier),
    brand: new Set(colFiltersArr.brand),
    material: new Set(colFiltersArr.material),
    mftype: new Set(colFiltersArr.mftype),
    lenstype: new Set(colFiltersArr.lenstype),
    option: new Set(colFiltersArr.option),
    finishtype: new Set(colFiltersArr.finishtype),
  }), [colFiltersArr]);

  // Reset col filters on filterVersion bump (Clear Filters)
  useEffect(() => {
    if (filterVersion !== undefined) {
      const empty = emptyColFilters;
      setColFiltersLocal(empty);
      onColFiltersChange?.(empty);
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

  // Build unique options for each column filter
  const columnOptions = useMemo(() => {
    const collect = (key: ColumnFilterKey) => {
      const map = new Map<string, string>();
      for (const l of lenses) {
        if (key === "option") {
          for (const o of l.lens_lens_options ?? []) {
            const n = o.lens_option?.name ?? "";
            if (n && !map.has(n)) map.set(n, n);
          }
          continue;
        }
        const name = fkName(l[key]);
        if (name && !map.has(name)) map.set(name, name);
      }
      return Array.from(map.entries()).map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
    };
    return {
      supplier: collect("supplier"), brand: collect("brand"), material: collect("material"),
      mftype: collect("mftype"), lenstype: collect("lenstype"), option: collect("option"), finishtype: collect("finishtype"),
    };
  }, [lenses]);

  const applyStatusFilter = useCallback((items: Lens[], targetFilter: Filter) => {
    if (targetFilter === "active") return items.filter((i) => i.is_active);
    if (targetFilter === "inactive") return items.filter((i) => !i.is_active);
    if (targetFilter === "web") return items.filter((i) => i.show_on_website);
    if (targetFilter === "zero_cost") return items.filter((i) => i.base_price === 0);
    if (targetFilter === "zero_sell") return items.filter((i) => i.sell_price === 0);
    return items;
  }, []);

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

  const filterCounts = useMemo(() => ({
    active: applyStatusFilter(baseFiltered, "active").length,
    inactive: applyStatusFilter(baseFiltered, "inactive").length,
    all: baseFiltered.length,
    web: applyStatusFilter(baseFiltered, "web").length,
    zero_cost: applyStatusFilter(baseFiltered, "zero_cost").length,
    zero_sell: applyStatusFilter(baseFiltered, "zero_sell").length,
  }), [baseFiltered, applyStatusFilter]);

  const filtered = useMemo(() => {
    const items = applyStatusFilter(baseFiltered, filter);
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
  }, [baseFiltered, filter, sortKey, sortDir, applyStatusFilter]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const filterTabs: { label: string; value: Filter; count: number }[] = [
    { label: "Active", value: "active", count: filterCounts.active },
    { label: "Inactive", value: "inactive", count: filterCounts.inactive },
    { label: "All", value: "all", count: filterCounts.all },
    { label: "Web", value: "web", count: filterCounts.web },
    { label: "Zero Cost", value: "zero_cost", count: filterCounts.zero_cost },
    { label: "Zero Sell", value: "zero_sell", count: filterCounts.zero_sell },
  ];

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
      {label}<ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const FilterHeader = ({ label, k, sortK }: { label: string; k: ColumnFilterKey; sortK: SortKey }) => (
    <div className="flex items-center gap-1">
      <button className="flex items-center gap-0.5 hover:text-foreground" onClick={() => toggleSort(sortK)}>
        {label}<ArrowUpDown className="h-3 w-3" />
      </button>
      <MultiSelectFilter
        label=""
        options={columnOptions[k]}
        selected={colFilters[k]}
        onChange={(v) => setColFilter(k, v)}
      />
    </div>
  );

  const currency = (v: number) => `$${Number(v).toFixed(2)}`;
  const showActions = unlocked && canEditCatalog;
  const costCols = showCost ? 1 : 0;
  const colCount = 14 + costCols + (showActions ? 2 : 0);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex gap-1">
        {filterTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
            className="px-2.5 py-1 text-xs font-medium rounded transition-colors"
            style={{
              background: filter === t.value ? "hsl(var(--admin-accent) / 0.12)" : "transparent",
              color: filter === t.value ? "hsl(var(--admin-accent))" : "hsl(var(--admin-muted-fg))",
            }}
          >
            {`${t.label} (${t.count})`}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-xs py-1" style={{ color: "hsl(var(--admin-muted-fg))" }}>
          {canEditCatalog && (
            <button
              onClick={() => setUnlocked((u) => !u)}
              className="p-0.5 transition-colors hover:bg-muted/50"
              title={unlocked ? "Lock actions" : "Unlock actions"}
            >
              {unlocked ? <Unlock className="h-3.5 w-3.5" style={{ color: "hsl(var(--admin-warning))" }} /> : <Lock className="h-3.5 w-3.5" />}
            </button>
          )}
          {visibleCount < filtered.length ? `${visibleCount} of ` : ""}{filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

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
              <TableHead className="text-center text-[10px]">PL</TableHead>
              <TableHead className="text-center text-[10px]">Lab</TableHead>
              <TableHead className="text-center text-[10px]">WSPL</TableHead>
              <TableHead className="text-center text-[10px]">Web</TableHead>
              {showActions && <TableHead />}
              {showActions && <TableHead className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--admin-muted-fg))" }}>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-8 text-xs" style={{ color: "hsl(var(--admin-muted-fg))" }}>
                  No lenses found.
                </TableCell>
              </TableRow>
            ) : (
              visibleItems.map((lens, idx) => {
                const cost = lens.base_price;
                const sell = lens.sell_price;
                let rowBg = idx % 2 === 1 ? "hsl(var(--admin-table-row-alt))" : undefined;
                if (cost === 0) rowBg = "hsl(var(--admin-table-row-risk))";
                else if (sell > 0 && sell <= cost * fxRate) rowBg = "hsl(var(--admin-table-row-loss))";
                else if (sell > 0) {
                  const fullCostApprox = cost * fxRate * 1.15;
                  const margin = (sell - fullCostApprox) / sell;
                  if (margin < 0.15) rowBg = "hsl(var(--admin-table-row-warning))";
                }
                return (
                  <TableRow key={lens.id} className={canEditCatalog ? "cursor-pointer hover:bg-[hsl(var(--admin-muted))]" : "hover:bg-[hsl(var(--admin-muted))]"} style={rowBg ? { background: rowBg } : undefined} onClick={() => canEditCatalog && onRowClick(lens)}>
                    <TableCell className="font-medium text-xs">
                      <span className="flex items-center gap-1.5">
                        {lens.name}
                        {usedItems.has(lens.id) && (
                          <span title="Used in a pricelist" className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full shrink-0" style={{ background: "hsl(var(--admin-accent))", color: "hsl(var(--admin-accent-fg))" }}>
                            <ListChecks className="h-2 w-2" />
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{fkName(lens.supplier)}</TableCell>
                    <TableCell className="text-xs">{fkName(lens.brand)}</TableCell>
                    <TableCell className="text-xs">{fkName(lens.material)}</TableCell>
                    <TableCell className="text-xs">{fkName(lens.mftype)}</TableCell>
                    <TableCell className="text-xs">{fkName(lens.lenstype)}</TableCell>
                    <TableCell className="text-xs">{optionNames(lens) || "—"}</TableCell>
                    <TableCell className="text-xs">{fkName(lens.finishtype)}</TableCell>
                    {showCost && <TableCell className="text-xs">{currency(lens.base_price)}</TableCell>}
                    <TableCell className="text-xs font-semibold">{currency(lens.sell_price)}</TableCell>
                    <TableCell className="text-xs" style={{ color: "hsl(var(--admin-muted-fg))" }}>{fxRate > 0 ? currency(lens.sell_price / fxRate) : "—"}</TableCell>
                    <TableCell className="text-center text-xs">{(lens.show_in_pricelist || usedItems.has(lens.id)) ? "✓" : ""}</TableCell>
                    <TableCell className="text-center text-xs">{lens.full_lab ? "✓" : ""}</TableCell>
                    <TableCell className="text-center text-xs">{lens.show_in_ws_pricelist ? "✓" : ""}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      {lens.show_on_website && <Globe className="h-3.5 w-3.5 mx-auto" style={{ color: "hsl(var(--admin-accent))" }} />}
                    </TableCell>
                    {showActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch checked={lens.is_active} onCheckedChange={() => onToggleActive(lens)} className="scale-75" />
                      </TableCell>
                    )}
                    {showActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
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
              })
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
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LensDataTable;
