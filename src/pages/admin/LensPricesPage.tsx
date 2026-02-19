import { useState } from "react";
import { usePricingSheets, PricingSheet } from "@/hooks/usePricingSheets";
import { useBBDUSDRate } from "@/hooks/usePricelistVersions";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import PriceMatrixEditor from "@/components/admin/PriceMatrixEditor";
import PricelistVersionsSection from "@/components/admin/PricelistVersionsSection";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import MaterialUpgradesGrid from "@/components/admin/MaterialUpgradesGrid";
import FlatAddonsPanel from "@/components/admin/FlatAddonsPanel";
import MatrixExportBar from "@/components/admin/MatrixExportBar";

const BLUE = "hsl(215 65% 50%)";

type ContentTab = "matrix" | "catalog";

const LensPricesPage = () => {
  const { data: sheets, isLoading, createMutation, updateMutation, deleteMutation } = usePricingSheets();
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();

  const [activeSheetTab, setActiveSheetTab] = useState<string | null>(null);
  const [contentTab, setContentTab] = useState<ContentTab>("matrix");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSheet, setEditSheet] = useState<PricingSheet | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showUSD, setShowUSD] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const resolvedTab = activeSheetTab ?? sheets?.[0]?.id ?? null;

  const openCreate = () => {
    setEditSheet(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const openEdit = (sheet: PricingSheet) => {
    setEditSheet(sheet);
    setName(sheet.name);
    setDescription(sheet.description ?? "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editSheet) {
      updateMutation.mutate(
        { id: editSheet.id, updates: { name: name.trim(), description: description.trim() || null } },
        {
          onSuccess: () => { setDialogOpen(false); toast({ title: "Sheet updated" }); },
          onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(
        { name: name.trim(), description: description.trim() || undefined },
        {
          onSuccess: (data: any) => {
            setDialogOpen(false);
            setActiveSheetTab(data.id);
            toast({ title: "Sheet created" });
          },
          onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    }
  };

  const handleDuplicate = (sheet: PricingSheet) => {
    createMutation.mutate(
      { name: `${sheet.name} (Copy)`, description: sheet.description ?? undefined },
      {
        onSuccess: (data: any) => {
          setActiveSheetTab(data.id);
          toast({ title: "Sheet duplicated" });
        },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (sheet: PricingSheet) => {
    if (!confirm(`Delete "${sheet.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(sheet.id, {
      onSuccess: () => {
        if (resolvedTab === sheet.id) setActiveSheetTab(null);
        toast({ title: "Sheet deleted" });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: BLUE, borderTopColor: "transparent" }} />
      </div>
    );
  }

  const activeSheet = sheets?.find((s) => s.id === resolvedTab);

  return (
    <div className="p-4 space-y-4">
      {/* Page title + sheet manager */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Lens Prices</h1>
        {canEdit && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            style={{ background: BLUE, color: "white", borderRadius: "4px" }}
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5" /> New Sheet
          </Button>
        )}
      </div>

      {/* Sheet Tabs */}
      <div className="flex items-end gap-0 border-b" style={{ borderColor: "hsl(215 15% 85%)" }}>
        {sheets?.map((sheet) => (
          <div key={sheet.id} className="flex items-center group">
            <button
              onClick={() => setActiveSheetTab(sheet.id)}
              className="px-4 py-2 text-sm font-medium transition-colors relative"
              style={{
                color: resolvedTab === sheet.id ? "hsl(215 30% 15%)" : "hsl(215 15% 50%)",
              }}
            >
              {sheet.name}
              {resolvedTab === sheet.id && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: BLUE }}
                />
              )}
            </button>
            {canEdit && resolvedTab === sheet.id && (
              <div className="flex gap-0.5 pb-2 pr-1">
                <button onClick={() => openEdit(sheet)} className="p-0.5 rounded hover:bg-black/5" title="Rename">
                  <Pencil className="h-3 w-3" style={{ color: "hsl(215 15% 50%)" }} />
                </button>
                <button onClick={() => handleDuplicate(sheet)} className="p-0.5 rounded hover:bg-black/5" title="Duplicate">
                  <Copy className="h-3 w-3" style={{ color: "hsl(215 15% 50%)" }} />
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(sheet)} className="p-0.5 rounded hover:bg-red-50" title="Delete">
                    <Trash2 className="h-3 w-3" style={{ color: "hsl(0 60% 50%)" }} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {(!sheets || sheets.length === 0) && (
          <span className="px-4 py-2 text-sm" style={{ color: "hsl(215 15% 50%)" }}>
            No pricing sheets yet. Click "New Sheet" to create one.
          </span>
        )}
      </div>

      {/* Sheet content */}
      {activeSheet && (
        <div className="space-y-6">
          {/* Pricelist Versions */}
          <PricelistVersionsSection />

          {/* Separator */}
          <div className="border-t border-border" />

          {/* Content Tabs: Matrix | List Catalog */}
          <div className="space-y-4">
            {/* Sub-tab bar */}
            <div className="flex items-center gap-1 border-b border-border">
              {(["matrix", "catalog"] as ContentTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setContentTab(tab)}
                  className="px-4 py-2 text-sm font-medium transition-colors relative"
                  style={{
                    color: contentTab === tab ? "hsl(215 30% 15%)" : "hsl(215 15% 50%)",
                  }}
                >
                  {tab === "matrix" ? "Matrix" : "List Catalog"}
                  {contentTab === tab && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: BLUE }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Matrix tab */}
            {contentTab === "matrix" && (
              <div className="space-y-4">
                {/* Export bar */}
                <MatrixExportBar showUSD={showUSD} fxRate={fxRate} />

                {/* BBD / USD toggle */}
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-medium"
                    style={{ color: showUSD ? "hsl(215 15% 55%)" : "hsl(215 65% 45%)" }}
                  >
                    BBD
                  </span>
                  <Switch
                    checked={showUSD}
                    onCheckedChange={setShowUSD}
                    aria-label="Toggle price currency display"
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: showUSD ? "hsl(215 65% 45%)" : "hsl(215 15% 55%)" }}
                  >
                    USD
                  </span>
                  <span className="text-[10px] ml-1" style={{ color: "hsl(215 15% 60%)" }}>
                    (rate: 1 BBD = {fxRate} USD)
                  </span>
                </div>

                {/* Price Matrix */}
                <PriceMatrixEditor showUSD={showUSD} fxRate={fxRate} />
              </div>
            )}

            {/* List Catalog tab */}
            {contentTab === "catalog" && (
              <ListCatalogTab fxRate={fxRate} showUSD={showUSD} />
            )}
          </div>

          {/* Add-ons & Upgrades — below both tabs */}
          <div className="border-t border-border pt-6 space-y-6">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
                Add-ons &amp; Upgrades
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "hsl(215 15% 40%)" }}>
                Material upgrades apply deltas on top of any clear base price. Flat add-ons add fixed amounts.
              </p>
            </div>

            {/* Top panel: Material Upgrades */}
            <div className="border border-border rounded-md p-4">
              <MaterialUpgradesGrid />
            </div>

            {/* Bottom panel: Flat Add-ons */}
            <div className="border border-border rounded-md p-4">
              <FlatAddonsPanel
                selected={selectedAddons}
                onSelectionChange={setSelectedAddons}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit sheet dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editSheet ? "Edit Sheet" : "New Pricing Sheet"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "hsl(215 15% 40%)" }}>Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Retail Price List" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "hsl(215 15% 40%)" }}>Description (optional)</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-xs" placeholder="Brief description…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              style={{ background: BLUE, color: "white" }}
              onClick={handleSave}
              disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editSheet ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LensPricesPage;
