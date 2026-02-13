import { useState } from "react";
import { useLenses, Lens, LensFormData } from "@/hooks/useLenses";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog, buildPricingSummary } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import LensDataTable from "@/components/admin/LensDataTable";
import LensFormDialog from "@/components/admin/LensFormDialog";

const LensesPage = () => {
  const { data: lenses, isLoading, createMutation, updateMutation, toggleActiveMutation } = useLenses();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editLens, setEditLens] = useState<Lens | null>(null);

  const handleCreate = (form: LensFormData) => {
    createMutation.mutate(form, {
      onSuccess: (data: any) => {
        setFormOpen(false);
        toast({ title: "Lens created" });
        logChange({ table_name: "lenses", record_id: data?.id ?? "", action: "create", new_data: form as any });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (form: LensFormData) => {
    if (!editLens) return;
    const oldData = editLens as any;
    updateMutation.mutate({ id: editLens.id, form }, {
      onSuccess: () => {
        setEditLens(null);
        toast({ title: "Lens updated" });
        logChange({
          table_name: "lenses", record_id: editLens.id, action: "update",
          old_data: oldData, new_data: form as any,
          change_summary: buildPricingSummary(oldData, form as any),
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggle = (lens: Lens) => {
    toggleActiveMutation.mutate({ id: lens.id, is_active: !lens.is_active }, {
      onSuccess: () => {
        logChange({
          table_name: "lenses", record_id: lens.id, action: "update",
          old_data: { is_active: lens.is_active, name: lens.name },
          new_data: { is_active: !lens.is_active, name: lens.name },
          change_summary: { is_active: { old: lens.is_active, new: !lens.is_active } },
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-40"><div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Lens Catalog</h1>
        {canEdit && (
          <Button size="sm" className="h-7 text-xs gap-1" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Lens
          </Button>
        )}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, supplier, brand…" className="h-8 text-xs pl-8" />
      </div>

      <LensDataTable
        lenses={lenses ?? []}
        search={search}
        onRowClick={(lens) => canEdit && setEditLens(lens)}
        onToggleActive={handleToggle}
      />

      <LensFormDialog open={formOpen} onOpenChange={setFormOpen} lens={null} onSubmit={handleCreate} isPending={createMutation.isPending} />
      <LensFormDialog
        open={!!editLens}
        onOpenChange={(open) => !open && setEditLens(null)}
        lens={editLens}
        onSubmit={handleUpdate}
        isPending={updateMutation.isPending}
      />
    </div>
  );
};

export default LensesPage;
