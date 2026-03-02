import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Lock, Unlock, ArrowUpDown } from "lucide-react";
import type { Supply } from "@/hooks/useSupplies";
import { useMemo, useState, useCallback, useEffect } from "react";
import MultiSelectFilter from "./MultiSelectFilter";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useReferenceData } from "@/hooks/useReferenceData";
import { usePricelistUsedItems } from "@/hooks/usePricelistUsedItems";
import { fieldsMatch } from "@/lib/wildcardMatch";


type Filter = "active" | "inactive" | "all" | "web";
type SortKey = "name" | "category" | "supplier_name" | "sku" | "base_price" | "sell_price" | "sell_usd" | "unit";
type SortDir = "asc" | "desc";

interface Props {
  supplies: Supply[];
  search: string;
  canEdit: boolean;
  filterVersion?: number;
  onRowClick: (supply: Supply) => void;
  onToggleActive: (supply: Supply) => void;
  onDuplicate?: (supply: Supply) => void;
  onDelete?: (supply: Supply) => void;
  canDelete?: boolean;
  // Controlled state
  filter?: Filter;
  onFilterChange?: (f: Filter) => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onSortChange?: (key: SortKey, dir: SortDir) => void;
  colFilters?: { supplier: string[]; category: string[] };
  onColFiltersChange?: (cf: { supplier: string[]; category: string[] }) => void;
}

const PAGE_SIZE = 50;

const SupplyDataTable = ({
  supplies, search, canEdit, filterVersion, onRowClick, onToggleActive, onDuplicate, onDelete, canDelete,
  filter: filterProp, onFilterChange,
  sortKey: sortKeyProp, sortDir: sortDirProp, onSortChange,
  colFilters: colFiltersProp, onColFiltersChange,
}: Props) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filterLocal, setFilterLocal] = useState<Filter>("active");
  const [unlocked, setUnlocked] = useState(false);
  const [sortKeyLocal, setSortKeyLocal] = useState<SortKey>("name");
  const [sortDirLocal, setSortDirLocal] = useState<SortDir>("asc");
  const [colFiltersLocal, setColFiltersLocal] = useState<{ supplier: string[]; category: string[] }>({ supplier: [], category: [] });

  const filter = filterProp ?? filterLocal;
  const sortKey = sortKeyProp ?? sortKeyLocal;
  const sortDir = sortDirProp ?? sortDirLocal;
  const colFiltersArr = colFiltersProp ?? colFiltersLocal;
  const colFilters = useMemo(() => ({
    supplier: new Set(colFiltersArr.supplier),
    category: new Set(colFiltersArr.category),
  }), [colFiltersArr]);

  useEffect(() => {
    if (filterVersion !== undefined) {
      const empty = { supplier: [], category: [] };
      setColFiltersLocal(empty);
      onColFiltersChange?.(empty);
      setFilterLocal("active");
      onFilterChange?.("active");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterVersion]);

  const setColFilter = useCallback((key: "supplier" | "category", values: Set<string>) => {
    const arr = Array.from(values);
    setColFiltersLocal((prev) => ({ ...prev, [key]: arr }));
    onColFiltersChange?.({ ...colFiltersArr, [key]: arr });
    setVisibleCount(PAGE_SIZE);
  }, [colFiltersArr, onColFiltersChange]);

  const { settings } = usePricingEngine();
  const { canEditFeature } = useRolePermissions();
  const { data: supplyCategories } = useReferenceData("supply_categories");
  const { data: usedItems = new Set<string>() } = usePricelistUsedItems();

  const catLabels = useMemo(() => {
    const map: Record<string, string> = {};
    (supplyCategories ?? []).forEach((c) => {
      if (c.code) map[c.code] = c.name;
      map[c.id] = c.name;
      map[c.name] = c.name;
      if (c.name) map[c.name.toLowerCase()] = c.name;
    });
    return map;
  }, [supplyCategories]);
  const showCost = canEdit;

  const handleFilterChange = useCallback((f: Filter) => {
    setFilterLocal(f);
    onFilterChange?.(f);
    setVisibleCount(PAGE_SIZE);
  }, [onFilterChange]);

  const toggleSort = useCallback((key: SortKey) => {
    const newDir: SortDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortKeyLocal(key);
    setSortDirLocal(newDir);
    onSortChange?.(key, newDir);
    setVisibleCount(PAGE_SIZE);
  }, [sortKey, sortDir, onSortChange]);

  const fxRate = useMemo(() => {
    if (!settings) return 2;
    const rates = settings.fx_rates as Record<string, number>;
    return (rates["USD"] ?? 1) * (1 + settings.fx_risk_buffer);
  }, [settings]);

  const applyStatusFilter = useCallback((items: Supply[], targetFilter: Filter) => {
    if (targetFilter === "active") return items.filter((i) => i.is_active);
    if (targetFilter === "inactive") return items.filter((i) => !i.is_active);
    if (targetFilter === "web") return items.filter((i) => i.show_on_website);
    return items;
  }, []);

  const baseFiltered = useMemo(() => {
    let items = supplies;
    if (colFilters.supplier.size > 0) items = items.filter((i) => colFilters.supplier.has(i.supplier_name ?? "—"));
    if (colFilters.category.size > 0) items = items.filter((i) => colFilters.category.has(catLabels[i.category] || i.category));
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((s) =>
        fieldsMatch(q, s.name, s.sku, s.category, catLabels[s.category], s.description, s.supplier_name, s.unit, s.bin, s.detail)
      );
    }
    return items;
  }, [supplies, search, colFilters, catLabels]);

  const filterCounts = useMemo(() => ({
    active: applyStatusFilter(baseFiltered, "active").length,
    inactive: applyStatusFilter(baseFiltered, "inactive").length,
    all: baseFiltered.length,
    web: applyStatusFilter(baseFiltered, "web").length,
  }), [baseFiltered, applyStatusFilter]);

  const filtered = useMemo(() => {
    const items = applyStatusFilter(baseFiltered, filter);
    return [...items].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "sell_usd": av = fxRate > 0 ? a.sell_price / fxRate : 0; bv = fxRate > 0 ? b.sell_price / fxRate : 0; break;
        case "supplier_name": av = a.supplier_name ?? ""; bv = b.supplier_name ?? ""; break;
        case "sku": av = a.sku ?? ""; bv = b.sku ?? ""; break;
        case "unit": av = a.unit; bv = b.unit; break;
        default: av = a[sortKey] as any; bv = b[sortKey] as any;
      }
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [baseFiltered, filter, sortKey, sortDir, fxRate, applyStatusFilter]);

  const supplierOptions = useMemo(() => [...new Set(supplies.map((s) => s.supplier_name ?? "—"))].sort().map((v) => ({ value: v, label: v })), [supplies]);
  const categoryOptions = useMemo(() => [...new Set(supplies.map((s) => catLabels[s.category] || s.category))].sort().map((v) => ({ value: v, label: v })), [supplies, catLabels]);

  const filterTabs: { label: string; value: Filter; count: number }[] = [
    { label: "Active", value: "active", count: filterCounts.active },
    { label: "Inactive", value: "inactive", count: filterCounts.inactive },
    { label: "All", value: "all", count: filterCounts.all },
    { label: "Web", value: "web", count: filterCounts.web },
  ];

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const showActions = unlocked && canEdit;
  const thCls = "text-[11px] font-semibold uppercase tracking-wider py-2 px-3";
  const tdCls = "text-xs py-1.5 px-3 whitespace-nowrap";

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
      {label}<ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex gap-1">
        {filterTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => handleFilterChange(t.value)}
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
          {canEdit && (
            <button onClick={() => setUnlocked((u) => !u)} className="p-0.5 rounded transition-colors hover:bg-black/5" title={unlocked ? "Lock actions" : "Unlock actions"}>
              {unlocked ? <Unlock className="h-3.5 w-3.5" style={{ color: "hsl(var(--admin-warning))" }} /> : <Lock className="h-3.5 w-3.5" />}
            </button>
          )}
          {visibleCount < filtered.length ? `${visibleCount} of ` : ""}{filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="rounded border overflow-hidden flex-1 min-h-0" style={{ borderColor: "hsl(var(--admin-border))", background: "hsl(var(--admin-table-bg))" }}>
        <Table>
          <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(var(--admin-table-header-bg))" }}>
            <TableRow style={{ background: "hsl(var(--admin-table-header-bg))" }}>
              <TableHead className={thCls} style={{ color: "hsl(var(--admin-muted-fg))" }}><SortHeader label="Name" k="name" /></TableHead>
              <TableHead className={thCls} style={{ color: "hsl(var(--admin-muted-fg))" }}>
                <MultiSelectFilter label="Category" options={categoryOptions} selected={colFilters.category} onChange={(v) => setColFilter("category", v)} />
              </TableHead>
              <TableHead className={thCls} style={{ color: "hsl(var(--admin-muted-fg))" }}>
                <MultiSelectFilter label="Supplier" options={supplierOptions} selected={colFilters.supplier} onChange={(v) => setColFilter("supplier", v)} />
              </TableHead>
              <TableHead className={thCls} style={{ color: "hsl(var(--admin-muted-fg))" }}><SortHeader label="SKU" k="sku" /></TableHead>
              {showCost && <TableHead className={`${thCls} text-right`} style={{ color: "hsl(var(--admin-muted-fg))" }}><SortHeader label="Cost (USD)" k="base_price" /></TableHead>}
              <TableHead className={`${thCls} text-right`} style={{ color: "hsl(var(--admin-muted-fg))" }}><SortHeader label="Sell (BBD)" k="sell_price" /></TableHead>
              <TableHead className={`${thCls} text-right`} style={{ color: "hsl(var(--admin-muted-fg))" }}><SortHeader label="Sell (USD)" k="sell_usd" /></TableHead>
              <TableHead className={thCls} style={{ color: "hsl(var(--admin-muted-fg))" }}><SortHeader label="Unit" k="unit" /></TableHead>
              <TableHead className={thCls} style={{ color: "hsl(var(--admin-muted-fg))" }}>Web</TableHead>
              {showActions && <TableHead className={thCls} style={{ color: "hsl(var(--admin-muted-fg))" }}>Active</TableHead>}
              {showActions && <TableHead className={thCls} style={{ color: "hsl(var(--admin-muted-fg))" }}>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((s, idx) => {
              let rowBg = idx % 2 === 1 ? "hsl(var(--admin-table-row-alt))" : undefined;
              if (s.base_price === 0) rowBg = "hsl(var(--admin-table-row-risk))";
              else if (s.sell_price > 0 && s.sell_price <= s.base_price * fxRate) rowBg = "hsl(var(--admin-table-row-loss))";
              else if (s.sell_price > 0) {
                const fullCostApprox = s.base_price * fxRate * 1.15;
                const margin = (s.sell_price - fullCostApprox) / s.sell_price;
                if (margin < 0.15) rowBg = "hsl(var(--admin-table-row-warning))";
              }
              return (
                <TableRow key={s.id} className={canEdit ? "cursor-pointer hover:bg-[hsl(var(--admin-muted))]" : "hover:bg-[hsl(var(--admin-muted))]"} style={rowBg ? { background: rowBg } : undefined} onClick={() => canEdit && onRowClick(s)}>
                  <TableCell className={`${tdCls} font-medium max-w-[200px]`} style={{ color: "hsl(var(--admin-content-fg))" }}>
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{s.name}</span>
                      {usedItems.has(s.id) && (
                        <span title="Used in a pricelist" className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full shrink-0" style={{ background: "hsl(var(--admin-accent))", color: "hsl(var(--admin-accent-fg))", fontSize: "8px", fontWeight: 700 }}>P</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className={tdCls}>{catLabels[s.category] || s.category}</TableCell>
                  <TableCell className={tdCls} style={{ color: "hsl(var(--admin-muted-fg))" }}>{s.supplier_name ?? "—"}</TableCell>
                  <TableCell className={tdCls} style={{ color: "hsl(var(--admin-muted-fg))" }}>{s.sku}</TableCell>
                  {showCost && <TableCell className={`${tdCls} text-right`}>{s.base_price.toFixed(2)}</TableCell>}
                  <TableCell className={`${tdCls} text-right font-medium`}>{s.sell_price.toFixed(2)}</TableCell>
                  <TableCell className={`${tdCls} text-right`} style={{ color: "hsl(var(--admin-muted-fg))" }}>{fxRate > 0 ? (s.sell_price / fxRate).toFixed(2) : "—"}</TableCell>
                  <TableCell className={tdCls}>{s.quantity_per_unit > 1 ? `${s.quantity_per_unit}/${s.unit}` : s.unit}</TableCell>
                  <TableCell className={tdCls}>{s.show_on_website ? "✓" : ""}</TableCell>
                  {showActions && (
                    <TableCell className={tdCls} onClick={(e) => e.stopPropagation()}>
                      <Switch checked={s.is_active} onCheckedChange={() => onToggleActive(s)} />
                    </TableCell>
                  )}
                  {showActions && (
                    <TableCell className={tdCls} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicate" onClick={() => onDuplicate?.(s)}><Copy className="h-3.5 w-3.5" style={{ color: "hsl(var(--admin-muted-fg))" }} /></Button>
                        {canDelete && <Button variant="ghost" size="icon" className="h-6 w-6" title="Delete" onClick={() => onDelete?.(s)}><Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(var(--admin-destructive))" }} /></Button>}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? (showActions ? 11 : 10) : 9} className="text-center text-xs py-8" style={{ color: "hsl(var(--admin-muted-fg))" }}>No supplies found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {hasMore && (
          <div className="flex justify-center py-2 border-t" style={{ borderColor: "hsl(var(--admin-border))" }}>
            <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="text-xs font-medium px-3 py-1 rounded hover:bg-[hsl(var(--admin-muted))]" style={{ color: "hsl(var(--admin-accent))" }}>
              Load more ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplyDataTable;
