import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Globe, Lock, Unlock, ArrowUpDown } from "lucide-react";
import type { Addon } from "@/hooks/useAddons";
import { useMemo, useState, useCallback, useEffect } from "react";
import MultiSelectFilter from "./MultiSelectFilter";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { usePricelistUsedItems } from "@/hooks/usePricelistUsedItems";


type Filter = "active" | "inactive" | "all" | "web";
type SortKey = "name" | "sku" | "supplier_name" | "category" | "cost" | "price" | "sell_usd" | "is_auto" | "sort_order";
type SortDir = "asc" | "desc";

interface Props {
  addons: Addon[];
  search: string;
  canEdit: boolean;
  filterVersion?: number;
  onRowClick: (addon: Addon) => void;
  onToggleActive: (addon: Addon) => void;
  onDuplicate: (addon: Addon) => void;
  onDelete: (addon: Addon) => void;
  canDelete: boolean;
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

const CATEGORY_LABELS: Record<string, string> = {
  coating: "Coating", mirror: "Mirror", ar_coating: "AR Coating",
  prism: "Prism", high_power: "High Power", other: "Other"
};

const AddonDataTable = ({
  addons, search, canEdit, filterVersion, onRowClick, onToggleActive, onDuplicate, onDelete, canDelete,
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
  const showCost = canEdit;
  const { data: usedItems = new Set<string>() } = usePricelistUsedItems();


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

  const filtered = useMemo(() => {
    let items = addons;
    if (filter === "active") items = items.filter((i) => i.is_active);
    else if (filter === "inactive") items = items.filter((i) => !i.is_active);
    else if (filter === "web") items = items.filter((i) => i.show_on_website);
    if (colFilters.supplier.size > 0) items = items.filter((i) => colFilters.supplier.has(i.supplier_name ?? "—"));
    if (colFilters.category.size > 0) items = items.filter((i) => colFilters.category.has(CATEGORY_LABELS[i.category] || i.category));
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((a) =>
        a.name.toLowerCase().includes(q) || a.sku.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) || (CATEGORY_LABELS[a.category] ?? "").toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) || (a.supplier_name ?? "").toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "sell_usd": av = fxRate > 0 ? a.price / fxRate : 0; bv = fxRate > 0 ? b.price / fxRate : 0; break;
        case "supplier_name": av = a.supplier_name ?? ""; bv = b.supplier_name ?? ""; break;
        case "is_auto": av = a.is_auto ? 1 : 0; bv = b.is_auto ? 1 : 0; break;
        default: av = a[sortKey] as any; bv = b[sortKey] as any;
      }
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [addons, search, filter, sortKey, sortDir, fxRate, colFilters]);

  const supplierOptions = useMemo(() => [...new Set(addons.map((a) => a.supplier_name ?? "—"))].sort().map((v) => ({ value: v, label: v })), [addons]);
  const categoryOptions = useMemo(() => [...new Set(addons.map((a) => CATEGORY_LABELS[a.category] || a.category))].sort().map((v) => ({ value: v, label: v })), [addons]);

  const filterTabs: { label: string; value: Filter }[] = [
    { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" },
    { label: "All", value: "all" }, { label: "Web", value: "web" },
  ];

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const showActions = unlocked && canEdit;
  const thCls = "text-[11px] font-semibold uppercase tracking-wider py-2 px-3 sticky top-0 z-10";
  const tdCls = "text-xs py-1.5 px-3 whitespace-nowrap";

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
      {label}<ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {filterTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => handleFilterChange(t.value)}
            className="px-2.5 py-1 text-xs font-medium rounded transition-colors"
            style={{
              background: filter === t.value ? "hsl(215 65% 50% / 0.1)" : "transparent",
              color: filter === t.value ? "hsl(215 65% 50%)" : "hsl(215 15% 50%)",
            }}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-xs py-1" style={{ color: "hsl(215 15% 50%)" }}>
          {canEdit && (
            <button onClick={() => setUnlocked((u) => !u)} className="p-0.5 rounded transition-colors hover:bg-black/5" title={unlocked ? "Lock actions" : "Unlock actions"}>
              {unlocked ? <Unlock className="h-3.5 w-3.5" style={{ color: "hsl(35 80% 50%)" }} /> : <Lock className="h-3.5 w-3.5" />}
            </button>
          )}
          {visibleCount < filtered.length ? `${visibleCount} of ` : ""}{filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="rounded border overflow-auto max-h-[calc(100vh-280px)]" style={{ borderColor: "hsl(215 20% 88%)" }}>
        <Table>
          <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(215 30% 96%)" }}>
            <TableRow style={{ background: "hsl(215 30% 96%)" }}>
              <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}><SortHeader label="Name" k="name" /></TableHead>
              <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}><SortHeader label="SKU" k="sku" /></TableHead>
              <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>
                <MultiSelectFilter label="Supplier" options={supplierOptions} selected={colFilters.supplier} onChange={(v) => setColFilter("supplier", v)} />
              </TableHead>
              <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>
                <MultiSelectFilter label="Category" options={categoryOptions} selected={colFilters.category} onChange={(v) => setColFilter("category", v)} />
              </TableHead>
              {showCost && <TableHead className={`${thCls} text-right`} style={{ color: "hsl(215 15% 45%)" }}><SortHeader label="Cost (USD)" k="cost" /></TableHead>}
              <TableHead className={`${thCls} text-right`} style={{ color: "hsl(215 15% 45%)" }}><SortHeader label="Sell (BBD)" k="price" /></TableHead>
              <TableHead className={`${thCls} text-right`} style={{ color: "hsl(215 15% 45%)" }}><SortHeader label="Sell (USD)" k="sell_usd" /></TableHead>
              <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}><SortHeader label="Type" k="is_auto" /></TableHead>
              <TableHead className={`${thCls} text-center`} style={{ color: "hsl(215 15% 45%)" }}>Web</TableHead>
              <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}><SortHeader label="Order" k="sort_order" /></TableHead>
              {showActions && <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Active</TableHead>}
              {showActions && <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((a, idx) => {
              let rowBg = idx % 2 === 1 ? "hsl(215 20% 97%)" : undefined;
              if (a.cost === 0) rowBg = "hsl(0 70% 96%)";
              else if (a.price > 0 && a.price <= a.cost * fxRate) rowBg = "hsl(0 70% 95%)";
              else if (a.price > 0) {
                const fullCostApprox = a.cost * fxRate * 1.15;
                const margin = (a.price - fullCostApprox) / a.price;
                if (margin < 0.15) rowBg = "hsl(45 80% 94%)";
              }
              return (
                <TableRow key={a.id} className={canEdit ? "cursor-pointer hover:bg-blue-50/60" : "hover:bg-blue-50/60"} style={rowBg ? { background: rowBg } : undefined} onClick={() => canEdit && onRowClick(a)}>
                  <TableCell className={`${tdCls} font-medium max-w-[240px]`} style={{ color: "hsl(215 30% 15%)" }}>
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{a.name}</span>
                      {usedItems.has(a.id) && (
                        <span title="Used in a pricelist" className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full shrink-0" style={{ background: "hsl(215 65% 50%)", color: "white", fontSize: "8px", fontWeight: 700 }}>P</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className={tdCls} style={{ color: "hsl(215 15% 50%)" }}>{a.sku || "—"}</TableCell>
                  <TableCell className={tdCls} style={{ color: "hsl(215 15% 50%)" }}>{a.supplier_name ?? "—"}</TableCell>
                  <TableCell className={tdCls}>{CATEGORY_LABELS[a.category] || a.category}</TableCell>
                  {showCost && <TableCell className={`${tdCls} text-right`}>{a.cost.toFixed(2)}</TableCell>}
                  <TableCell className={`${tdCls} text-right font-medium`}>{a.price.toFixed(2)}</TableCell>
                  <TableCell className={`${tdCls} text-right`} style={{ color: "hsl(215 15% 50%)" }}>{fxRate > 0 ? (a.price / fxRate).toFixed(2) : "—"}</TableCell>
                  <TableCell className={tdCls}>
                    <span className="inline-block text-[10px] font-medium px-1.5 rounded py-px" style={{ background: a.is_auto ? "hsl(25 90% 92%)" : "hsl(215 30% 93%)", color: a.is_auto ? "hsl(25 80% 40%)" : "hsl(215 15% 45%)" }}>
                      {a.is_auto ? "Auto" : "Optional"}
                    </span>
                  </TableCell>
                  <TableCell className={`${tdCls} text-center`}>
                    {a.show_on_website && <Globe className="h-3.5 w-3.5 mx-auto" style={{ color: "hsl(150 60% 40%)" }} />}
                  </TableCell>
                  <TableCell className={tdCls} style={{ color: "hsl(215 15% 50%)" }}>{a.sort_order}</TableCell>
                  {showActions && <TableCell className={tdCls} onClick={(e) => e.stopPropagation()}><Switch checked={a.is_active} onCheckedChange={() => onToggleActive(a)} /></TableCell>}
                  {showActions && (
                    <TableCell className={tdCls} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicate" onClick={() => onDuplicate(a)}><Copy className="h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} /></Button>
                        {canDelete && <Button variant="ghost" size="icon" className="h-6 w-6" title="Delete" onClick={() => onDelete(a)}><Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(0 60% 50%)" }} /></Button>}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? (showActions ? 12 : 11) : 10} className="text-center text-xs py-8" style={{ color: "hsl(215 15% 50%)" }}>No add-ons found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {hasMore && (
          <div className="flex justify-center py-2 border-t" style={{ borderColor: "hsl(215 20% 88%)" }}>
            <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="text-xs font-medium px-3 py-1 rounded hover:bg-blue-50" style={{ color: "hsl(215 65% 50%)" }}>
              Load more ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddonDataTable;
