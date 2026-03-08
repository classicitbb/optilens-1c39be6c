import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  usePricelistVersions,
  PricelistVersion,
  CreateVersionInput } from
"@/hooks/usePricelistVersions";
import { useBBDUSDRate } from "@/hooks/usePricelistVersions";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
"@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  CalendarDays,
  Clock,
  Eye } from
"lucide-react";
import { format } from "date-fns";

interface VersionSelectorPanelProps {
  pageTitle: string;
  pageSubtitle?: string;
  selectedVersionId: number | null;
  onVersionChange: (id: number) => void;
  showUSD: boolean;
  onShowUSDChange: (v: boolean) => void;
  /** Called when user clicks Preview on a version row */
  onPreviewClick?: (versionId: number) => void;
  /** Optional export bar + save button rendered inside the "You are editing" banner */
  exportBar?: React.ReactNode;
  /** Optional save controls rendered below BBD/USD toggle */
  saveBar?: React.ReactNode;
  /** If provided, render after the context banner */
  children?: React.ReactNode;
}

const VersionSelectorPanel = ({
  pageTitle,
  pageSubtitle,
  selectedVersionId,
  onVersionChange,
  showUSD,
  onShowUSDChange,
  onPreviewClick,
  exportBar,
  saveBar,
  children
}: VersionSelectorPanelProps) => {
  const { data: versions, isLoading, createMutation, updateMutation, deleteMutation } =
  usePricelistVersions();
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();

  const [selectorCollapsed, setSelectorCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<PricelistVersion | null>(null);
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState<string>("matrix");
  const [currency, setCurrency] = useState<"BBD" | "USD">("BBD");
  const [markupPct, setMarkupPct] = useState("0");
  const [discountPct, setDiscountPct] = useState("0");
  const [isTemplate, setIsTemplate] = useState(false);
  const [formatType, setFormatType] = useState<string>("list");
  const [masterMarkupPct, setMasterMarkupPct] = useState("0");
  const [masterDiscountPct, setMasterDiscountPct] = useState("0");

  const SECTION_TYPES = ["RX Lens Prices", "Stock Lens Prices", "Supplies Prices"] as const;
  const [childSections, setChildSections] = useState<Record<string, {markup: string;discount: string;}>>({
    "RX Lens Prices": { markup: "0", discount: "0" },
    "Stock Lens Prices": { markup: "0", discount: "0" },
    "Supplies Prices": { markup: "0", discount: "0" }
  });

  const activeVersion =
  versions?.find((v) => v.id === selectedVersionId) ?? versions?.[0] ?? null;
  const resolvedVersionId = activeVersion?.id ?? null;

  // Auto-select first version if none selected
  if (!selectedVersionId && versions && versions.length > 0 && !isLoading) {
    onVersionChange(versions[0].id);
  }

  const resetForm = () => {
    setName("");
    setCopyFrom("matrix");
    setCurrency("BBD");
    setMarkupPct("0");
    setDiscountPct("0");
    setIsTemplate(false);
    setEditMode(null);
    setFormatType("list");
    setMasterMarkupPct("0");
    setMasterDiscountPct("0");
    setChildSections({
      "RX Lens Prices": { markup: "0", discount: "0" },
      "Stock Lens Prices": { markup: "0", discount: "0" },
      "Supplies Prices": { markup: "0", discount: "0" }
    });
  };

  const updateChild = (section: string, field: "markup" | "discount", value: string) => {
    setChildSections((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = async (v: PricelistVersion) => {
    setEditMode(v);
    setName(v.name);
    setCurrency(v.base_currency as "BBD" | "USD" ?? "BBD");
    setMarkupPct(String(v.markup_percent ?? 0));
    setDiscountPct(String(v.discount_percent ?? 0));
    setIsTemplate(v.is_template ?? false);
    setFormatType(v.format_type ?? "list");
    setMasterMarkupPct(String(v.master_markup_percent ?? 0));
    setMasterDiscountPct(String(v.master_discount_percent ?? 0));

    // Fetch child sections
    const { data: children } = await supabase.
    from("pricelist_child_sections").
    select("*").
    eq("pricelist_version_id", v.id);

    const newChildState: Record<string, {markup: string;discount: string;}> = {
      "RX Lens Prices": { markup: "0", discount: "0" },
      "Stock Lens Prices": { markup: "0", discount: "0" },
      "Supplies Prices": { markup: "0", discount: "0" }
    };
    for (const c of children ?? []) {
      if (newChildState[c.section_type]) {
        newChildState[c.section_type] = {
          markup: String(c.child_markup_percent ?? 0),
          discount: String(c.child_discount_percent ?? 0)
        };
      }
    }
    setChildSections(newChildState);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const childData: import("@/hooks/usePricelistVersions").ChildSection[] = SECTION_TYPES.map((st) => ({
      pricelist_version_id: editMode?.id ?? 0,
      section_type: st,
      child_markup_percent: parseFloat(childSections[st].markup) || 0,
      child_discount_percent: parseFloat(childSections[st].discount) || 0
    }));

    if (editMode) {
      updateMutation.mutate(
        {
          id: editMode.id,
          updates: {
            name: name.trim(),
            base_currency: currency,
            markup_percent: parseFloat(markupPct) || 0,
            discount_percent: parseFloat(discountPct) || 0,
            is_template: isTemplate,
            format_type: formatType,
            master_markup_percent: parseFloat(masterMarkupPct) || 0,
            master_discount_percent: parseFloat(masterDiscountPct) || 0
          },
          childSections: childData
        },
        {
          onSuccess: () => {
            logChange({
              table_name: "pricelist_versions",
              record_id: String(editMode.id),
              action: "update",
              old_data: { name: editMode.name, markup_percent: editMode.markup_percent, discount_percent: editMode.discount_percent, base_currency: editMode.base_currency, is_template: editMode.is_template },
              new_data: { name: name.trim(), markup_percent: parseFloat(markupPct) || 0, discount_percent: parseFloat(discountPct) || 0, base_currency: currency, is_template: isTemplate, format_type: formatType, master_markup_percent: parseFloat(masterMarkupPct) || 0, master_discount_percent: parseFloat(masterDiscountPct) || 0 }
            });
            setDialogOpen(false);
            resetForm();
            toast({ title: "Pricelist updated" });
          },
          onError: (e: any) =>
          toast({ title: "Error", description: e.message, variant: "destructive" })
        }
      );
    } else {
      const input: CreateVersionInput = {
        name: name.trim(),
        base_currency: currency,
        markup_percent: parseFloat(markupPct) || 0,
        discount_percent: parseFloat(discountPct) || 0,
        is_template: isTemplate,
        copyFrom: copyFrom === "matrix" ? "matrix" : parseInt(copyFrom)
      };
      createMutation.mutate(input, {
        onSuccess: (newV: any) => {
          logChange({
            table_name: "pricelist_versions",
            record_id: String(newV.id),
            action: "create",
            new_data: { name: input.name, base_currency: input.base_currency, markup_percent: input.markup_percent, discount_percent: input.discount_percent, is_template: input.is_template, copyFrom: input.copyFrom }
          });
          setDialogOpen(false);
          resetForm();
          onVersionChange(newV.id);
          toast({ title: "Pricelist created" });
        },
        onError: (e: any) =>
        toast({ title: "Error", description: e.message, variant: "destructive" })
      });
    }
  };

  const handleDelete = (v: PricelistVersion) => {
    if (!confirm(`Delete "${v.name}" and all its prices? Cannot be undone.`)) return;
    deleteMutation.mutate(v.id, {
      onSuccess: () => {
        logChange({
          table_name: "pricelist_versions",
          record_id: String(v.id),
          action: "delete",
          old_data: { name: v.name, base_currency: v.base_currency, markup_percent: v.markup_percent, discount_percent: v.discount_percent }
        });
        if (resolvedVersionId === v.id) onVersionChange(versions?.[0]?.id ?? 0);
        toast({ title: "Deleted" });
      },
      onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" })
    });
  };

  const handleDuplicate = (v: PricelistVersion) => {
    const input: CreateVersionInput = {
      name: `${v.name} (Copy)`,
      base_currency: v.base_currency ?? "BBD",
      markup_percent: v.markup_percent ?? 0,
      discount_percent: v.discount_percent ?? 0,
      is_template: false,
      copyFrom: v.id
    };
    createMutation.mutate(input, {
      onSuccess: (newV: any) => {
        logChange({
          table_name: "pricelist_versions",
          record_id: String(newV.id),
          action: "create",
          new_data: { name: input.name, duplicated_from: v.name, source_id: v.id, base_currency: input.base_currency, markup_percent: input.markup_percent, discount_percent: input.discount_percent }
        });
        onVersionChange(newV.id);
        toast({ title: "Duplicated" });
      },
      onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" })
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {pageTitle}
          </h1>
          {pageSubtitle &&
          <p className="text-xs mt-0.5 text-muted-foreground">
              {pageSubtitle}
            </p>
          }
        </div>
        {canEdit &&
        <Button
          size="sm"
          className="h-7 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> New Pricelist
          </Button>
        }
      </div>

      {/* Version Selector */}
      <div className="border border-border overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/50 transition-colors bg-muted/30"
          onClick={() => setSelectorCollapsed((c) => !c)}>
          <span className="text-xs font-bold text-foreground">
            Pricelist Versions
            {activeVersion && selectorCollapsed &&
            <span className="ml-2 font-semibold text-primary">
                — {activeVersion.name}
              </span>
            }
          </span>
          {selectorCollapsed ?
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> :
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          }
        </button>

        {!selectorCollapsed &&
        <div className="p-3 space-y-2">
            {isLoading ?
          <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div> :
          !versions || versions.length === 0 ?
          <p className="text-xs text-center py-4 text-muted-foreground">
                No pricelist versions yet. Click "+ New Pricelist" to create one.
              </p> :

          <div className="space-y-1">
                {versions.map((v) => {
              const isActive = resolvedVersionId === v.id;
              return (
                <div
                  key={v.id}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary/10 border border-primary/30"
                      : "border border-transparent hover:bg-muted/50"
                  }`}
                  onClick={() => onVersionChange(v.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                        className={`text-xs font-semibold truncate ${
                          isActive ? "text-primary" : "text-foreground"
                        }`}>
                            {v.name}
                          </span>
                          {v.is_template &&
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-3.5 border-primary text-primary">
                              Template
                            </Badge>
                      }
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                            {v.base_currency ?? "BBD"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            Markup: {v.markup_percent ?? 0}% · Discount:{" "}
                            {v.discount_percent ?? 0}%
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            Created{" "}
                            {v.created_at ?
                        format(new Date(v.created_at), "dd MMM yyyy") :
                        "—"}
                          </span>
                        </div>
                      </div>
                      <div
                    className="flex items-center gap-0.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}>
                        {onPreviewClick &&
                    <button
                      onClick={() => {onVersionChange(v.id);onPreviewClick(v.id);}}
                      className="p-1 hover:bg-primary/10 flex items-center gap-0.5 text-[10px] text-primary"
                      title="Preview this pricelist">
                            <Eye className="h-3 w-3" />
                          </button>
                    }
                        {canEdit &&
                    <>
                            <button
                        onClick={() => openEdit(v)}
                        className="p-1 hover:bg-muted text-muted-foreground"
                        title="Edit">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                        onClick={() => handleDuplicate(v)}
                        className="p-1 hover:bg-muted text-muted-foreground"
                        title="Duplicate"
                        disabled={createMutation.isPending}>
                              <Copy className="h-3 w-3" />
                            </button>
                            {isAdmin &&
                      <button
                        onClick={() => handleDelete(v)}
                        className="p-1 hover:bg-destructive/10 text-destructive"
                        title="Delete"
                        disabled={deleteMutation.isPending}>
                                <Trash2 className="h-3 w-3" />
                              </button>
                      }
                          </>
                    }
                      </div>
                    </div>);

            })}
              </div>
          }
          </div>
        }
      </div>

      {/* Editing context banner */}
      {activeVersion &&
      <div className="border space-y-0 bg-primary/5 border-primary/20">
          {/* Top row: version info + currency toggle */}
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                You are editing:{" "}
                <span className="text-primary">{activeVersion.name}</span>
              </p>
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  Created{" "}
                  {activeVersion.created_at ?
                format(new Date(activeVersion.created_at), "dd MMM yyyy 'at' HH:mm") :
                "—"}
                </span>
                {activeVersion.updated_at &&
              activeVersion.updated_at !== activeVersion.created_at &&
              <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last saved{" "}
                      {format(
                  new Date(activeVersion.updated_at),
                  "dd MMM yyyy 'at' HH:mm"
                )}
                    </span>
              }
              </div>
            </div>
            {/* BBD/USD toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-medium ${showUSD ? "text-muted-foreground" : "text-primary"}`}>
                BBD
              </span>
              <Switch
              checked={showUSD}
              onCheckedChange={onShowUSDChange}
              aria-label="Toggle currency" />
              <span className={`text-[10px] font-medium ${showUSD ? "text-primary" : "text-muted-foreground"}`}>
                USD
              </span>
            </div>
          </div>
          {/* Export + Save bar slot */}
          {(exportBar || saveBar) &&
        <div className="flex items-center justify-between gap-3 flex-wrap px-4 pb-3 border-t border-border/40 pt-2.5 no-print">
              <div className="flex-1">{exportBar}</div>
              {saveBar && <div className="shrink-0">{saveBar}</div>}
            </div>
        }
        </div>
      }

      {/* Page content */}
      {activeVersion ?
      children :

      <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            Select or create a pricelist version above to start editing.
          </p>
        </div>
      }

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) resetForm();
        }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editMode ? "Edit Pricelist" : "New Pricelist Version"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">
                Version Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. Retail RX Feb 2026"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()} />
            </div>
            {!editMode &&
            <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">
                  Copy Prices From
                </label>
                <Select value={copyFrom} onValueChange={setCopyFrom}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matrix" className="text-xs">
                      📊 From Price Matrix (baseline)
                    </SelectItem>
                    {versions?.map((v) =>
                  <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                        📋 {v.name}
                      </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>
            }
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">
                Base Currency
              </label>
              <div className="flex gap-2">
                {(["BBD", "USD"] as const).map((c) =>
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex-1 py-1.5 text-xs font-medium border transition-colors ${
                    currency === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted/50"
                  }`}>
                    {c}
                  </button>
                )}
              </div>
            </div>
            {/* Markup / Discount (create mode = legacy, edit mode = master) */}
            {!editMode &&
            <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Markup %</label>
                  <Input type="number" step="0.01" min="0" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} className="h-8 text-xs text-right" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Discount %</label>
                  <Input type="number" step="0.01" min="0" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} className="h-8 text-xs text-right" />
                </div>
              </div>
            }

            {/* Master Markup / Discount (edit only) */}
            {editMode &&
            <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Master Markup %</label>
                  <div className="relative">
                    <Input type="number" step="0.01" min="0" value={masterMarkupPct} onChange={(e) => setMasterMarkupPct(e.target.value)} className="h-8 text-xs text-right pr-6" placeholder="0" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Master Discount %</label>
                  <div className="relative">
                    <Input type="number" step="0.01" min="0" value={masterDiscountPct} onChange={(e) => setMasterDiscountPct(e.target.value)} className="h-8 text-xs text-right pr-6" placeholder="0" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            }

            {/* Child Section Boxes (edit mode only) */}
            {editMode &&
            <div className="space-y-3 pt-1">
                {SECTION_TYPES.map((st) =>
              <div key={st} className="border border-border p-3 bg-muted/30">
                    <h4 className="text-xs font-semibold text-foreground mb-2">{st}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium mb-1 block text-muted-foreground">Child Markup %</label>
                        <div className="relative">
                          <Input type="number" step="0.01" min="0" value={childSections[st].markup} onChange={(e) => updateChild(st, "markup", e.target.value)} className="h-7 text-xs text-right pr-6" placeholder="0" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium mb-1 block text-muted-foreground">Child Discount %</label>
                        <div className="relative">
                          <Input type="number" step="0.01" min="0" value={childSections[st].discount} onChange={(e) => updateChild(st, "discount", e.target.value)} className="h-7 text-xs text-right pr-6" placeholder="0" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
              )}
              </div>
            }

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Mark as Template</p>
                <p className="text-[10px] text-muted-foreground/70">Templates appear as copy sources for future versions.</p>
              </div>
              <Switch checked={isTemplate} onCheckedChange={setIsTemplate} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSave}
              disabled={
              !name.trim() ||
              createMutation.isPending ||
              updateMutation.isPending
              }>
              {createMutation.isPending || updateMutation.isPending ?
              <Loader2 className="h-3 w-3 animate-spin mr-1" /> :
              null}
              {editMode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

};

export default VersionSelectorPanel;
