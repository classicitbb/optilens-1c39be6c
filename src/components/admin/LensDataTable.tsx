import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowUpDown } from "lucide-react";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import type { Lens } from "@/hooks/useLenses";

type SortKey = "name" | "supplier" | "brand" | "index_value" | "base_price" | "sell_price" | "is_active";
type SortDir = "asc" | "desc";
type Filter = "all" | "active" | "inactive";

interface Props {
  lenses: Lens[];
  search: string;
  onRowClick: (lens: Lens) => void;
  onToggleActive: (lens: Lens) => void;
}

const fkName = (fk: { name: string } | null) => fk?.name ?? "";

const LensDataTable = ({ lenses, search, onRowClick, onToggleActive }: Props) => {
  const { canEdit } = useAdminRole();
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let items = lenses;
    if (filter === "active") items = items.filter((i) => i.is_active);
    if (filter === "inactive") items = items.filter((i) => !i.is_active);
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
        default: av = a[sortKey] as any; bv = b[sortKey] as any;
      }
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [lenses, filter, search, sortKey, sortDir]);

  const filterTabs: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ];

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
      {label}<ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const currency = (v: number) => `$${Number(v).toFixed(2)}`;

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {filterTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setFilter(t.value)}
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
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="border rounded" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader label="Name" k="name" /></TableHead>
              <TableHead><SortHeader label="Supplier" k="supplier" /></TableHead>
              <TableHead><SortHeader label="Brand" k="brand" /></TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Lens Type</TableHead>
              <TableHead><SortHeader label="Index" k="index_value" /></TableHead>
              <TableHead><SortHeader label="Base" k="base_price" /></TableHead>
              <TableHead><SortHeader label="Sell" k="sell_price" /></TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 10 : 9} className="text-center py-8 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                  No lenses found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lens) => (
                <TableRow key={lens.id} className="cursor-pointer" onClick={() => onRowClick(lens)}>
                  <TableCell className="font-medium text-xs">{lens.name}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.supplier)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.brand)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.material)}</TableCell>
                  <TableCell className="text-xs">{fkName(lens.lenstype)}</TableCell>
                  <TableCell className="text-xs">{Number(lens.index_value).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{currency(lens.base_price)}</TableCell>
                  <TableCell className="text-xs">{currency(lens.sell_price)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-0 font-medium"
                      style={{
                        background: lens.is_active ? "hsl(142 71% 45% / 0.1)" : "hsl(215 10% 92%)",
                        color: lens.is_active ? "hsl(142 71% 35%)" : "hsl(215 15% 50%)",
                      }}
                    >
                      {lens.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch checked={lens.is_active} onCheckedChange={() => onToggleActive(lens)} className="scale-75" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LensDataTable;
