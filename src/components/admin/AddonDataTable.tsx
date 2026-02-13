import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Globe } from "lucide-react";
import type { Addon } from "@/hooks/useAddons";
import { useMemo, useState } from "react";
import { usePricingEngine } from "@/hooks/usePricingEngine";

interface Props {
  addons: Addon[];
  search: string;
  canEdit: boolean;
  onRowClick: (addon: Addon) => void;
  onToggleActive: (addon: Addon) => void;
  onDuplicate: (addon: Addon) => void;
  onDelete: (addon: Addon) => void;
  canDelete: boolean;
}

const PAGE_SIZE = 50;

const CATEGORY_LABELS: Record<string, string> = {
  coating: "Coating",
  mirror: "Mirror",
  ar_coating: "AR Coating",
  prism: "Prism",
  high_power: "High Power",
  other: "Other",
};

const AddonDataTable = ({ addons, search, canEdit, onRowClick, onToggleActive, onDuplicate, onDelete, canDelete }: Props) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { settings } = usePricingEngine();

  const fxRate = useMemo(() => {
    if (!settings) return 2;
    const rates = settings.fx_rates as Record<string, number>;
    return (rates["USD"] ?? 1) * (1 + settings.fx_risk_buffer);
  }, [settings]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return addons.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.sku.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.supplier_name ?? "").toLowerCase().includes(q)
    );
  }, [addons, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const thCls = "text-[11px] font-semibold uppercase tracking-wider py-2 px-3 sticky top-0 z-10";
  const tdCls = "text-xs py-1.5 px-3 whitespace-nowrap";

  return (
    <div className="rounded border overflow-auto max-h-[calc(100vh-220px)]" style={{ borderColor: "hsl(215 20% 88%)" }}>
      <Table>
        <TableHeader>
          <TableRow style={{ background: "hsl(215 30% 96%)" }}>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Name</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>SKU</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Supplier</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Category</TableHead>
            <TableHead className={`${thCls} text-right`} style={{ color: "hsl(215 15% 45%)" }}>Cost (USD)</TableHead>
            <TableHead className={`${thCls} text-right`} style={{ color: "hsl(215 15% 45%)" }}>Sell (BBD)</TableHead>
            <TableHead className={`${thCls} text-right`} style={{ color: "hsl(215 15% 45%)" }}>Sell (USD)</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Type</TableHead>
            <TableHead className={`${thCls} text-center`} style={{ color: "hsl(215 15% 45%)" }}>Web</TableHead>
            <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Order</TableHead>
            {canEdit && <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Active</TableHead>}
            {canEdit && <TableHead className={thCls} style={{ color: "hsl(215 15% 45%)" }}>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((a) => (
            <TableRow
              key={a.id}
              className={canEdit ? "cursor-pointer hover:bg-blue-50/60" : "hover:bg-blue-50/60"}
              onClick={() => canEdit && onRowClick(a)}
            >
              <TableCell className={`${tdCls} font-medium max-w-[240px] truncate`} style={{ color: "hsl(215 30% 15%)" }}>{a.name}</TableCell>
              <TableCell className={tdCls} style={{ color: "hsl(215 15% 50%)" }}>{a.sku || "—"}</TableCell>
              <TableCell className={tdCls} style={{ color: "hsl(215 15% 50%)" }}>{a.supplier_name ?? "—"}</TableCell>
              <TableCell className={tdCls}>{CATEGORY_LABELS[a.category] || a.category}</TableCell>
              <TableCell className={`${tdCls} text-right`}>{a.cost.toFixed(2)}</TableCell>
              <TableCell className={`${tdCls} text-right font-medium`}>{a.price.toFixed(2)}</TableCell>
              <TableCell className={`${tdCls} text-right`} style={{ color: "hsl(215 15% 50%)" }}>{fxRate > 0 ? (a.price / fxRate).toFixed(2) : "—"}</TableCell>
              <TableCell className={tdCls}>
                <span
                  className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    background: a.is_auto ? "hsl(25 90% 92%)" : "hsl(215 30% 93%)",
                    color: a.is_auto ? "hsl(25 80% 40%)" : "hsl(215 15% 45%)",
                  }}
                >
                  {a.is_auto ? "Auto" : "Optional"}
                </span>
              </TableCell>
              <TableCell className={`${tdCls} text-center`}>
                {a.show_on_website && <Globe className="h-3.5 w-3.5 mx-auto" style={{ color: "hsl(150 60% 40%)" }} />}
              </TableCell>
              <TableCell className={tdCls} style={{ color: "hsl(215 15% 50%)" }}>{a.sort_order}</TableCell>
              {canEdit && (
                <TableCell className={tdCls} onClick={(e) => e.stopPropagation()}>
                  <Switch checked={a.is_active} onCheckedChange={() => onToggleActive(a)} />
                </TableCell>
              )}
              {canEdit && (
                <TableCell className={tdCls} onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicate" onClick={() => onDuplicate(a)}>
                      <Copy className="h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Delete" onClick={() => onDelete(a)}>
                        <Trash2 className="h-3.5 w-3.5" style={{ color: "hsl(0 60% 50%)" }} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {visible.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 12 : 10} className="text-center text-xs py-8" style={{ color: "hsl(215 15% 50%)" }}>
                No add-ons found.
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
  );
};

export default AddonDataTable;
