import { useState } from "react";
import { useAddons, Addon, AddonFormData } from "@/hooks/useAddons";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import AddonDataTable from "@/components/admin/AddonDataTable";
import AddonFormDialog from "@/components/admin/AddonFormDialog";

const AddonsPage = () => {
  const { data: addons, isLoading, createMutation, updateMutation, toggleActiveMutation } = useAddons();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editAddon, setEditAddon] = useState<Addon | null>(null);

  const handleCreate = (form: AddonFormData) => {
    createMutation.mutate(form, {
      onSuccess: () => { setFormOpen(false); toast({ title: "Add-on created" }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (form: AddonFormData) => {
    if (!editAddon) return;
    updateMutation.mutate({ id: editAddon.id, form }, {
      onSuccess: () => { setEditAddon(null); toast({ title: "Add-on updated" }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggle = (addon: Addon) => {
    toggleActiveMutation.mutate({ id: addon.id, is_active: !addon.is_active }, {
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-40"><div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Add-Ons Catalog</h1>
        {canEdit && (
          <Button size="sm" className="h-7 text-xs gap-1" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} onClick={() => setFormOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Add-On
          </Button>
        )}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, category…" className="h-8 text-xs pl-8" />
      </div>

      <AddonDataTable
        addons={addons ?? []}
        search={search}
        onRowClick={(addon) => canEdit && setEditAddon(addon)}
        onToggleActive={handleToggle}
      />

      <AddonFormDialog open={formOpen} onOpenChange={setFormOpen} addon={null} onSubmit={handleCreate} isPending={createMutation.isPending} />
      <AddonFormDialog open={!!editAddon} onOpenChange={(open) => !open && setEditAddon(null)} addon={editAddon} onSubmit={handleUpdate} isPending={updateMutation.isPending} />
    </div>
  );
};

export default AddonsPage;
