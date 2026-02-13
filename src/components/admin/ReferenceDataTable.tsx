import { useState, useMemo, useCallback } from "react";
import { useReferenceData, ReferenceItem } from "@/hooks/useReferenceData";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ArrowUpDown, Trash2, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReferenceDataModal from "./ReferenceDataModal";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SortKey = "name" | "abbrev" | "code" | "is_active" | "created_at" | "updated_at";
type SortDir = "asc" | "desc";
type Filter = "all" | "active" | "inactive";

interface Props {
  table: string;
  entityLabel: string;
}

const PAGE_SIZE = 100;

const ReferenceDataTable = ({ table, entityLabel }: Props) => {
  const { data, isLoading, createMutation, updateMutation, deleteMutation, bulkUpdateMutation, bulkDeleteMutation } = useReferenceData(table);
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();

  const [filter, setFilter] = useState<Filter>("active");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReferenceItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<"delete" | "inactive" | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setVisibleCount(PAGE_SIZE);
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

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleFilterChange = useCallback((f: Filter) => {
    setFilter(f);
    setVisibleCount(PAGE_SIZE);
    setSelected(new Set());
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === visibleItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleItems.map((i) => i.id)));
    }
  }, [selected, visibleItems]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkInactive = async () => {
    const ids = Array.from(selected);
    bulkUpdateMutation.mutate({ ids, updates: { is_active: false } }, {
      onSuccess: () => {
        toast({ title: `${ids.length} items set to inactive` });
        setSelected(new Set());
        setBulkConfirm(null);
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        toast({ title: `${ids.length} items deleted` });
        setSelected(new Set());
        setBulkConfirm(null);
      },
      onError: (e: any) => toast({ title: "Error", description: e.message.includes("violates foreign key") ? "Some items are referenced by lenses and cannot be deleted." : e.message, variant: "destructive" }),
    });
  };

  const handleCreate = (values: { name: string; abbrev: string; code: string }) => {
    createMutation.mutate(values, {
      onSuccess: (data: any) => {
        setModalOpen(false);
        toast({ title: `${entityLabel} created` });
        logChange({ table_name: table, record_id: data?.id ?? "", action: "create", new_data: { ...values, name: values.name } });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleEdit = (values: { name: string; abbrev: string; code: string }) => {
    if (!editItem) return;
    const oldData = { name: editItem.name, abbrev: editItem.abbrev, code: editItem.code };
    updateMutation.mutate({ id: editItem.id, updates: values }, {
      onSuccess: () => {
        setEditItem(null);
        toast({ title: `${entityLabel} updated` });
        logChange({ table_name: table, record_id: editItem.id, action: "update", old_data: oldData, new_data: values });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggleActive = (item: ReferenceItem) => {
    updateMutation.mutate({ id: item.id, updates: { is_active: !item.is_active } }, {
      onSuccess: () => {
        logChange({
          table_name: table, record_id: item.id, action: "update",
          old_data: { is_active: item.is_active, name: item.name },
          new_data: { is_active: !item.is_active, name: item.name },
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = (item: ReferenceItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        toast({ title: `${entityLabel} deleted` });
        logChange({ table_name: table, record_id: item.id, action: "delete", old_data: { name: item.name, abbrev: item.abbrev, code: item.code } });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message.includes("violates foreign key") ? "Cannot delete — this item is referenced by lenses." : e.message, variant: "destructive" }),
    });
  };

  const filterTabs: { label: string; value: Filter }[] = [
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "All", value: "all" },
  ];

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const colCount = 6 + (canEdit ? 1 : 0) + (isAdmin ? 1 : 0) + (canEdit ? 1 : 0); // +1 for checkbox col

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

      {/* Bulk actions bar */}
      {selected.size > 0 && canEdit && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "hsl(215 65% 50% / 0.06)", border: "1px solid hsl(215 65% 50% / 0.15)" }}>
          <span className="text-xs font-medium" style={{ color: "hsl(215 65% 50%)" }}>
            {selected.size} selected
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setBulkConfirm("inactive")}
              disabled={bulkUpdateMutation.isPending}
            >
              <EyeOff className="h-3 w-3" /> Set Inactive
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setBulkConfirm("delete")}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded overflow-auto" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)", maxHeight: "calc(100vh - 320px)" }}>
        <Table>
          <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(0 0% 100%)", boxShadow: "inset 0 -1px 0 hsl(215 15% 85%)" }}>
            <TableRow>
              {canEdit && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={visibleItems.length > 0 && selected.size === visibleItems.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="w-[26%]"><SortHeader label="Name" k="name" /></TableHead>
              <TableHead className="w-[12%]"><SortHeader label="Abbrev" k="abbrev" /></TableHead>
              <TableHead className="w-[12%]"><SortHeader label="Code" k="code" /></TableHead>
              <TableHead className="w-[10%]"><SortHeader label="Status" k="is_active" /></TableHead>
              <TableHead className="w-[14%]"><SortHeader label="Created" k="created_at" /></TableHead>
              <TableHead className="w-[14%]"><SortHeader label="Updated" k="updated_at" /></TableHead>
              {canEdit && <TableHead className="w-[4%]" />}
              {isAdmin && <TableHead className="w-[4%]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center py-8 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              visibleItems.map((item) => (
                <TableRow
                  key={item.id}
                  className={canEdit ? "cursor-pointer" : ""}
                  onClick={() => canEdit && setEditItem(item)}
                  style={selected.has(item.id) ? { background: "hsl(215 65% 50% / 0.04)" } : undefined}
                >
                  {canEdit && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    </TableCell>
                  )}
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
                  {isAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                        onClick={() => handleDelete(item)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
                    onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                  >
                    Load more ({filtered.length - visibleCount} remaining)
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk confirm dialogs */}
      <AlertDialog open={bulkConfirm === "inactive"} onOpenChange={(open) => !open && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set {selected.size} items inactive?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected items will be marked as inactive. They can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkInactive} disabled={bulkUpdateMutation.isPending}>
              {bulkUpdateMutation.isPending ? "Updating…" : "Set Inactive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkConfirm === "delete"} onOpenChange={(open) => !open && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected items. Items referenced by lenses cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
