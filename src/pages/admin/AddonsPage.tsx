import { useState } from "react";
import { useAddons, Addon, AddonFormData } from "@/hooks/useAddons";
import { useAddonPricingSheets } from "@/hooks/useAddonPricingSheets";
import { usePricingSheets } from "@/hooks/usePricingSheets";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddonDataTable from "@/components/admin/AddonDataTable";
import AddonFormDialog from "@/components/admin/AddonFormDialog";

const AddonsPage = () => {
  const { data: addons, isLoading, createMutation, updateMutation, toggleActiveMutation, deleteMutation, duplicateMutation } = useAddons();
  const { data: pricingSheets } = usePricingSheets();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editAddon, setEditAddon] = useState<Addon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Addon | null>(null);

  const editAddonId = editAddon?.id ?? null;
  const { data: addonSheets, saveMutation: sheetSaveMutation } = useAddonPricingSheets(editAddonId);
  const { saveMutation: createSheetSaveMutation } = useAddonPricingSheets(null);

  const handleCreate = (form: AddonFormData, sheetAssignments: { pricing_sheet_id: string; price_override: number | null }[]) => {
    createMutation.mutate(form, {
      onSuccess: (data: any) => {
        if (sheetAssignments.length > 0 && data?.id) {
          createSheetSaveMutation.mutate({ addonId: data.id, assignments: sheetAssignments });
        }
        setFormOpen(false);
        toast({ title: "Add-on created" });
        logChange({ table_name: "addons", record_id: data?.id ?? "", action: "create", new_data: form as any });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (form: AddonFormData, sheetAssignments: { pricing_sheet_id: string; price_override: number | null }[], reason?: string) => {
    if (!editAddon) return;
    const oldData = editAddon as any;
    updateMutation.mutate({ id: editAddon.id, form }, {
      onSuccess: () => {
        sheetSaveMutation.mutate({ addonId: editAddon.id, assignments: sheetAssignments });
        toast({ title: "Add-on updated" });
        logChange({
          table_name: "addons", record_id: editAddon.id, action: "update",
          old_data: oldData, new_data: form as any,
          change_summary: oldData.price !== form.price ? { price: { old: oldData.price, new: form.price } } : undefined,
          reason,
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdateAndClose = (form: AddonFormData, sheetAssignments: { pricing_sheet_id: string; price_override: number | null }[], reason?: string) => {
    if (!editAddon) return;
    const oldData = editAddon as any;
    updateMutation.mutate({ id: editAddon.id, form }, {
      onSuccess: () => {
        sheetSaveMutation.mutate({ addonId: editAddon.id, assignments: sheetAssignments });
        setEditAddon(null);
        toast({ title: "Add-on updated" });
        logChange({
          table_name: "addons", record_id: editAddon.id, action: "update",
          old_data: oldData, new_data: form as any,
          change_summary: oldData.price !== form.price ? { price: { old: oldData.price, new: form.price } } : undefined,
          reason,
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggle = (addon: Addon) => {
    toggleActiveMutation.mutate({ id: addon.id, is_active: !addon.is_active }, {
      onSuccess: () => {
        logChange({
          table_name: "addons", record_id: addon.id, action: "update",
          old_data: { is_active: addon.is_active, name: addon.name },
          new_data: { is_active: !addon.is_active, name: addon.name },
          change_summary: { is_active: { old: addon.is_active, new: !addon.is_active } },
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDuplicate = (addon: Addon) => {
    duplicateMutation.mutate(addon, {
      onSuccess: () => toast({ title: `Duplicated "${addon.name}"` }),
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const old = deleteTarget;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        toast({ title: "Add-on deleted" });
        logChange({ table_name: "addons", record_id: old.id, action: "delete", old_data: old as any });
      },
      onError: (e: any) => { setDeleteTarget(null); toast({ title: "Error", description: e.message, variant: "destructive" }); },
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
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, category…" className="h-8 text-xs pl-8" />
      </div>

      <AddonDataTable addons={addons ?? []} search={search} canEdit={canEdit} onRowClick={(addon) => setEditAddon(addon)} onToggleActive={handleToggle} onDuplicate={handleDuplicate} onDelete={(addon) => setDeleteTarget(addon)} canDelete={isAdmin} />

      <AddonFormDialog open={formOpen} onOpenChange={setFormOpen} addon={null} onSubmit={handleCreate} isPending={createMutation.isPending} pricingSheets={pricingSheets ?? []} addonPricingSheets={[]} />
      <AddonFormDialog
        open={!!editAddon}
        onOpenChange={(open) => !open && setEditAddon(null)}
        addon={editAddon}
        addons={addons ?? []}
        onSubmit={handleUpdate}
        onSubmitAndClose={handleUpdateAndClose}
        onNavigate={(a) => setEditAddon(a)}
        isPending={updateMutation.isPending}
        pricingSheets={pricingSheets ?? []}
        addonPricingSheets={addonSheets ?? []}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent style={{ borderRadius: "4px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Add-On</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs" style={{ background: "hsl(0 60% 50%)", color: "white", borderRadius: "4px" }} onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddonsPage;
