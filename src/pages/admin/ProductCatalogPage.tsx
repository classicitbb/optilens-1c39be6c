import { useState } from "react";
import { useLenses, Lens, LensFormData } from "@/hooks/useLenses";
import { useAddons, Addon, AddonFormData } from "@/hooks/useAddons";
import { useAddonPricingSheets } from "@/hooks/useAddonPricingSheets";
import { usePricingSheets } from "@/hooks/usePricingSheets";
import { useSupplies, Supply, SupplyFormData } from "@/hooks/useSupplies";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog, buildPricingSummary } from "@/hooks/useAuditLog";
import { useCatalogFilterStore } from "@/hooks/useCatalogFilterStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FilterX } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LensDataTable from "@/components/admin/LensDataTable";
import LensFormDialog from "@/components/admin/LensFormDialog";
import AddonDataTable from "@/components/admin/AddonDataTable";
import AddonFormDialog from "@/components/admin/AddonFormDialog";
import SupplyDataTable from "@/components/admin/SupplyDataTable";
import SupplyFormDialog from "@/components/admin/SupplyFormDialog";

type Tab = "lenses" | "addons" | "supplies";

const TABS: { key: Tab; label: string; addLabel: string; placeholder: string }[] = [
  { key: "lenses", label: "Lenses", addLabel: "Add Lens", placeholder: "Search by name, supplier, brand…" },
  { key: "addons", label: "Add-Ons", addLabel: "Add Add-On", placeholder: "Search by name, SKU, category…" },
  { key: "supplies", label: "Supplies", addLabel: "Add Supply", placeholder: "Search by name, SKU, category…" },
];

/* ─── Shared small components ─── */
const Spinner = () => (
  <div className="flex items-center justify-center h-40">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} />
  </div>
);

/* ─── Main Page ─── */
const ProductCatalogPage = () => {
  const store = useCatalogFilterStore();
  const activeTab = store.activeTab;
  const [filterVersion, setFilterVersion] = useState(0);
  const { canEdit } = useAdminRole();

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  // Per-tab search persisted in store
  const search = activeTab === "lenses" ? store.lens.search : activeTab === "addons" ? store.addon.search : store.supply.search;
  const setSearch = (v: string) => {
    if (activeTab === "lenses") store.setLens({ search: v });
    else if (activeTab === "addons") store.setAddon({ search: v });
    else store.setSupply({ search: v });
  };

  const handleTabChange = (tab: Tab) => {
    store.setActiveTab(tab);
  };

  /* We need formOpen state lifted here for the Add button */
  const [lensFormOpen, setLensFormOpen] = useState(false);
  const [addonFormOpen, setAddonFormOpen] = useState(false);
  const [supplyFormOpen, setSupplyFormOpen] = useState(false);

  const handleAdd = () => {
    if (activeTab === "lenses") setLensFormOpen(true);
    else if (activeTab === "addons") setAddonFormOpen(true);
    else setSupplyFormOpen(true);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Product Catalog</h1>
        {canEdit && (
          <Button size="sm" className="h-7 text-xs gap-1" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" /> {currentTab.addLabel}
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b shrink-0" style={{ borderColor: "hsl(215 15% 85%)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className="px-4 py-2 text-sm font-medium transition-colors relative"
            style={{ color: activeTab === t.key ? "hsl(215 30% 15%)" : "hsl(215 15% 50%)" }}
          >
            {t.label}
            {activeTab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "hsl(215 65% 50%)" }} />
            )}
          </button>
        ))}
      </div>

      {/* Shared search + clear filters */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={currentTab.placeholder} className="h-8 text-xs pl-8" />
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => { setFilterVersion((v) => v + 1); setSearch(""); }}>
          <FilterX className="h-3.5 w-3.5" /> Clear Filters
        </Button>
      </div>

      {/* Tab content – fills remaining height */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "lenses" && <LensesTab search={search} filterVersion={filterVersion} formOpen={lensFormOpen} setFormOpen={setLensFormOpen} store={store} />}
        {activeTab === "addons" && <AddonsTab search={search} filterVersion={filterVersion} formOpen={addonFormOpen} setFormOpen={setAddonFormOpen} store={store} />}
        {activeTab === "supplies" && <SuppliesTab search={search} filterVersion={filterVersion} formOpen={supplyFormOpen} setFormOpen={setSupplyFormOpen} store={store} />}
      </div>
    </div>
  );
};

/* ─── Tab wrappers that accept lifted formOpen ─── */

const LensesTab = ({ search, filterVersion, formOpen, setFormOpen }: { search: string; filterVersion: number; formOpen: boolean; setFormOpen: (v: boolean) => void }) => {
  const { data: lenses, isLoading, createMutation, updateMutation, toggleActiveMutation, deleteMutation, duplicateMutation } = useLenses();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();
  const [editLens, setEditLens] = useState<Lens | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lens | null>(null);

  const handleCreate = (form: LensFormData, reason?: string) => {
    createMutation.mutate(form, {
      onSuccess: (data: any) => { setFormOpen(false); toast({ title: "Lens created" }); logChange({ table_name: "lenses", record_id: data?.id ?? "", action: "create", new_data: form as any, reason }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (form: LensFormData, reason?: string) => {
    if (!editLens) return;
    const oldData = editLens as any;
    updateMutation.mutate({ id: editLens.id, form }, {
      onSuccess: () => { toast({ title: "Lens updated" }); logChange({ table_name: "lenses", record_id: editLens.id, action: "update", old_data: oldData, new_data: form as any, change_summary: buildPricingSummary(oldData, form as any), reason }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdateAndClose = (form: LensFormData, reason?: string) => {
    if (!editLens) return;
    const oldData = editLens as any;
    updateMutation.mutate({ id: editLens.id, form }, {
      onSuccess: () => { setEditLens(null); toast({ title: "Lens updated" }); logChange({ table_name: "lenses", record_id: editLens.id, action: "update", old_data: oldData, new_data: form as any, change_summary: buildPricingSummary(oldData, form as any), reason }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggle = (lens: Lens) => {
    toggleActiveMutation.mutate({ id: lens.id, is_active: !lens.is_active }, {
      onSuccess: () => { logChange({ table_name: "lenses", record_id: lens.id, action: "update", old_data: { is_active: lens.is_active, name: lens.name }, new_data: { is_active: !lens.is_active, name: lens.name }, change_summary: { is_active: { old: lens.is_active, new: !lens.is_active } } }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDuplicate = (lens: Lens) => {
    duplicateMutation.mutate(lens, {
      onSuccess: (data: any) => { toast({ title: `Duplicated "${lens.name}"` }); logChange({ table_name: "lenses", record_id: data?.id ?? "", action: "create", new_data: { ...lens, name: `${lens.name} (Copy)` } as any }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const old = deleteTarget;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { setDeleteTarget(null); toast({ title: "Lens deleted" }); logChange({ table_name: "lenses", record_id: old.id, action: "delete", old_data: old as any }); },
      onError: (e: any) => { setDeleteTarget(null); toast({ title: "Error", description: e.message, variant: "destructive" }); },
    });
  };

  if (isLoading) return <Spinner />;

  return (
    <>
      <LensDataTable lenses={lenses ?? []} search={search} filterVersion={filterVersion} onRowClick={(lens) => canEdit && setEditLens(lens)} onToggleActive={handleToggle} onDuplicate={handleDuplicate} onDelete={(lens) => setDeleteTarget(lens)} canDelete={isAdmin} />
      <LensFormDialog open={formOpen} onOpenChange={setFormOpen} lens={null} onSubmit={handleCreate} isPending={createMutation.isPending} />
      <LensFormDialog open={!!editLens} onOpenChange={(open) => !open && setEditLens(null)} lens={editLens} lenses={lenses ?? []} onSubmit={handleUpdate} onSubmitAndClose={handleUpdateAndClose} onNavigate={(l) => setEditLens(l)} isPending={updateMutation.isPending} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent style={{ borderRadius: "4px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Lens</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs" style={{ background: "hsl(0 60% 50%)", color: "white", borderRadius: "4px" }} onClick={handleDelete} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const AddonsTab = ({ search, filterVersion, formOpen, setFormOpen }: { search: string; filterVersion: number; formOpen: boolean; setFormOpen: (v: boolean) => void }) => {
  const { data: addons, isLoading, createMutation, updateMutation, toggleActiveMutation, deleteMutation, duplicateMutation } = useAddons();
  const { data: pricingSheets } = usePricingSheets();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();
  const [editAddon, setEditAddon] = useState<Addon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Addon | null>(null);

  const editAddonId = editAddon?.id ?? null;
  const { data: addonSheets, saveMutation: sheetSaveMutation } = useAddonPricingSheets(editAddonId);
  const { saveMutation: createSheetSaveMutation } = useAddonPricingSheets(null);

  const handleCreate = (form: AddonFormData, sheetAssignments: { pricing_sheet_id: string; price_override: number | null }[]) => {
    createMutation.mutate(form, {
      onSuccess: (data: any) => {
        if (sheetAssignments.length > 0 && data?.id) createSheetSaveMutation.mutate({ addonId: data.id, assignments: sheetAssignments });
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
        logChange({ table_name: "addons", record_id: editAddon.id, action: "update", old_data: oldData, new_data: form as any, change_summary: oldData.price !== form.price ? { price: { old: oldData.price, new: form.price } } : undefined, reason });
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
        logChange({ table_name: "addons", record_id: editAddon.id, action: "update", old_data: oldData, new_data: form as any, change_summary: oldData.price !== form.price ? { price: { old: oldData.price, new: form.price } } : undefined, reason });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggle = (addon: Addon) => {
    toggleActiveMutation.mutate({ id: addon.id, is_active: !addon.is_active }, {
      onSuccess: () => { logChange({ table_name: "addons", record_id: addon.id, action: "update", old_data: { is_active: addon.is_active, name: addon.name }, new_data: { is_active: !addon.is_active, name: addon.name }, change_summary: { is_active: { old: addon.is_active, new: !addon.is_active } } }); },
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
      onSuccess: () => { setDeleteTarget(null); toast({ title: "Add-on deleted" }); logChange({ table_name: "addons", record_id: old.id, action: "delete", old_data: old as any }); },
      onError: (e: any) => { setDeleteTarget(null); toast({ title: "Error", description: e.message, variant: "destructive" }); },
    });
  };

  if (isLoading) return <Spinner />;

  return (
    <>
      <AddonDataTable addons={addons ?? []} search={search} canEdit={canEdit} filterVersion={filterVersion} onRowClick={(addon) => setEditAddon(addon)} onToggleActive={handleToggle} onDuplicate={handleDuplicate} onDelete={(addon) => setDeleteTarget(addon)} canDelete={isAdmin} />
      <AddonFormDialog open={formOpen} onOpenChange={setFormOpen} addon={null} onSubmit={handleCreate} isPending={createMutation.isPending} pricingSheets={pricingSheets ?? []} addonPricingSheets={[]} />
      <AddonFormDialog open={!!editAddon} onOpenChange={(open) => !open && setEditAddon(null)} addon={editAddon} addons={addons ?? []} onSubmit={handleUpdate} onSubmitAndClose={handleUpdateAndClose} onNavigate={(a) => setEditAddon(a)} isPending={updateMutation.isPending} pricingSheets={pricingSheets ?? []} addonPricingSheets={addonSheets ?? []} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent style={{ borderRadius: "4px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Add-On</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs" style={{ background: "hsl(0 60% 50%)", color: "white", borderRadius: "4px" }} onClick={handleDelete} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const SuppliesTab = ({ search, filterVersion, formOpen, setFormOpen }: { search: string; filterVersion: number; formOpen: boolean; setFormOpen: (v: boolean) => void }) => {
  const { data: supplies, isLoading, createMutation, updateMutation, toggleActiveMutation, deleteMutation, duplicateMutation } = useSupplies();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();
  const [editSupply, setEditSupply] = useState<Supply | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supply | null>(null);

  const filtered = (supplies ?? []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.sku?.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });

  const handleCreate = (form: SupplyFormData, reason?: string) => {
    createMutation.mutate(form, {
      onSuccess: (data: any) => { setFormOpen(false); toast({ title: "Supply created" }); logChange({ table_name: "supplies", record_id: data?.id ?? "", action: "create", new_data: form as any, reason }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdate = (form: SupplyFormData, reason?: string) => {
    if (!editSupply) return;
    const oldData = editSupply as any;
    updateMutation.mutate({ id: editSupply.id, form }, {
      onSuccess: () => { toast({ title: "Supply updated" }); logChange({ table_name: "supplies", record_id: editSupply.id, action: "update", old_data: oldData, new_data: form as any, change_summary: buildPricingSummary(oldData, form as any), reason }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleUpdateAndClose = (form: SupplyFormData, reason?: string) => {
    if (!editSupply) return;
    const oldData = editSupply as any;
    updateMutation.mutate({ id: editSupply.id, form }, {
      onSuccess: () => { setEditSupply(null); toast({ title: "Supply updated" }); logChange({ table_name: "supplies", record_id: editSupply.id, action: "update", old_data: oldData, new_data: form as any, change_summary: buildPricingSummary(oldData, form as any), reason }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleToggle = (supply: Supply) => {
    toggleActiveMutation.mutate({ id: supply.id, is_active: !supply.is_active }, {
      onSuccess: () => { logChange({ table_name: "supplies", record_id: supply.id, action: "update", old_data: { is_active: supply.is_active }, new_data: { is_active: !supply.is_active, name: supply.name }, change_summary: { is_active: { old: supply.is_active, new: !supply.is_active } } }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDuplicate = (supply: Supply) => {
    duplicateMutation.mutate(supply, {
      onSuccess: (data: any) => { toast({ title: `Duplicated "${supply.name}"` }); logChange({ table_name: "supplies", record_id: data?.id ?? "", action: "create", new_data: { ...supply, name: `${supply.name} (Copy)` } as any }); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const old = deleteTarget;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => { setDeleteTarget(null); toast({ title: "Supply deleted" }); logChange({ table_name: "supplies", record_id: old.id, action: "delete", old_data: old as any }); },
      onError: (e: any) => { setDeleteTarget(null); toast({ title: "Error", description: e.message, variant: "destructive" }); },
    });
  };

  if (isLoading) return <Spinner />;

  return (
    <>
      <SupplyDataTable supplies={supplies ?? []} search={search} canEdit={canEdit} filterVersion={filterVersion} onRowClick={(supply) => setEditSupply(supply)} onToggleActive={handleToggle} onDuplicate={handleDuplicate} onDelete={(supply) => setDeleteTarget(supply)} canDelete={isAdmin} />
      <SupplyFormDialog open={formOpen} onOpenChange={setFormOpen} supply={null} onSubmit={handleCreate} isPending={createMutation.isPending} />
      <SupplyFormDialog open={!!editSupply} onOpenChange={(open) => !open && setEditSupply(null)} supply={editSupply} supplies={filtered} onSubmit={handleUpdate} onSubmitAndClose={handleUpdateAndClose} onNavigate={(s) => setEditSupply(s)} isPending={updateMutation.isPending} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent style={{ borderRadius: "4px" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Supply</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction className="h-7 text-xs" style={{ background: "hsl(0 60% 50%)", color: "white", borderRadius: "4px" }} onClick={handleDelete} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "Deleting…" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductCatalogPage;
