import { useState } from "react";
import { useLenses, Lens, LensFormData } from "@/hooks/useLenses";
import { useAddons, Addon, AddonFormData } from "@/hooks/useAddons";
import { useAddonPricingSheets } from "@/hooks/useAddonPricingSheets";
import { usePricingSheets } from "@/hooks/usePricingSheets";
import { useSupplies, Supply, SupplyFormData } from "@/hooks/useSupplies";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog, buildPricingSummary } from "@/hooks/useAuditLog";
import { useCatalogFilterStore, CatalogFilterStore } from "@/hooks/useCatalogFilterStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FilterX, Download, Settings, Database, Upload, Package as PackageIcon } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
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
  const navigate = useNavigate();
  const store = useCatalogFilterStore();
  const activeTab = store.activeTab;
  const [filterVersion, setFilterVersion] = useState(0);
  const { canEdit, isAdmin, role } = useAdminRole();
  const showCost = role === "admin" || role === "operator";

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

  /* ── Export all catalog data to CSV ── */
  const { data: allLenses } = useLenses();
  const { data: allAddons } = useAddons();
  const { data: allSupplies } = useSupplies();

  const handleExportCatalog = () => {
    const wb = XLSX.utils.book_new();

    // Lenses sheet
    const lensRows = (allLenses ?? []).map((l) => ({
      Name: l.name,
      Supplier: l.supplier?.name ?? "",
      Brand: l.brand?.name ?? "",
      Material: l.material?.name ?? "",
      "MF Type": l.mftype?.name ?? "",
      "Lens Type": l.lenstype?.name ?? "",
      "Finish Type": l.finishtype?.name ?? "",
      Index: l.index_value,
      ...(showCost ? { "Cost (Base)": l.base_price } : {}),
      "Sell Price": l.sell_price,
      "SPH Min": l.sph_min, "SPH Max": l.sph_max,
      "CYL Min": l.cyl_min, "CYL Max": l.cyl_max,
      "ADD Min": l.add_min ?? "", "ADD Max": l.add_max ?? "",
      Active: l.is_active ? "Yes" : "No",
      "Show in Pricelist": l.show_in_pricelist ? "Yes" : "No",
      "WS Pricelist": l.show_in_ws_pricelist ? "Yes" : "No",
      Website: l.show_on_website ? "Yes" : "No",
      "Full Lab": l.full_lab ? "Yes" : "No",
      Notes: l.notes ?? "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lensRows), "Lenses");

    // Addons sheet
    const addonRows = (allAddons ?? []).map((a) => ({
      Name: a.name,
      SKU: a.sku,
      Supplier: a.supplier_name ?? "",
      Category: a.category,
      Description: a.description,
      ...(showCost ? { Cost: a.cost } : {}),
      Price: a.price,
      Active: a.is_active ? "Yes" : "No",
      "Auto-Apply": a.is_auto ? "Yes" : "No",
      Website: a.show_on_website ? "Yes" : "No",
      "Sort Order": a.sort_order,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(addonRows), "Add-Ons");

    // Supplies sheet
    const supplyRows = (allSupplies ?? []).map((s) => ({
      Name: s.name,
      SKU: s.sku,
      Supplier: s.supplier_name ?? "",
      Brand: s.brand_name ?? "",
      Category: s.category,
      Description: s.description,
      ...(showCost ? { "Base Price": s.base_price } : {}),
      "Sell Price": s.sell_price,
      Unit: s.unit,
      "Qty/Unit": s.quantity_per_unit,
      Active: s.is_active ? "Yes" : "No",
      "In Pricelist": s.show_in_pricelist ? "Yes" : "No",
      Website: s.show_on_website ? "Yes" : "No",
      Preferred: s.preferred ? "Yes" : "No",
      Stocked: s.stocked ? "Yes" : "No",
      Bin: s.bin,
      Currency: s.currency,
      Notes: s.notes ?? "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supplyRows), "Supplies");

    XLSX.writeFile(wb, `Product_Catalog_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <AdminPageHeader icon={PackageIcon} title="Product Catalog" />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" style={{ borderRadius: "4px" }}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              <DropdownMenuItem onClick={() => navigate("/admin/reference")} className="gap-2 text-xs cursor-pointer">
                <Database className="h-3.5 w-3.5" /> Reference Data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/imports")} className="gap-2 text-xs cursor-pointer">
                <Upload className="h-3.5 w-3.5" /> Imports
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCatalog} className="gap-2 text-xs cursor-pointer">
                <Download className="h-3.5 w-3.5" /> Export Catalog
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canEdit && (
            <Button size="sm" className="h-7 text-xs gap-1" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" /> {currentTab.addLabel}
            </Button>
          )}
        </div>
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
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === "lenses" && <LensesTab search={search} filterVersion={filterVersion} formOpen={lensFormOpen} setFormOpen={setLensFormOpen} store={store} />}
        {activeTab === "addons" && <AddonsTab search={search} filterVersion={filterVersion} formOpen={addonFormOpen} setFormOpen={setAddonFormOpen} store={store} />}
        {activeTab === "supplies" && <SuppliesTab search={search} filterVersion={filterVersion} formOpen={supplyFormOpen} setFormOpen={setSupplyFormOpen} store={store} />}
      </div>
    </div>
  );
};

/* ─── Tab wrappers that accept lifted formOpen ─── */

const LensesTab = ({ search, filterVersion, formOpen, setFormOpen, store }: { search: string; filterVersion: number; formOpen: boolean; setFormOpen: (v: boolean) => void; store: CatalogFilterStore }) => {
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
    <div className="flex flex-col h-full">
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
    </div>
  );
};

const AddonsTab = ({ search, filterVersion, formOpen, setFormOpen, store }: { search: string; filterVersion: number; formOpen: boolean; setFormOpen: (v: boolean) => void; store: CatalogFilterStore }) => {
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
    <div className="flex flex-col h-full">
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
    </div>
  );
};

const SuppliesTab = ({ search, filterVersion, formOpen, setFormOpen, store }: { search: string; filterVersion: number; formOpen: boolean; setFormOpen: (v: boolean) => void; store: CatalogFilterStore }) => {
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
    <div className="flex flex-col h-full">
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
    </div>
  );
};

export default ProductCatalogPage;
