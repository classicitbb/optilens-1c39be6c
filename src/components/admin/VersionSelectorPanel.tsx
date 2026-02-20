import { useState } from "react";
import {
  usePricelistVersions,
  PricelistVersion,
  CreateVersionInput,
} from "@/hooks/usePricelistVersions";
import { useBBDUSDRate } from "@/hooks/usePricelistVersions";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import { format } from "date-fns";

const BLUE = "hsl(215 65% 50%)";
const LABEL_COLOR = "hsl(215 15% 40%)";

interface VersionSelectorPanelProps {
  pageTitle: string;
  pageSubtitle?: string;
  selectedVersionId: number | null;
  onVersionChange: (id: number) => void;
  showUSD: boolean;
  onShowUSDChange: (v: boolean) => void;
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
  children,
}: VersionSelectorPanelProps) => {
  const { data: versions, isLoading, createMutation, updateMutation, deleteMutation } =
    usePricelistVersions();
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();

  const [selectorCollapsed, setSelectorCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<PricelistVersion | null>(null);
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState<string>("matrix");
  const [currency, setCurrency] = useState<"BBD" | "USD">("BBD");
  const [markupPct, setMarkupPct] = useState("0");
  const [discountPct, setDiscountPct] = useState("0");
  const [isTemplate, setIsTemplate] = useState(false);

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
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (v: PricelistVersion) => {
    setEditMode(v);
    setName(v.name);
    setCurrency((v.base_currency as "BBD" | "USD") ?? "BBD");
    setMarkupPct(String(v.markup_percent ?? 0));
    setDiscountPct(String(v.discount_percent ?? 0));
    setIsTemplate(v.is_template ?? false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
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
          },
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            resetForm();
            toast({ title: "Pricelist updated" });
          },
          onError: (e: any) =>
            toast({ title: "Error", description: e.message, variant: "destructive" }),
        }
      );
    } else {
      const input: CreateVersionInput = {
        name: name.trim(),
        base_currency: currency,
        markup_percent: parseFloat(markupPct) || 0,
        discount_percent: parseFloat(discountPct) || 0,
        is_template: isTemplate,
        copyFrom: copyFrom === "matrix" ? "matrix" : parseInt(copyFrom),
      };
      createMutation.mutate(input, {
        onSuccess: (newV: any) => {
          setDialogOpen(false);
          resetForm();
          onVersionChange(newV.id);
          toast({ title: "Pricelist created" });
        },
        onError: (e: any) =>
          toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (v: PricelistVersion) => {
    if (!confirm(`Delete "${v.name}" and all its prices? Cannot be undone.`)) return;
    deleteMutation.mutate(v.id, {
      onSuccess: () => {
        if (resolvedVersionId === v.id) onVersionChange(versions?.[0]?.id ?? 0);
        toast({ title: "Deleted" });
      },
      onError: (e: any) =>
        toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const handleDuplicate = (v: PricelistVersion) => {
    const input: CreateVersionInput = {
      name: `${v.name} (Copy)`,
      base_currency: v.base_currency ?? "BBD",
      markup_percent: v.markup_percent ?? 0,
      discount_percent: v.discount_percent ?? 0,
      is_template: false,
      copyFrom: v.id,
    };
    createMutation.mutate(input, {
      onSuccess: (newV: any) => {
        onVersionChange(newV.id);
        toast({ title: "Duplicated" });
      },
      onError: (e: any) =>
        toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="text-xs mt-0.5" style={{ color: LABEL_COLOR }}>
              {pageSubtitle}
            </p>
          )}
        </div>
        {canEdit && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            style={{ background: BLUE, color: "white" }}
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5" /> New Pricelist
          </Button>
        )}
      </div>

      {/* Version Selector */}
      <div className="border border-border rounded-md overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
          style={{ background: "hsl(215 15% 96%)" }}
          onClick={() => setSelectorCollapsed((c) => !c)}
        >
          <span className="text-xs font-bold" style={{ color: "hsl(215 30% 15%)" }}>
            Pricelist Versions
            {activeVersion && selectorCollapsed && (
              <span className="ml-2 font-semibold" style={{ color: BLUE }}>
                — {activeVersion.name}
              </span>
            )}
          </span>
          {selectorCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        {!selectorCollapsed && (
          <div className="p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : !versions || versions.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: LABEL_COLOR }}>
                No pricelist versions yet. Click "+ New Pricelist" to create one.
              </p>
            ) : (
              <div className="space-y-1">
                {versions.map((v) => {
                  const isActive = resolvedVersionId === v.id;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors"
                      style={{
                        background: isActive ? "hsl(215 65% 50% / 0.08)" : "transparent",
                        border: isActive
                          ? "1px solid hsl(215 65% 50% / 0.3)"
                          : "1px solid transparent",
                      }}
                      onClick={() => onVersionChange(v.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-semibold truncate"
                            style={{ color: isActive ? BLUE : "hsl(215 30% 15%)" }}
                          >
                            {v.name}
                          </span>
                          {v.is_template && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-3.5"
                              style={{ borderColor: BLUE, color: BLUE }}
                            >
                              Template
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                            {v.base_currency ?? "BBD"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px]" style={{ color: LABEL_COLOR }}>
                            Markup: {v.markup_percent ?? 0}% · Discount:{" "}
                            {v.discount_percent ?? 0}%
                          </span>
                          <span className="text-[10px]" style={{ color: "hsl(215 15% 60%)" }}>
                            Created{" "}
                            {v.created_at
                              ? format(new Date(v.created_at), "dd MMM yyyy")
                              : "—"}
                          </span>
                        </div>
                      </div>
                      {canEdit && (
                        <div
                          className="flex items-center gap-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openEdit(v)}
                            className="p-1 rounded hover:bg-black/5"
                            title="Edit"
                          >
                            <Pencil className="h-3 w-3" style={{ color: LABEL_COLOR }} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(v)}
                            className="p-1 rounded hover:bg-black/5"
                            title="Duplicate"
                            disabled={createMutation.isPending}
                          >
                            <Copy className="h-3 w-3" style={{ color: LABEL_COLOR }} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(v)}
                              className="p-1 rounded hover:bg-red-50"
                              title="Delete"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2
                                className="h-3 w-3"
                                style={{ color: "hsl(0 60% 50%)" }}
                              />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editing context banner */}
      {activeVersion && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-md border"
          style={{
            background: "hsl(215 65% 50% / 0.05)",
            borderColor: "hsl(215 65% 50% / 0.2)",
          }}
        >
          <div className="flex-1 space-y-0.5">
            <p className="text-xs font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
              You are editing:{" "}
              <span style={{ color: BLUE }}>{activeVersion.name}</span>
            </p>
            <div
              className="flex items-center gap-4 text-[10px]"
              style={{ color: LABEL_COLOR }}
            >
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Created{" "}
                {activeVersion.created_at
                  ? format(new Date(activeVersion.created_at), "dd MMM yyyy 'at' HH:mm")
                  : "—"}
              </span>
              {activeVersion.updated_at &&
                activeVersion.updated_at !== activeVersion.created_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last saved{" "}
                    {format(
                      new Date(activeVersion.updated_at),
                      "dd MMM yyyy 'at' HH:mm"
                    )}
                  </span>
                )}
            </div>
          </div>
          {/* BBD/USD toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[10px] font-medium"
              style={{ color: showUSD ? LABEL_COLOR : BLUE }}
            >
              BBD
            </span>
            <Switch
              checked={showUSD}
              onCheckedChange={onShowUSDChange}
              aria-label="Toggle currency"
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: showUSD ? BLUE : LABEL_COLOR }}
            >
              USD
            </span>
          </div>
        </div>
      )}

      {/* Page content */}
      {activeVersion ? (
        children
      ) : (
        <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
          <p className="text-sm" style={{ color: LABEL_COLOR }}>
            Select or create a pricelist version above to start editing.
          </p>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editMode ? "Edit Pricelist" : "New Pricelist Version"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: LABEL_COLOR }}
              >
                Version Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. Retail RX Feb 2026"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            {!editMode && (
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: LABEL_COLOR }}
                >
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
                    {versions?.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                        📋 {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label
                className="text-xs font-medium mb-1 block"
                style={{ color: LABEL_COLOR }}
              >
                Base Currency
              </label>
              <div className="flex gap-2">
                {(["BBD", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className="flex-1 py-1.5 text-xs font-medium rounded border transition-colors"
                    style={{
                      background: currency === c ? BLUE : "transparent",
                      color: currency === c ? "white" : LABEL_COLOR,
                      borderColor: currency === c ? BLUE : "hsl(215 15% 80%)",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: LABEL_COLOR }}
                >
                  Markup %
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={markupPct}
                  onChange={(e) => setMarkupPct(e.target.value)}
                  className="h-8 text-xs text-right"
                />
              </div>
              <div>
                <label
                  className="text-xs font-medium mb-1 block"
                  style={{ color: LABEL_COLOR }}
                >
                  Discount %
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  className="h-8 text-xs text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-medium" style={{ color: LABEL_COLOR }}>
                  Mark as Template
                </p>
                <p className="text-[10px]" style={{ color: "hsl(215 15% 55%)" }}>
                  Templates appear as copy sources for future versions.
                </p>
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
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              style={{ background: BLUE, color: "white" }}
              onClick={handleSave}
              disabled={
                !name.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              {editMode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VersionSelectorPanel;
