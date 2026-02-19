import { useState, useMemo, useCallback, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowUpDown, Globe, Lock, Unlock, Copy, Trash2 } from "lucide-react";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import MultiSelectFilter from "./MultiSelectFilter";
import type { Lens } from "@/hooks/useLenses";

type SortKey = "name" | "supplier" | "brand" | "material" | "mftype" | "lenstype" | "option" | "finishtype" | "base_price" | "sell_price" | "sell_usd";
type SortDir = "asc" | "desc";
type Filter = "all" | "active" | "inactive" | "web" | "zero_cost" | "zero_sell";

interface Props {
  lenses: Lens[];
  search: string;
  filterVersion?: number;
  onRowClick: (lens: Lens) => void;
  onToggleActive: (lens: Lens) => void;
  onDuplicate?: (lens: Lens) => void;
  onDelete?: (lens: Lens) => void;
  canDelete?: boolean;
}

const fkName = (fk: { name: string } | null) => fk?.name ?? "";
const fkAbbrev = (fk: { abbrev?: string } | null) => fk?.abbrev ?? "";
const optionNames = (lens: Lens) =>
  (lens.lens_lens_options ?? [])
    .map((o) => o.lens_option?.name ?? "")
    .filter(Boolean)
    .join(", ");
const optionAbbrevs = (lens: Lens) =>
  (lens.lens_lens_options ?? [])
    .map((o) => o.lens_option?.abbrev ?? "")
    .filter(Boolean)
    .join(", ");

type ColumnFilterKey = "supplier" | "brand" | "material" | "mftype" | "lenstype" | "option" | "finishtype";

const LensDataTable = ({ lenses, search, filterVersion, onRowClick, onToggleActive, onDuplicate, onDelete, canDelete }: Props) => {
  const { canEdit } = useAdminRole();
  const { canEditFeature } = useRolePermissions();
  const canEditCatalog = canEditFeature("catalog");
  const showCost = canEdit;
  const { settings } = usePricingEngine();
  const [filter, setFilter] = useState<Filter>("active");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visibleCount, setVisibleCount] = useState(50);
  const [unlocked, setUnlocked] = useState(false);

  const emptyColFilters: Record<ColumnFilterKey, Set<string>> = { supplier: new Set(), brand: new Set(), material: new Set(), mftype: new Set(), lenstype: new Set(), option: new Set(), finishtype: new Set() };
  const [colFilters, setColFilters] = useState<Record<ColumnFilterKey, Set<string>>>(emptyColFilters);

  useEffect(() => {
    if (filterVersion !== undefined) setColFilters({ supplier: new Set(), brand: new Set(), material: new Set(), mftype: new Set(), lenstype: new Set(), option: new Set(), finishtype: new Set() });
  }, [filterVersion]);

  const setColFilter = useCallback((key: ColumnFilterKey, val: Set<string>) => {
    setColFilters((prev) => ({ ...prev, [key]: val }));
    setVisibleCount(50);
  }, []);

  const fxRate = useMemo(() => {
    if (!settings) return 2;
    const rates = settings.fx_rates as Record<string, number>;
    return (rates["USD"] ?? 1) * (1 + settings.fx_risk_buffer);
  }, [settings]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setVisibleCount(50);
  };

  const handleFilterChange = useCallback((f: Filter) => {
    setFilter(f);
    setVisibleCount(50);
  }, []);

  // Build unique options for each column filter
  const columnOptions = useMemo(() => {
    const collect = (key: ColumnFilterKey) => {
      const map = new Map<string, string>();
      for (const l of lenses) {
        let name = "";
        if (key === "option") {
          for (const o of l.lens_lens_options ?? []) {
            const n = o.lens_option?.name ?? "";
            if (n && !map.has(n)) map.set(n, n);
          }
          continue;
        }
        name = fkName(l[key]);
        if (name && !map.has(name)) map.set(name, name);
      }
      return Array.from(map.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    };
    return {
      supplier: collect("supplier"),
      brand: collect("brand"),
      material: collect("material"),
      mftype: collect("mftype"),
      lenstype: collect("lenstype"),
      option: collect("option"),
      finishtype: collect("finishtype"),
    };
  }, [lenses]);

  const filtered = useMemo(() => {
    let items = lenses;
    if (filter === "active") items = items.filter((i) => i.is_active);
    else if (filter === "inactive") items = items.filter((i) => !i.is_active);
    else if (filter === "web") items = items.filter((i) => i.show_on_website);
    else if (filter === "zero_cost") items = items.filter((i) => i.base_price === 0);
    else if (filter === "zero_sell") items = items.filter((i) => i.sell_price === 0);

    // Apply column filters
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
        i.name.toLowerCase().includes(q) ||
        fkName(i.supplier).toLowerCase().includes(q) ||
        fkAbbrev(i.supplier).toLowerCase().includes(q) ||
        fkName(i.brand).toLowerCase().includes(q) ||
        fkAbbrev(i.brand).toLowerCase().includes(q) ||
        fkName(i.material).toLowerCase().includes(q) ||
        fkAbbrev(i.material).toLowerCase().includes(q) ||
        fkName(i.lenstype).toLowerCase().includes(q) ||
        fkAbbrev(i.lenstype).toLowerCase().includes(q) ||
        fkName(i.finishtype).toLowerCase().includes(q) ||
        fkAbbrev(i.finishtype).toLowerCase().includes(q) ||
        fkName(i.mftype).toLowerCase().includes(q) ||
        fkAbbrev(i.mftype).toLowerCase().includes(q) ||
        optionNames(i).toLowerCase().includes(q) ||
        optionAbbrevs(i).toLowerCase().includes(q) ||
        (i.notes ?? "").toLowerCase().includes(q)
      );
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
  }, [lenses, filter, search, sortKey, sortDir, colFilters]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const filterTabs: { label: string; value: Filter }[] = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "All", value: "all" },
    { label: "Web", value: "web" },
    { label: "Zero Cost", value: "zero_cost" },
    { label: "Zero Sell", value: "zero_sell" },
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
          {canEditCatalog && (
            <button
              onClick={() => setUnlocked((u) => !u)}
              className="p-0.5 rounded transition-colors hover:bg-black/5"
              title={unlocked ? "Lock actions" : "Unlock actions"}
            >
              {unlocked ? <Unlock className="h-3.5 w-3.5" style={{ color: "hsl(35 80% 50%)" }} /> : <Lock className="h-3.5 w-3.5" />}
            </button>
          )}
          {visibleCount < filtered.length ? `${visibleCount} of ` : ""}{filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border rounded overflow-auto" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)", maxHeight: "calc(100vh - 280px)" }}>
        <Table>
          <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(0 0% 100%)", boxShadow: "inset 0 -1px 0 hsl(215 15% 85%)" }}>
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
              {showActions && <TableHead className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "hsl(215 15% 45%)" }}>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-8 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                  No lenses found.
                </TableCell>
              </TableRow>
            ) : (
              visibleItems.map((lens, idx) => {
                const cost = lens.base_price;
                const sell = lens.sell_price;
                let rowBg = idx % 2 === 1 ? "hsl(215 20% 97%)" : undefined;
                if (cost === 0) rowBg = "hsl(0 70% 96%)";
                else if (sell > 0 && sell <= cost * fxRate) rowBg = "hsl(0 70% 95%)";
                else if (sell > 0) {
                  const fullCostApprox = cost * fxRate * 1.15;
                  const margin = (sell - fullCostApprox) / sell;
                  if (margin < 0.15) rowBg = "hsl(45 80% 94%)";
                }
                return (
                <TableRow key={lens.id} className={canEditCatalog ? "cursor-pointer" : ""} style={rowBg ? { background: rowBg } : undefined} onClick={() => canEditCatalog && onRowClick(lens)}>
                  <TableCell className="font-medium text-xs">{lens.name}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.supplier)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.brand)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.material)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.mftype)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.lenstype)}</TableCell>
                  <TableCell className="text-xs">{optionNames(lens) || "—"}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.finishtype)}</TableCell>
                   {showCost && <TableCell className="text-xs">{currency(lens.base_price)}</TableCell>}
                  <TableCell className="text-xs font-semibold">{currency(lens.sell_price)}</TableCell>
                  <TableCell className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>{fxRate > 0 ? currency(lens.sell_price / fxRate) : "—"}</TableCell>
                  <TableCell className="text-center text-xs">{lens.show_in_pricelist ? "✓" : ""}</TableCell>
                  <TableCell className="text-center text-xs">{lens.full_lab ? "✓" : ""}</TableCell>
                  <TableCell className="text-center text-xs">{lens.show_in_ws_pricelist ? "✓" : ""}</TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    {lens.show_on_website && <Globe className="h-3.5 w-3.5 mx-auto" style={{ color: "hsl(215 65% 50%)" }} />}
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
                          <Copy className="h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
                        </Button>
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Delete" onClick={() => onDelete?.(lens)}>
                            <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(0 60% 50%)" }} />
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
                    style={{ color: "hsl(215 65% 50%)" }}
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
