import { useState, useMemo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowUpDown, Globe } from "lucide-react";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import type { Lens } from "@/hooks/useLenses";

type SortKey = "name" | "supplier" | "brand" | "finishtype" | "base_price" | "sell_price" | "is_active";
type SortDir = "asc" | "desc";
type Filter = "all" | "active" | "inactive" | "web";

interface Props {
  lenses: Lens[];
  search: string;
  onRowClick: (lens: Lens) => void;
  onToggleActive: (lens: Lens) => void;
}

const fkName = (fk: { name: string } | null) => fk?.name ?? "";

const LensDataTable = ({ lenses, search, onRowClick, onToggleActive }: Props) => {
  const { canEdit } = useAdminRole();
  const { settings } = usePricingEngine();
  const [filter, setFilter] = useState<Filter>("active");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visibleCount, setVisibleCount] = useState(50);

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

  const filtered = useMemo(() => {
    let items = lenses;
    if (filter === "active") items = items.filter((i) => i.is_active);
    else if (filter === "inactive") items = items.filter((i) => !i.is_active);
    else if (filter === "web") items = items.filter((i) => i.show_on_website);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        fkName(i.supplier).toLowerCase().includes(q) ||
        fkName(i.brand).toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortKey) {
        case "supplier": av = fkName(a.supplier); bv = fkName(b.supplier); break;
        case "brand": av = fkName(a.brand); bv = fkName(b.brand); break;
        case "finishtype": av = fkName(a.finishtype); bv = fkName(b.finishtype); break;
        default: av = a[sortKey] as any; bv = b[sortKey] as any;
      }
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [lenses, filter, search, sortKey, sortDir]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const filterTabs: { label: string; value: Filter }[] = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "All", value: "all" },
    { label: "Web", value: "web" },
  ];

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
      {label}<ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const currency = (v: number) => `$${Number(v).toFixed(2)}`;
  const colCount = canEdit ? 14 : 13;

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

      <div className="border rounded overflow-auto" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)", maxHeight: "calc(100vh - 280px)" }}>
        <Table>
          <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(0 0% 100%)", boxShadow: "inset 0 -1px 0 hsl(215 15% 85%)" }}>
            <TableRow>
              <TableHead><SortHeader label="Name" k="name" /></TableHead>
              <TableHead><SortHeader label="Supplier" k="supplier" /></TableHead>
              <TableHead><SortHeader label="Brand" k="brand" /></TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Lens Type</TableHead>
              <TableHead><SortHeader label="Finish Type" k="finishtype" /></TableHead>
              <TableHead><SortHeader label="Cost (USD)" k="base_price" /></TableHead>
              <TableHead><SortHeader label="Sell (BBD)" k="sell_price" /></TableHead>
              <TableHead>Sell (USD)</TableHead>
              <TableHead className="text-center text-[10px]">PL</TableHead>
              <TableHead className="text-center text-[10px]">Lab</TableHead>
              <TableHead className="text-center text-[10px]">WSPL</TableHead>
              <TableHead className="text-center text-[10px]">Web</TableHead>
              {canEdit && <TableHead />}
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
              visibleItems.map((lens) => (
                <TableRow key={lens.id} className="cursor-pointer" onClick={() => onRowClick(lens)}>
                  <TableCell className="font-medium text-xs">{lens.name}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.supplier)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.brand)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.material)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.lenstype)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.finishtype)}</TableCell>
                  <TableCell className="text-xs">{currency(lens.base_price)}</TableCell>
                  <TableCell className="text-xs">{currency(lens.sell_price)}</TableCell>
                  <TableCell className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>{fxRate > 0 ? currency(lens.sell_price / fxRate) : "—"}</TableCell>
                  <TableCell className="text-center text-xs">{lens.show_in_pricelist ? "✓" : ""}</TableCell>
                  <TableCell className="text-center text-xs">{lens.full_lab ? "✓" : ""}</TableCell>
                  <TableCell className="text-center text-xs">{lens.show_in_ws_pricelist ? "✓" : ""}</TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    {lens.show_on_website && <Globe className="h-3.5 w-3.5 mx-auto" style={{ color: "hsl(215 65% 50%)" }} />}
                  </TableCell>
                  {canEdit && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch checked={lens.is_active} onCheckedChange={() => onToggleActive(lens)} className="scale-75" />
                    </TableCell>
                  )}
                </TableRow>
              ))
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
