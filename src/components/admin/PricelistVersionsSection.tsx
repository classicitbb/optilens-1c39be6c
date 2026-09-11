import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
import { ArrowUpDown, ChevronLeft, ChevronRight, Copy, Loader2, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PricelistAdjustmentSaveDialog } from "./PricelistAdjustmentSaveDialog";
import { pricelistAdjustmentSignature } from "@/features/pricelists/pricelistAdjustmentSave";
import { buildPricelistEditorPath, isPricelistEditorSection, type PricelistEditorSection } from "@/features/pricelists/routes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BLUE = "hsl(215 65% 50%)";
const LABEL_COLOR = "hsl(215 15% 40%)";
const PAGE_SIZE = 25;

type SortField = "name" | "base_currency" | "markup_percent" | "discount_percent" | "created_at";
type SortDirection = "asc" | "desc";

interface SortableHeadingProps {
  field: SortField;
  label: string;
  activeField: SortField;
  centered?: boolean;
  onSort: (field: SortField) => void;
}

const SortableHeading = ({ field, label, activeField, centered = false, onSort }: SortableHeadingProps) => (
  <button
    type="button"
    className={`inline-flex items-center gap-1 hover:text-primary ${centered ? "justify-center" : ""}`}
    onClick={() => onSort(field)}
    aria-label={`Sort by ${label}`}
  >
    {label}
    <ArrowUpDown className={`h-3 w-3 ${activeField === field ? "text-primary" : "text-muted-foreground"}`} />
  </button>
);

const SECTION_TYPES = ["rx", "stock", "supplies"] as const;
const SECTION_LABELS: Record<string, string> = {
  rx: "RX Lens Prices",
  stock: "Stock Lens Prices",
  supplies: "Supplies Prices",
};

const PricelistVersionsSection = () => {
  const { data: versions, isLoading, createMutation, updateMutation, deleteMutation, materializeAdjustmentsMutation } =
    usePricelistVersions();
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSectionParam = searchParams.get("section") ?? undefined;
  const requestedSection: PricelistEditorSection = isPricelistEditorSection(requestedSectionParam)
    ? requestedSectionParam
    : "rx";
  const requestedItemId = searchParams.get("id");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState<PricelistVersion | null>(null);
  const [originalAdjustmentSignature, setOriginalAdjustmentSignature] = useState<string | null>(null);
  const [adjustmentSaveOpen, setAdjustmentSaveOpen] = useState(false);

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
    setOriginalAdjustmentSignature(null);
    setAdjustmentSaveOpen(false);
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
    const { data: children, error } = await (supabase.from("pricelist_child_sections") as any)
      .select("*")
      .eq("pricelist_version_id", v.id);
    if (error) {
      toast({ title: "Could not load price adjustments", description: error.message, variant: "destructive" });
      setEditMode(null);
      return;
    }

    const newChildState: Record<string, { markup: string; discount: string }> = {
      rx: { markup: "0", discount: "0" },
      stock: { markup: "0", discount: "0" },
      supplies: { markup: "0", discount: "0" },
    };
    for (const c of children ?? []) {
      const sectionKey = SECTION_TYPES.find((key) => SECTION_LABELS[key] === c.section_type);
      if (sectionKey) {
        newChildState[sectionKey] = {
          markup: String(c.child_markup_percent ?? 0),
          discount: String(c.child_discount_percent ?? 0),
        };
      }
    }
    setChildSections(newChildState);
    setOriginalAdjustmentSignature(pricelistAdjustmentSignature({
      version: v,
      childSections: SECTION_TYPES.map((section) => ({
        section_type: SECTION_LABELS[section],
        child_markup_percent: parseFloat(newChildState[section].markup) || 0,
        child_discount_percent: parseFloat(newChildState[section].discount) || 0,
      })),
    }));
    setOpen(true);
  };

  const editPayload = () => {
    const childData: ChildSection[] = SECTION_TYPES.map((st) => ({
      pricelist_version_id: editMode?.id ?? 0,
      section_type: SECTION_LABELS[st],
      child_markup_percent: parseFloat(childSections[st].markup) || 0,
      child_discount_percent: parseFloat(childSections[st].discount) || 0,
    }));
    const updates = {
      name: name.trim(),
      base_currency: currency,
      markup_percent: parseFloat(markupPct) || 0,
      discount_percent: parseFloat(discountPct) || 0,
      is_template: isTemplate,
      format_type: formatType,
      master_markup_percent: parseFloat(masterMarkupPct) || 0,
      master_discount_percent: parseFloat(masterDiscountPct) || 0,
    };
    return { childData, updates };
  };

  const finishEdit = () => {
    setOpen(false);
    resetForm();
    toast({ title: "Pricelist updated" });
  };

  const saveEditedPricelist = (materialize: boolean, replaceManual = false) => {
    if (!editMode) return;
    const { childData, updates } = editPayload();
    setAdjustmentSaveOpen(false);
    const callbacks = {
      onSuccess: finishEdit,
      onError: (e: Error) =>
        toast({ title: "Error", description: e.message, variant: "destructive" as const }),
    };
    if (materialize) {
      materializeAdjustmentsMutation.mutate({
        id: editMode.id,
        updates,
        childSections: childData,
        replaceManual,
      }, callbacks);
    } else {
      updateMutation.mutate({ id: editMode.id, updates, childSections: childData }, callbacks);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editMode) {
      const { childData, updates } = editPayload();
      const nextSignature = pricelistAdjustmentSignature({ version: updates, childSections: childData });
      if (nextSignature === originalAdjustmentSignature) saveEditedPricelist(false);
      else setAdjustmentSaveOpen(true);
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

  const filteredVersions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? (versions ?? []).filter((version) => version.name.toLowerCase().includes(query))
      : (versions ?? []);
    return [...filtered].sort((left, right) => {
      const leftValue = left[sortField];
      const rightValue = right[sortField];
      const comparison = typeof leftValue === "number" || typeof rightValue === "number"
        ? Number(leftValue ?? 0) - Number(rightValue ?? 0)
        : String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [search, sortDirection, sortField, versions]);

  const pageCount = Math.max(1, Math.ceil(filteredVersions.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleVersions = filteredVersions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    setPage(1);
    if (sortField === field) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortField(field);
    setSortDirection(field === "created_at" ? "desc" : "asc");
  };

  const openPrices = (versionId: number, section: PricelistEditorSection) => {
    navigate(buildPricelistEditorPath(versionId, section, requestedItemId));
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

      {requestedItemId ? (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
          Choose the pricelist version where you want to edit this product's {requestedSection === "rx" ? "RX lens" : requestedSection === "stock" ? "stock lens" : "supplies"} price.
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder="Search pricelists by name"
          className="h-8 pl-8 text-xs"
        />
      </div>

      {/* Table */}
      <div className="border border-border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-bold text-foreground"><SortableHeading field="name" label="Name" activeField={sortField} onSort={toggleSort} /></TableHead>
              <TableHead className="text-xs font-bold text-center text-foreground"><SortableHeading field="base_currency" label="Currency" activeField={sortField} centered onSort={toggleSort} /></TableHead>
              <TableHead className="text-xs font-bold text-center text-foreground"><SortableHeading field="markup_percent" label="Markup %" activeField={sortField} centered onSort={toggleSort} /></TableHead>
              <TableHead className="text-xs font-bold text-center text-foreground"><SortableHeading field="discount_percent" label="Discount %" activeField={sortField} centered onSort={toggleSort} /></TableHead>
              <TableHead className="text-xs font-bold text-foreground"><SortableHeading field="created_at" label="Created" activeField={sortField} onSort={toggleSort} /></TableHead>
              <TableHead className="text-xs font-bold text-right text-foreground">Actions</TableHead>
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
            {!isLoading && visibleVersions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-6 text-xs text-muted-foreground"
                >
                  {search ? "No pricelists match your search." : "No pricelist versions yet. Click \"+ New Pricelist\" to create one."}
                </TableCell>
              </TableRow>
            )}
            {visibleVersions.map((v, idx) => (
              <TableRow
                key={v.id}
                className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
              >
                <TableCell className="text-xs font-semibold text-foreground">
                  <button type="button" onClick={() => openPrices(v.id, "rx")} className="flex items-center gap-2 text-left hover:text-primary hover:underline">
                    {v.name}
                    {v.is_template && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 border-primary text-primary"
                      >
                        Template
                      </Badge>
                    )}
                  </button>
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
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant={requestedSection === "rx" && requestedItemId ? "secondary" : "outline"} size="sm" className="h-7 px-2 text-[10px]" onClick={() => openPrices(v.id, "rx")}>RX</Button>
                    <Button variant={requestedSection === "stock" && requestedItemId ? "secondary" : "outline"} size="sm" className="h-7 px-2 text-[10px]" onClick={() => openPrices(v.id, "stock")}>Stock</Button>
                    <Button variant={requestedSection === "supplies" && requestedItemId ? "secondary" : "outline"} size="sm" className="h-7 px-2 text-[10px]" onClick={() => openPrices(v.id, "supplies")}>Supplies</Button>
                    {canEdit ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`More actions for ${v.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(v)}><Pencil className="mr-2 h-3.5 w-3.5" />Edit properties</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(v)} disabled={createMutation.isPending}><Copy className="mr-2 h-3.5 w-3.5" />Duplicate</DropdownMenuItem>
                          {isAdmin ? (
                            <DropdownMenuItem onClick={() => handleDelete(v)} disabled={deleteMutation.isPending} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!isLoading && filteredVersions.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredVersions.length)} of {filteredVersions.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </Button>
            <span>Page {currentPage} of {pageCount}</span>
            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount}>
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

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
                      className="h-8 text-xs text-left pr-6"
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
                      className="h-8 text-xs text-left pr-6"
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
                    className="h-8 text-xs text-left"
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
                    className="h-8 text-xs text-left"
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
                            className="h-7 text-xs text-left pr-6"
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
                            className="h-7 text-xs text-left pr-6"
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
                updateMutation.isPending ||
                materializeAdjustmentsMutation.isPending
              }
            >
              {(createMutation.isPending || updateMutation.isPending || materializeAdjustmentsMutation.isPending) && (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              )}
              {editMode ? "Save Changes" : "Create Pricelist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PricelistAdjustmentSaveDialog
        open={adjustmentSaveOpen}
        isPending={materializeAdjustmentsMutation.isPending}
        onOpenChange={setAdjustmentSaveOpen}
        onPreserveManual={() => saveEditedPricelist(true, false)}
        onReplaceAll={() => saveEditedPricelist(true, true)}
      />
    </div>
  );
};

export default PricelistVersionsSection;
