import { useState, useEffect } from "react";
import { usePricelistVersions, CreateVersionInput, PricelistVersion, ChildSection } from "@/hooks/usePricelistVersions";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Loader2, Copy } from "lucide-react";
import { format } from "date-fns";

const BLUE = "hsl(215 65% 50%)";
const LABEL_COLOR = "hsl(215 15% 40%)";

const SECTION_TYPES = ["rx", "stock", "supplies"] as const;
const SECTION_LABELS: Record<string, string> = {
  rx: "RX Lens Prices",
  stock: "Stock Lens Prices",
  supplies: "Supplies Prices",
};

const PricelistVersionsSection = () => {
  const { data: versions, isLoading, createMutation, deleteMutation, updateMutation } =
    usePricelistVersions();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState<PricelistVersion | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState<string>("matrix");
  const [currency, setCurrency] = useState<"BBD" | "USD">("BBD");
  const [markupPct, setMarkupPct] = useState<string>("0");
  const [discountPct, setDiscountPct] = useState<string>("0");
  const [isTemplate, setIsTemplate] = useState(false);
  const [formatType, setFormatType] = useState<string>("list");
  const [masterMarkupPct, setMasterMarkupPct] = useState<string>("0");
  const [masterDiscountPct, setMasterDiscountPct] = useState<string>("0");

  // Child sections state
  const [childSections, setChildSections] = useState<Record<string, { markup: string; discount: string }>>({
    rx: { markup: "0", discount: "0" },
    stock: { markup: "0", discount: "0" },
    supplies: { markup: "0", discount: "0" },
  });

  const resetForm = () => {
    setName("");
    setCopyFrom("matrix");
    setCurrency("BBD");
    setMarkupPct("0");
    setDiscountPct("0");
    setIsTemplate(false);
    setFormatType("list");
    setMasterMarkupPct("0");
    setMasterDiscountPct("0");
    setChildSections({
      rx: { markup: "0", discount: "0" },
      stock: { markup: "0", discount: "0" },
      supplies: { markup: "0", discount: "0" },
    });
    setEditMode(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = async (v: PricelistVersion) => {
    setEditMode(v);
    setName(v.name);
    setCurrency((v.base_currency as "BBD" | "USD") ?? "BBD");
    setMarkupPct(String(v.markup_percent ?? 0));
    setDiscountPct(String(v.discount_percent ?? 0));
    setIsTemplate(v.is_template ?? false);
    setFormatType(v.format_type ?? "list");
    setMasterMarkupPct(String(v.master_markup_percent ?? 0));
    setMasterDiscountPct(String(v.master_discount_percent ?? 0));

    // Fetch child sections
    const { data: children } = await (supabase.from("pricelist_child_sections") as any)
      .select("*")
      .eq("pricelist_version_id", v.id);

    const newChildState: Record<string, { markup: string; discount: string }> = {
      rx: { markup: "0", discount: "0" },
      stock: { markup: "0", discount: "0" },
      supplies: { markup: "0", discount: "0" },
    };
    for (const c of children ?? []) {
      if (newChildState[c.section_type]) {
        newChildState[c.section_type] = {
          markup: String(c.child_markup_percent ?? 0),
          discount: String(c.child_discount_percent ?? 0),
        };
      }
    }
    setChildSections(newChildState);
    setOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const childData: ChildSection[] = SECTION_TYPES.map((st) => ({
      pricelist_version_id: editMode?.id ?? 0,
      section_type: st,
      child_markup_percent: parseFloat(childSections[st].markup) || 0,
      child_discount_percent: parseFloat(childSections[st].discount) || 0,
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
            master_discount_percent: parseFloat(masterDiscountPct) || 0,
          },
          childSections: childData,
        },
        {
          onSuccess: () => {
            setOpen(false);
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
        onSuccess: () => {
          setOpen(false);
          resetForm();
          toast({ title: "Pricelist created" });
        },
        onError: (e: any) =>
          toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (v: PricelistVersion) => {
    if (!confirm(`Delete "${v.name}" and all its prices? This cannot be undone.`)) return;
    deleteMutation.mutate(v.id, {
      onSuccess: () => toast({ title: "Pricelist deleted" }),
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
      onSuccess: () => toast({ title: "Pricelist duplicated" }),
      onError: (e: any) =>
        toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const updateChild = (section: string, field: "markup" | "discount", value: string) => {
    setChildSections((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Pricelist Versions
          </h2>
          <p className="text-xs mt-0.5 text-muted-foreground">
            Named, versioned pricing configurations — each copies the base matrix then allows overrides.
          </p>
        </div>
        {canEdit && (
          <Button
            className="gap-1.5 text-sm font-medium px-4 py-2 h-9 bg-primary text-primary-foreground"
            style={{ borderRadius: "6px" }}
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            New Pricelist
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-bold text-foreground">Name</TableHead>
              <TableHead className="text-xs font-bold text-center text-foreground">Currency</TableHead>
              <TableHead className="text-xs font-bold text-center text-foreground">Markup %</TableHead>
              <TableHead className="text-xs font-bold text-center text-foreground">Discount %</TableHead>
              <TableHead className="text-xs font-bold text-foreground">Created</TableHead>
              {canEdit && (
                <TableHead className="text-xs font-bold text-right text-foreground">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (!versions || versions.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-6 text-xs text-muted-foreground"
                >
                  No pricelist versions yet. Click "+ New Pricelist" to create one.
                </TableCell>
              </TableRow>
            )}
            {versions?.map((v, idx) => (
              <TableRow
                key={v.id}
                className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
              >
                <TableCell className="text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-2">
                    {v.name}
                    {v.is_template && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 border-primary text-primary"
                      >
                        Template
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-center">
                  <Badge variant="secondary" className="text-[10px]">
                    {v.base_currency ?? "BBD"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-center text-foreground">
                  {v.markup_percent ?? 0}%
                </TableCell>
                <TableCell className="text-xs text-center text-foreground">
                  {v.discount_percent ?? 0}%
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {v.created_at ? format(new Date(v.created_at), "dd MMM yyyy") : "—"}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(v)}
                        className="p-1 rounded hover:bg-accent"
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(v)}
                        className="p-1 rounded hover:bg-accent"
                        title="Duplicate"
                        disabled={createMutation.isPending}
                      >
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(v)}
                          className="p-1 rounded hover:bg-destructive/10"
                          title="Delete"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editMode ? "Edit Pricelist Version" : "New Pricelist Version"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Version Name */}
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">
                Version Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. Export USD Feb 2025"
                autoFocus
              />
            </div>

            {/* Copy From (only on create) */}
            {!editMode && (
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
                    {versions?.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                        📋 {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] mt-1 text-muted-foreground">
                  All prices will be copied from the selected source.
                </p>
              </div>
            )}

            {/* Format Type (edit only) */}
            {editMode && (
              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">
                  Format Type
                </label>
                <div className="flex gap-2">
                  {(["matrix", "list"] as const).map((ft) => (
                    <button
                      key={ft}
                      onClick={() => setFormatType(ft)}
                      className="flex-1 py-1.5 text-xs font-medium rounded border transition-colors"
                      style={{
                        background: formatType === ft ? BLUE : "transparent",
                        color: formatType === ft ? "white" : LABEL_COLOR,
                        borderColor: formatType === ft ? BLUE : "hsl(215 15% 80%)",
                      }}
                    >
                      {ft === "matrix" ? "Matrix" : "List"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Currency */}
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">
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

            {/* Master Markup / Discount */}
            {editMode && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Master Markup %
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={masterMarkupPct}
                      onChange={(e) => setMasterMarkupPct(e.target.value)}
                      className="h-8 text-xs text-right pr-6"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Master Discount %
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={masterDiscountPct}
                      onChange={(e) => setMasterDiscountPct(e.target.value)}
                      className="h-8 text-xs text-right pr-6"
                      placeholder="0"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Legacy Markup / Discount (create mode) */}
            {!editMode && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Markup %
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(e.target.value)}
                    className="h-8 text-xs text-right"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">
                    Discount %
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    className="h-8 text-xs text-right"
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {/* Child Section Boxes (edit mode only) */}
            {editMode && (
              <div className="space-y-3 pt-1">
                {SECTION_TYPES.map((st) => (
                  <div key={st} className="border border-border rounded-md p-3 bg-muted/30">
                    <h4 className="text-xs font-semibold text-foreground mb-2">
                      {SECTION_LABELS[st]}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium mb-1 block text-muted-foreground">
                          Child Markup %
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={childSections[st].markup}
                            onChange={(e) => updateChild(st, "markup", e.target.value)}
                            className="h-7 text-xs text-right pr-6"
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-medium mb-1 block text-muted-foreground">
                          Child Discount %
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={childSections[st].discount}
                            onChange={(e) => updateChild(st, "discount", e.target.value)}
                            className="h-7 text-xs text-right pr-6"
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Is Template */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Mark as Template
                </p>
                <p className="text-[10px] text-muted-foreground/70">
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
              onClick={() => { setOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-primary text-primary-foreground"
              onClick={handleSave}
              disabled={
                !name.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              )}
              {editMode ? "Save Changes" : "Create Pricelist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PricelistVersionsSection;
