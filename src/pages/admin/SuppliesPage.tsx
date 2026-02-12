import { useState } from "react";
import { useSupplies, Supply, SupplyFormData } from "@/hooks/useSupplies";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import SupplyDataTable from "@/components/admin/SupplyDataTable";
import SupplyFormDialog from "@/components/admin/SupplyFormDialog";

const SuppliesPage = () => {
  const { data: supplies, isLoading, createMutation, updateMutation, toggleActiveMutation } = useSupplies();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSupply, setEditSupply] = useState<Supply | null>(null);

  const handleCreate = (form: SupplyFormData) => {
    createMutation.mutate(form, {
      onSuccess: () => { setFormOpen(false); toast({ title: "Supply created" }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (form: SupplyFormData) => {
    if (!editSupply) return;
    updateMutation.mutate({ id: editSupply.id, form }, {
      onSuccess: () => { setEditSupply(null); toast({ title: "Supply updated" }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggle = (supply: Supply) => {
    toggleActiveMutation.mutate({ id: supply.id, is_active: !supply.is_active }, {
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
        onRowClick={(supply) => canEdit && setEditSupply(supply)}
        onToggleActive={handleToggle}
      />

      <SupplyFormDialog open={formOpen} onOpenChange={setFormOpen} supply={null} onSubmit={handleCreate} isPending={createMutation.isPending} />
      <SupplyFormDialog open={!!editSupply} onOpenChange={(open) => !open && setEditSupply(null)} supply={editSupply} onSubmit={handleUpdate} isPending={updateMutation.isPending} />
    </div>
  );
};

export default SuppliesPage;
