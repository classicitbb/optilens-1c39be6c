import { useState } from "react";
import { useSupplies, Supply, SupplyFormData } from "@/hooks/useSupplies";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog, buildPricingSummary } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import SupplyDataTable from "@/components/admin/SupplyDataTable";
import SupplyFormDialog from "@/components/admin/SupplyFormDialog";

const SuppliesPage = () => {
  const { data: supplies, isLoading, createMutation, updateMutation, toggleActiveMutation } = useSupplies();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSupply, setEditSupply] = useState<Supply | null>(null);

  const filtered = (supplies ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.sku?.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });

  const handleCreate = (form: SupplyFormData, reason?: string) => {
    createMutation.mutate(form, {
      onSuccess: (data: any) => {
        setFormOpen(false);
        toast({ title: "Supply created" });
        logChange({ table_name: "supplies", record_id: data?.id ?? "", action: "create", new_data: form as any, reason });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (form: SupplyFormData, reason?: string) => {
    if (!editSupply) return;
    const oldData = editSupply as any;
    updateMutation.mutate({ id: editSupply.id, form }, {
      onSuccess: () => {
        toast({ title: "Supply updated" });
        logChange({
          table_name: "supplies", record_id: editSupply.id, action: "update",
          old_data: oldData, new_data: form as any,
          change_summary: buildPricingSummary(oldData, form as any),
          reason,
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdateAndClose = (form: SupplyFormData, reason?: string) => {
    if (!editSupply) return;
    const oldData = editSupply as any;
    updateMutation.mutate({ id: editSupply.id, form }, {
      onSuccess: () => {
        setEditSupply(null);
        toast({ title: "Supply updated" });
        logChange({
          table_name: "supplies", record_id: editSupply.id, action: "update",
          old_data: oldData, new_data: form as any,
          change_summary: buildPricingSummary(oldData, form as any),
          reason,
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggle = (supply: Supply) => {
    toggleActiveMutation.mutate({ id: supply.id, is_active: !supply.is_active }, {
      onSuccess: () => {
        logChange({
          table_name: "supplies", record_id: supply.id, action: "update",
          old_data: { is_active: supply.is_active },
          new_data: { is_active: !supply.is_active, name: supply.name },
          change_summary: { is_active: { old: supply.is_active, new: !supply.is_active } },
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
        <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Supply Catalog</h1>
        {canEdit && (
          <Button size="sm" className="h-7 text-xs gap-1" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Supply
          </Button>
        )}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, category…" className="h-8 text-xs pl-8" />
      </div>

      <SupplyDataTable
        supplies={supplies ?? []}
        search={search}
        canEdit={canEdit}
        onRowClick={(supply) => setEditSupply(supply)}
        onToggleActive={handleToggle}
      />

      <SupplyFormDialog open={formOpen} onOpenChange={setFormOpen} supply={null} onSubmit={handleCreate} isPending={createMutation.isPending} />
      <SupplyFormDialog
        open={!!editSupply}
        onOpenChange={(open) => !open && setEditSupply(null)}
        supply={editSupply}
        supplies={filtered}
        onSubmit={handleUpdate}
        onSubmitAndClose={handleUpdateAndClose}
        onNavigate={(s) => setEditSupply(s)}
        isPending={updateMutation.isPending}
      />
    </div>
  );
};

export default SuppliesPage;
