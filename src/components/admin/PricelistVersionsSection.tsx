import { useState } from "react";
import { usePricelistVersions, CreateVersionInput, PricelistVersion } from "@/hooks/usePricelistVersions";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
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
    setOpen(true);
  };

  const openEdit = (v: PricelistVersion) => {
    setEditMode(v);
    setName(v.name);
    setCurrency((v.base_currency as "BBD" | "USD") ?? "BBD");
    setMarkupPct(String(v.markup_percent ?? 0));
    setDiscountPct(String(v.discount_percent ?? 0));
    setIsTemplate(v.is_template ?? false);
    setOpen(true);
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

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
            Pricelist Versions
          </h2>
          <p className="text-xs mt-0.5" style={{ color: LABEL_COLOR }}>
            Named, versioned pricing configurations — each copies the base matrix then allows overrides.
          </p>
        </div>
        {canEdit && (
          <Button
            className="gap-1.5 text-sm font-medium px-4 py-2 h-9"
            style={{ background: BLUE, color: "white", borderRadius: "6px" }}
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
            <TableRow style={{ background: "hsl(215 15% 96%)" }}>
              <TableHead className="text-xs font-bold" style={{ color: "hsl(215 30% 15%)" }}>Name</TableHead>
              <TableHead className="text-xs font-bold text-center" style={{ color: "hsl(215 30% 15%)" }}>Currency</TableHead>
              <TableHead className="text-xs font-bold text-center" style={{ color: "hsl(215 30% 15%)" }}>Markup %</TableHead>
              <TableHead className="text-xs font-bold text-center" style={{ color: "hsl(215 30% 15%)" }}>Discount %</TableHead>
              <TableHead className="text-xs font-bold" style={{ color: "hsl(215 30% 15%)" }}>Created</TableHead>
              {canEdit && (
                <TableHead className="text-xs font-bold text-right" style={{ color: "hsl(215 30% 15%)" }}>
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
                  className="text-center py-6 text-xs"
                  style={{ color: LABEL_COLOR }}
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
                <TableCell className="text-xs font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
                  <span className="flex items-center gap-2">
                    {v.name}
                    {v.is_template && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4"
                        style={{ borderColor: BLUE, color: BLUE }}
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
                <TableCell className="text-xs text-center" style={{ color: "hsl(215 30% 15%)" }}>
                  {v.markup_percent ?? 0}%
                </TableCell>
                <TableCell className="text-xs text-center" style={{ color: "hsl(215 30% 15%)" }}>
                  {v.discount_percent ?? 0}%
                </TableCell>
                <TableCell className="text-xs" style={{ color: LABEL_COLOR }}>
                  {v.created_at ? format(new Date(v.created_at), "dd MMM yyyy") : "—"}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
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
                          <Trash2 className="h-3 w-3" style={{ color: "hsl(0 60% 50%)" }} />
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {editMode ? "Edit Pricelist" : "New Pricelist Version"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: LABEL_COLOR }}>
                Version Name <span style={{ color: "hsl(0 60% 50%)" }}>*</span>
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
                <label className="text-xs font-medium mb-1 block" style={{ color: LABEL_COLOR }}>
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
                <p className="text-[10px] mt-1" style={{ color: LABEL_COLOR }}>
                  All prices will be copied from the selected source.
                </p>
              </div>
            )}

            {/* Currency */}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: LABEL_COLOR }}>
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

            {/* Markup / Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: LABEL_COLOR }}>
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
                <label className="text-xs font-medium mb-1 block" style={{ color: LABEL_COLOR }}>
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

            {/* Is Template */}
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
              onClick={() => { setOpen(false); resetForm(); }}
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
