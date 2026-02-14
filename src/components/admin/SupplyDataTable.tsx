import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import type { Supply } from "@/hooks/useSupplies";
import { useMemo, useState, useCallback } from "react";
import { usePricingEngine } from "@/hooks/usePricingEngine";

type Filter = "active" | "inactive" | "all" | "web";

interface Props {
  supplies: Supply[];
  search: string;
  canEdit: boolean;
  onRowClick: (supply: Supply) => void;
  onToggleActive: (supply: Supply) => void;
}

const PAGE_SIZE = 50;

const CATEGORY_LABELS: Record<string, string> = {
  lab: "Lab",
  optical: "Optical",
  accessories: "Accessories",
};

const SupplyDataTable = ({ supplies, search, canEdit, onRowClick, onToggleActive }: Props) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filter, setFilter] = useState<Filter>("active");
  const { settings } = usePricingEngine();

  const handleFilterChange = useCallback((f: Filter) => {
    setFilter(f);
    setVisibleCount(PAGE_SIZE);
  }, []);

  // Compute FX rate for USD conversion (sell_price BBD → USD)
  const fxRate = useMemo(() => {
    if (!settings) return 2; // fallback
    const rates = settings.fx_rates as Record<string, number>;
    return (rates["USD"] ?? 1) * (1 + settings.fx_risk_buffer);
  }, [settings]);

  const filtered = useMemo(() => {
    let items = supplies;
    if (filter === "active") items = items.filter((i) => i.is_active);
    else if (filter === "inactive") items = items.filter((i) => !i.is_active);
    else if (filter === "web") items = items.filter((i) => i.show_on_website);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.sku ?? "").toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q) ||
          (s.supplier_name ?? "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [supplies, search, filter]);

  const filterTabs: { label: string; value: Filter }[] = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "All", value: "all" },
    { label: "Web", value: "web" },
  ];

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const thCls = "text-[11px] font-semibold uppercase tracking-wider py-2 px-3 sticky top-0 z-10";
  const tdCls = "text-xs py-1.5 px-3 whitespace-nowrap";

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
        <span className="ml-auto text-xs py-1" style={{ color: "hsl(215 15% 50%)" }}>
          {visibleCount < filtered.length ? `${visibleCount} of ` : ""}{filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="rounded border overflow-auto max-h-[calc(100vh-280px)]" style={{ borderColor: "hsl(215 20% 88%)" }}>
      <Table>
        <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(215 30% 96%)" }}>
          <TableRow style={{ background: "hsl(215 30% 96%)" }}>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Name</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Category</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Supplier</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>SKU</TableHead>
            <TableHead className={`${thCls} text-right`} style={{ color: "hsl(215 15% 45%)" }}>Cost (USD)</TableHead>
            <TableHead className={`${thCls} text-right`} style={{ color: "hsl(215 15% 45%)" }}>Sell (BBD)</TableHead>
            <TableHead className={`${thCls} text-right`} style={{ color: "hsl(215 15% 45%)" }}>Sell (USD)</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Unit</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Web</TableHead>
            {canEdit && <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Active</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((s, idx) => {
            let rowBg = idx % 2 === 1 ? "hsl(215 20% 97%)" : undefined;
            if (s.base_price === 0) rowBg = "hsl(0 70% 96%)";
            else if (s.sell_price > 0 && s.sell_price <= s.base_price * fxRate) rowBg = "hsl(0 70% 95%)";
            else if (s.sell_price > 0) {
              const fullCostApprox = s.base_price * fxRate * 1.15;
              const margin = (s.sell_price - fullCostApprox) / s.sell_price;
              if (margin < 0.15) rowBg = "hsl(45 80% 94%)";
            }
            return (
            <TableRow
              key={s.id}
              className={canEdit ? "cursor-pointer hover:bg-blue-50/60" : "hover:bg-blue-50/60"}
              style={rowBg ? { background: rowBg } : undefined}
              onClick={() => canEdit && onRowClick(s)}
            >
              <TableCell className={`${tdCls} font-medium max-w-[200px] truncate`} style={{ color: "hsl(215 30% 15%)" }}>{s.name}</TableCell>
              <TableCell className={tdCls}>{CATEGORY_LABELS[s.category] || s.category}</TableCell>
              <TableCell className={tdCls} style={{ color: "hsl(215 15% 50%)" }}>{s.supplier_name ?? "—"}</TableCell>
              <TableCell className={tdCls} style={{ color: "hsl(215 15% 50%)" }}>{s.sku}</TableCell>
              <TableCell className={`${tdCls} text-right`}>{s.base_price.toFixed(2)}</TableCell>
              <TableCell className={`${tdCls} text-right font-medium`}>{s.sell_price.toFixed(2)}</TableCell>
              <TableCell className={`${tdCls} text-right`} style={{ color: "hsl(215 15% 50%)" }}>{fxRate > 0 ? (s.sell_price / fxRate).toFixed(2) : "—"}</TableCell>
              <TableCell className={tdCls}>{s.quantity_per_unit > 1 ? `${s.quantity_per_unit}/${s.unit}` : s.unit}</TableCell>
              <TableCell className={tdCls}>{s.show_on_website ? "✓" : ""}</TableCell>
              {canEdit && (
                <TableCell className={tdCls} onClick={(e) => e.stopPropagation()}>
                  <Switch checked={s.is_active} onCheckedChange={() => onToggleActive(s)} />
                </TableCell>
              )}
            </TableRow>
            );
          })}
          {visible.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 10 : 9} className="text-center text-xs py-8" style={{ color: "hsl(215 15% 50%)" }}>
                No supplies found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {hasMore && (
        <div className="flex justify-center py-2 border-t" style={{ borderColor: "hsl(215 20% 88%)" }}>
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="text-xs font-medium px-3 py-1 rounded hover:bg-blue-50"
            style={{ color: "hsl(215 65% 50%)" }}
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default SupplyDataTable;
