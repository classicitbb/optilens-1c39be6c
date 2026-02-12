import { useState, useMemo } from "react";
import { useReferenceData, ReferenceItem } from "@/hooks/useReferenceData";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReferenceDataModal from "./ReferenceDataModal";
import { format } from "date-fns";

type SortKey = "name" | "abbrev" | "code" | "is_active" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";
type Filter = "all" | "active" | "inactive";

interface Props {
  table: string;
  entityLabel: string;
}

const ReferenceDataTable = ({ table, entityLabel }: Props) => {
  const { data, isLoading, createMutation, updateMutation } = useReferenceData(table);
  const { canEdit } = useAdminRole();
  const { toast } = useToast();

  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReferenceItem | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let items = data ?? [];
    if (filter === "active") items = items.filter((i) => i.is_active);
    if (filter === "inactive") items = items.filter((i) => !i.is_active);
    return [...items].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : Number(av) - Number(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, filter, sortKey, sortDir]);

  const handleCreate = (values: { name: string; abbrev: string; code: string }) => {
    createMutation.mutate(values, {
      onSuccess: () => { setModalOpen(false); toast({ title: `${entityLabel} created` }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleEdit = (values: { name: string; abbrev: string; code: string }) => {
    if (!editItem) return;
    updateMutation.mutate({ id: editItem.id, updates: values }, {
      onSuccess: () => { setEditItem(null); toast({ title: `${entityLabel} updated` }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggleActive = (item: ReferenceItem) => {
    updateMutation.mutate({ id: item.id, updates: { is_active: !item.is_active } }, {
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const filterTabs: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ];

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-40"><div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} /></div>;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: "hsl(215 30% 15%)" }}>{entityLabel}</h2>
        {canEdit && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }}
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>

      {/* Filter tabs */}
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

      {/* Table */}
      <div className="border rounded" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]"><SortHeader label="Name" k="name" /></TableHead>
              <TableHead className="w-[12%]"><SortHeader label="Abbrev" k="abbrev" /></TableHead>
              <TableHead className="w-[12%]"><SortHeader label="Code" k="code" /></TableHead>
              <TableHead className="w-[12%]"><SortHeader label="Status" k="is_active" /></TableHead>
              <TableHead className="w-[16%]"><SortHeader label="Created" k="created_at" /></TableHead>
              <TableHead className="w-[16%]"><SortHeader label="Updated" k="updated_at" /></TableHead>
              {canEdit && <TableHead className="w-[4%]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-8 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow
                  key={item.id}
                  className={canEdit ? "cursor-pointer" : ""}
                  onClick={() => canEdit && setEditItem(item)}
                >
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>{item.abbrev || "—"}</TableCell>
                  <TableCell className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>{item.code || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5 border-0 font-medium"
                      style={{
                        background: item.is_active ? "hsl(142 71% 45% / 0.1)" : "hsl(215 10% 92%)",
                        color: item.is_active ? "hsl(142 71% 35%)" : "hsl(215 15% 50%)",
                      }}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                    {format(new Date(item.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                    {format(new Date(item.updated_at), "dd MMM yyyy")}
                  </TableCell>
                  {canEdit && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => handleToggleActive(item)}
                        className="scale-75"
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <ReferenceDataModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode="create"
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
        entityLabel={entityLabel}
      />
      <ReferenceDataModal
        open={!!editItem}
        onOpenChange={(open) => !open && setEditItem(null)}
        mode="edit"
        initialName={editItem?.name ?? ""}
        initialAbbrev={editItem?.abbrev ?? ""}
        initialCode={editItem?.code ?? ""}
        onSubmit={handleEdit}
        isPending={updateMutation.isPending}
        entityLabel={entityLabel}
      />
    </div>
  );
};

export default ReferenceDataTable;
