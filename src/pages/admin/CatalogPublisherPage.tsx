import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useCatalogTemplates, useCatalogAssignments, useCustomersList, type CatalogTemplate } from "@/hooks/useCatalogTemplates";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Copy, Pencil, BookOpen, Users, FileDown, X, ArrowUpDown, ChevronUp, ChevronDown, GripVertical, ArrowUp, ArrowDown, Palette, FileText, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─── Types ─── */
type SortField = "name" | "updated_at" | "customers";
type SortDir = "asc" | "desc";

/* ─── Assignment counts (bulk) ─── */
const useAssignmentCounts = () => {
  return useQuery({
    queryKey: ["catalog-assignment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_assignments").select("catalog_template_id");
      if (error) throw error;
      const counts: Record<number, number> = {};
      (data ?? []).forEach((r: any) => {
        counts[r.catalog_template_id] = (counts[r.catalog_template_id] || 0) + 1;
      });
      return counts;
    },
  });
};

/* ─── Catalog sections for a template ─── */
const useCatalogSections = (templateId?: number) => {
  return useQuery({
    queryKey: ["catalog-sections", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_sections")
        .select("*, pricelist_versions(name)")
        .eq("catalog_template_id", templateId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!templateId,
  });
};

/* ─── Pricelist rows for preview ─── */
const usePricelistPreviewRows = (versionId?: number) => {
  return useQuery({
    queryKey: ["catalog-preview-rows", versionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricelist_catalog_rows")
        .select("section, display_description, bbd_price, row_type, catalog_type")
        .eq("pricelist_version_id", versionId!)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!versionId,
  });
};

/* ─── All pricelist versions for preview ─── */
const useAllPricelistVersions = () => {
  return useQuery({
    queryKey: ["all-pricelist-versions-brief"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricelist_versions")
        .select("id, name, format_type")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
};

/* ─── All rx/stock catalog rows for first available version ─── */
const useDefaultPreviewData = () => {
  return useQuery({
    queryKey: ["catalog-default-preview"],
    queryFn: async () => {
      // Get first version
      const { data: versions } = await supabase
        .from("pricelist_versions")
        .select("id, name")
        .order("id", { ascending: true })
        .limit(1);
      const vId = versions?.[0]?.id;
      if (!vId) return { sections: {} as Record<string, { description: string; price: number | null }[]>, versionName: "" };

      const { data: rows } = await supabase
        .from("pricelist_catalog_rows")
        .select("section, display_description, bbd_price, row_type, catalog_type")
        .eq("pricelist_version_id", vId)
        .order("sort_order");

      const sections: Record<string, { description: string; price: number | null }[]> = {};
      (rows ?? []).forEach((r: any) => {
        const key = r.section;
        if (!sections[key]) sections[key] = [];
        sections[key].push({ description: r.display_description, price: r.bbd_price });
      });

      // Also get addons
      const { data: addons } = await supabase
        .from("addons")
        .select("name, price")
        .eq("is_active", true)
        .order("sort_order");

      if (addons && addons.length > 0) {
        sections["Add-Ons & Extras"] = addons.map((a: any) => ({ description: a.name, price: a.price }));
      }

      return { sections, versionName: versions?.[0]?.name ?? "" };
    },
  });
};

const fmt = (n: number | null) => n != null ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ═══════════════════ Preview Pane ═══════════════════ */
const CatalogPreviewPane = ({ template, onClose }: { template: CatalogTemplate; onClose: () => void }) => {
  const { data: settings } = useCompanySettings();
  const { data: previewData } = useDefaultPreviewData();
  const sections = previewData?.sections ?? {};
  const sectionKeys = Object.keys(sections);

  return (
    <div className="border-l flex flex-col" style={{ borderColor: "hsl(215 25% 88%)", width: 440, minWidth: 440 }}>
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "hsl(215 25% 88%)" }}>
        <span className="text-xs font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Catalog Preview</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Cover */}
        <div
          className="rounded-lg p-6 text-white flex flex-col items-center justify-center text-center"
          style={{
            background: `linear-gradient(135deg, ${template.gradient_color_start || "#1e4db7"}, ${template.gradient_color_end || "#0f2a5e"})`,
            minHeight: 220,
          }}
        >
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="h-10 mb-3 object-contain" />
          )}
          <h2 className="text-lg font-bold mb-1">{template.cover_title || template.name}</h2>
          {template.cover_subtitle && <p className="text-xs opacity-80">{template.cover_subtitle}</p>}
          {settings && <p className="text-[10px] mt-3 opacity-60">{settings.company_name} · {settings.tel}</p>}
        </div>

        {/* TOC */}
        <div className="border rounded-lg p-3" style={{ borderColor: "hsl(215 25% 88%)" }}>
          <h3 className="text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: "hsl(215 65% 50%)" }}>
            Table of Contents
          </h3>
          <div className="space-y-1">
            {sectionKeys.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-0.5" style={{ color: "hsl(215 15% 50%)" }}>
                <span className="truncate mr-2">{s}</span>
                <span className="text-[10px] tabular-nums">{i + 2}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section pages */}
        {sectionKeys.slice(0, 6).map((sectionName) => (
          <div key={sectionName} className="border rounded-lg p-3" style={{ borderColor: "hsl(215 25% 88%)" }}>
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b" style={{ borderColor: "hsl(215 65% 50%)" }}>
              <div className="w-1 h-4 rounded-full" style={{ background: "hsl(215 65% 50%)" }} />
              <h3 className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "hsl(215 30% 15%)" }}>
                {sectionName}
              </h3>
            </div>
            <div className="space-y-0">
              {sections[sectionName].slice(0, 8).map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-[10px] py-1 border-b last:border-b-0"
                  style={{ color: "hsl(215 15% 40%)", borderColor: "hsl(215 25% 94%)" }}
                >
                  <span className="truncate mr-4 flex-1">{row.description}</span>
                  <span className="font-mono font-medium tabular-nums whitespace-nowrap" style={{ color: "hsl(215 30% 15%)" }}>
                    ${fmt(row.price)}
                  </span>
                </div>
              ))}
              {sections[sectionName].length > 8 && (
                <p className="text-[9px] text-center pt-1" style={{ color: "hsl(215 15% 65%)" }}>
                  +{sections[sectionName].length - 8} more items…
                </p>
              )}
            </div>
          </div>
        ))}
        {sectionKeys.length > 6 && (
          <p className="text-[10px] text-center" style={{ color: "hsl(215 15% 55%)" }}>
            +{sectionKeys.length - 6} more sections in full catalog
          </p>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════ PDF Generator ═══════════════════ */
const generateCatalogPdf = async (template: CatalogTemplate, settings: any) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Cover page
  doc.setFillColor(30, 77, 183);
  doc.rect(0, 0, pw, ph, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text(template.cover_title || template.name, pw / 2, ph / 2 - 10, { align: "center" });
  if (template.cover_subtitle) {
    doc.setFontSize(14);
    doc.text(template.cover_subtitle, pw / 2, ph / 2 + 5, { align: "center" });
  }
  if (settings?.company_name) {
    doc.setFontSize(10);
    doc.text(settings.company_name, pw / 2, ph - 30, { align: "center" });
    if (settings.tel) doc.text(settings.tel, pw / 2, ph - 24, { align: "center" });
    if (settings.email) doc.text(settings.email, pw / 2, ph - 18, { align: "center" });
  }

  // Fetch pricelist data
  const { data: versions } = await supabase
    .from("pricelist_versions")
    .select("id, name")
    .order("id", { ascending: true })
    .limit(1);
  const vId = versions?.[0]?.id;

  if (vId) {
    const { data: rows } = await supabase
      .from("pricelist_catalog_rows")
      .select("section, display_description, bbd_price, row_type, catalog_type")
      .eq("pricelist_version_id", vId)
      .order("sort_order");

    const sections: Record<string, { description: string; price: number | null }[]> = {};
    (rows ?? []).forEach((r: any) => {
      if (!sections[r.section]) sections[r.section] = [];
      sections[r.section].push({ description: r.display_description, price: r.bbd_price });
    });

    // TOC page
    doc.addPage();
    doc.setTextColor(30, 77, 183);
    doc.setFontSize(18);
    doc.text("Table of Contents", 20, 30);
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    const sKeys = Object.keys(sections);
    sKeys.forEach((s, i) => {
      doc.text(`${i + 1}. ${s}`, 25, 48 + i * 8);
    });

    // Section pages
    for (const sectionName of sKeys) {
      doc.addPage();
      // Header bar
      doc.setFillColor(30, 77, 183);
      doc.rect(0, 0, pw, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(sectionName, 15, 10);

      const tableRows = sections[sectionName].map((r) => [
        r.description,
        r.price != null ? `$${r.price.toFixed(2)}` : "—",
      ]);

      autoTable(doc, {
        startY: 20,
        head: [["Description", "Price (BBD)"]],
        body: tableRows,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 1: { halign: "right", cellWidth: 30 } },
        margin: { left: 15, right: 15 },
      });
    }

    // Add-ons
    const { data: addons } = await supabase
      .from("addons")
      .select("name, price")
      .eq("is_active", true)
      .order("sort_order");

    if (addons && addons.length > 0) {
      doc.addPage();
      doc.setFillColor(30, 77, 183);
      doc.rect(0, 0, pw, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text("Add-Ons & Extras", 15, 10);

      autoTable(doc, {
        startY: 20,
        head: [["Add-On", "Price (BBD)"]],
        body: addons.map((a: any) => [a.name, `$${a.price.toFixed(2)}`]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 1: { halign: "right", cellWidth: 30 } },
        margin: { left: 15, right: 15 },
      });
    }
  }

  // Page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i - 1} of ${pages - 1}`, pw / 2, ph - 8, { align: "center" });
    if (settings?.company_name) {
      doc.text(settings.company_name, 15, ph - 8);
    }
  }

  doc.save(`${template.name.replace(/\s+/g, "_")}_Catalog.pdf`);
};

/* ═══════════════════ Assign Dialog ═══════════════════ */
const AssignDialog = ({ template, open, onClose }: { template: CatalogTemplate | null; open: boolean; onClose: () => void }) => {
  const { data: customers = [] } = useCustomersList();
  const { data: assignments = [], setAssignments } = useCatalogAssignments(template?.id);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [customerSearch, setCustomerSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (assignments.length > 0) {
      setSelected(new Set(assignments.map((a) => a.customer_id!).filter(Boolean)));
    } else {
      setSelected(new Set());
    }
  }, [assignments]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const s = customerSearch.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(s));
  }, [customers, customerSearch]);

  const handleSave = async () => {
    if (!template) return;
    try {
      await setAssignments.mutateAsync({ templateId: template.id, customerIds: Array.from(selected) });
      qc.invalidateQueries({ queryKey: ["catalog-assignment-counts"] });
      toast({ title: `Assigned to ${selected.size} customer(s)` });
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">Assign "{template?.name}" to Customers</DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search customers…" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="h-8 pl-8 text-xs" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
          {filteredCustomers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No customers found</p>
          ) : (
            filteredCustomers.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                {c.name}
              </label>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-2 pt-3 border-t">
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={setAssignments.isPending}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════ Catalogs Tab ═══════════════════ */
const CatalogsTab = ({ onEdit }: { onEdit: (t: CatalogTemplate) => void }) => {
  const { data: templates = [], isLoading, createMutation, deleteMutation, duplicateMutation } = useCatalogTemplates();
  const { data: counts = {} } = useAssignmentCounts();
  const { data: settings } = useCompanySettings();
  const { canEditFeature } = useRolePermissions();
  const canEdit = canEditFeature("catalog-publisher");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [preview, setPreview] = useState<CatalogTemplate | null>(null);
  const [assignTarget, setAssignTarget] = useState<CatalogTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogTemplate | null>(null);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const filtered = useMemo(() => {
    let list = templates;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(s) || (t.cover_title ?? "").toLowerCase().includes(s));
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "updated_at") cmp = (a.updated_at ?? "").localeCompare(b.updated_at ?? "");
      else if (sortField === "customers") cmp = (counts[a.id] ?? 0) - (counts[b.id] ?? 0);
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [templates, search, sortField, sortDir, counts]);

  const handleNew = async () => {
    try {
      const created = await createMutation.mutateAsync({
        name: "Untitled Catalog",
        cover_title: settings?.company_name ?? "Product Catalog",
        cover_subtitle: settings?.slogan ?? "",
      });
      onEdit(created);
      toast({ title: "Catalog created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Deleted" });
      if (preview?.id === deleteTarget.id) setPreview(null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const handleDuplicate = async (t: CatalogTemplate) => {
    try {
      await duplicateMutation.mutateAsync(t);
      toast({ title: "Duplicated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDownloadPdf = async (t: CatalogTemplate) => {
    toast({ title: "Generating PDF…" });
    try {
      await generateCatalogPdf(t, settings);
      toast({ title: "PDF downloaded" });
    } catch (e: any) {
      toast({ title: "PDF Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-1 space-y-3 overflow-auto pr-1">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search catalogs…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pl-8 text-xs" />
          </div>
          {canEdit && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleNew} disabled={createMutation.isPending}>
              <Plus className="h-3.5 w-3.5" /> New Catalog
            </Button>
          )}
        </div>

        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="h-8 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center gap-1">Name <SortIcon field="name" /></span>
                </TableHead>
                <TableHead className="h-8 cursor-pointer select-none" onClick={() => toggleSort("updated_at")}>
                  <span className="flex items-center gap-1">Last Edited <SortIcon field="updated_at" /></span>
                </TableHead>
                <TableHead className="h-8 text-center cursor-pointer select-none" onClick={() => toggleSort("customers")}>
                  <span className="flex items-center gap-1 justify-center"># Customers <SortIcon field="customers" /></span>
                </TableHead>
                <TableHead className="h-8">Status</TableHead>
                {canEdit && <TableHead className="h-8 w-40" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-xs py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-xs py-8 text-muted-foreground">No catalogs found. Click "New Catalog" to create one.</TableCell></TableRow>
              ) : (
                filtered.map((t) => {
                  const custCount = counts[t.id] ?? 0;
                  return (
                    <TableRow
                      key={t.id}
                      className={`cursor-pointer hover:bg-muted/50 text-xs ${preview?.id === t.id ? "bg-primary/5" : ""}`}
                      onClick={() => setPreview(t)}
                    >
                      <TableCell className="py-1.5 font-medium">{t.name}</TableCell>
                      <TableCell className="py-1.5 text-muted-foreground">{fmtDate(t.updated_at)}</TableCell>
                      <TableCell className="py-1.5 text-center">
                        <Badge variant="outline" className={`text-[10px] ${custCount > 0 ? "bg-primary/10 text-primary border-primary/30" : ""}`}>
                          {custCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                          Draft
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="py-1.5">
                          <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => onEdit(t)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Assign to Customers" onClick={() => setAssignTarget(t)}>
                              <Users className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicate" onClick={() => handleDuplicate(t)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Download PDF" onClick={() => handleDownloadPdf(t)}>
                              <FileDown className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Delete" onClick={() => setDeleteTarget(t)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {preview && <CatalogPreviewPane template={preview} onClose={() => setPreview(null)} />}

      <AssignDialog template={assignTarget} open={!!assignTarget} onClose={() => setAssignTarget(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Catalog?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{deleteTarget?.name}" and all customer assignments.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* ─── Catalog Sections CRUD ─── */
interface CatalogSection {
  id?: number;
  catalog_template_id: number;
  section_type: string;
  sort_order: number;
  is_included: boolean;
  pricelist_version_id: number | null;
  format_choice: string | null;
  article_id: number | null;
  custom_title: string | null;
}

const useCatalogSectionsEditor = (templateId?: number) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["catalog-sections-editor", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_sections")
        .select("*")
        .eq("catalog_template_id", templateId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CatalogSection[];
    },
    enabled: !!templateId,
  });

  const addSection = useMutation({
    mutationFn: async (section: Omit<CatalogSection, "id">) => {
      const { error } = await supabase.from("catalog_sections").insert(section as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CatalogSection> & { id: number }) => {
      const { error } = await supabase.from("catalog_sections").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  const removeSection = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("catalog_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  const reorderSections = useMutation({
    mutationFn: async (sections: { id: number; sort_order: number }[]) => {
      for (const s of sections) {
        await supabase.from("catalog_sections").update({ sort_order: s.sort_order } as any).eq("id", s.id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog-sections-editor", templateId] }),
  });

  return { ...query, addSection, updateSection, removeSection, reorderSections };
};

/* ─── Help Articles for Knowledge section (public only) ─── */
const useHelpArticlesForCatalog = () => {
  return useQuery({
    queryKey: ["help-articles-catalog-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, title, category, visibility, content, description")
        .eq("is_active", true)
        .in("content_type", ["knowledge", "faq"])
        .in("visibility", ["public", "customer"])
        .order("category")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
};

/* ─── Section type definitions ─── */
const PRICING_SECTIONS = [
  { type: "rx_prices", label: "RX Lens Prices", icon: "💊", needsVersion: true, hasFormat: true },
  { type: "stock_prices", label: "Stock Lens Prices", icon: "📦", needsVersion: true, hasFormat: false },
  { type: "supplies_prices", label: "Supplies Prices", icon: "🧪", needsVersion: true, hasFormat: false },
] as const;

const FIXED_SECTIONS = [
  { type: "terms_conditions", label: "Terms & Conditions", icon: "📋" },
  { type: "contact_information", label: "Contact Information", icon: "📞" },
  { type: "additional_charges", label: "Additional Charges", icon: "💰" },
  { type: "dispensing_guide", label: "Dispensing Guide", icon: "👓" },
  { type: "lablink_instructions", label: "LabLink Instructions", icon: "🔗" },
  { type: "special_services", label: "Special Services", icon: "⭐" },
] as const;

const ALL_SECTION_DEFS = [
  ...PRICING_SECTIONS.map((s) => ({ ...s, category: "pricing" as const })),
  { type: "knowledge_article", label: "Knowledge Article", icon: "📖", category: "content" as const, needsVersion: false, hasFormat: false },
  ...FIXED_SECTIONS.map((s) => ({ ...s, category: "fixed" as const, needsVersion: false, hasFormat: false })),
];

const getSectionDef = (type: string) => ALL_SECTION_DEFS.find((d) => d.type === type);
const getSectionLabel = (type: string) => getSectionDef(type)?.label ?? type;
const getSectionIcon = (type: string) => getSectionDef(type)?.icon ?? "📄";

/* ═══════════════════ Editor Live Preview ═══════════════════ */
const EditorLivePreview = ({ template, sections, versions, articles, settings }: {
  template: CatalogTemplate;
  sections: CatalogSection[];
  versions: { id: number; name: string }[];
  articles: { id: string; title: string; category: string; content?: string; description?: string }[];
  settings: any;
}) => {
  const includedSections = sections.filter((s) => s.is_included !== false);

  // Collect unique pricelist version IDs for data fetching
  const versionIds = useMemo(() => {
    const ids = new Set<number>();
    includedSections.forEach((s) => {
      if (s.pricelist_version_id) ids.add(s.pricelist_version_id);
    });
    return Array.from(ids);
  }, [includedSections]);

  // Fetch real pricing rows for all referenced versions
  const { data: allRows = [] } = useQuery({
    queryKey: ["catalog-preview-all-rows", versionIds],
    queryFn: async () => {
      if (versionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("pricelist_catalog_rows")
        .select("section, display_description, bbd_price, row_type, catalog_type, pricelist_version_id, sort_order")
        .in("pricelist_version_id", versionIds)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    enabled: versionIds.length > 0,
  });

  // Fetch addons for pricing sections
  const { data: addons = [] } = useQuery({
    queryKey: ["catalog-preview-addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addons")
        .select("name, price, category")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Group rows by version + catalog_type
  const rowsByVersionType = useMemo(() => {
    const map: Record<string, Record<string, { description: string; price: number | null }[]>> = {};
    allRows.forEach((r: any) => {
      const key = `${r.pricelist_version_id}-${r.catalog_type}`;
      if (!map[key]) map[key] = {};
      if (!map[key][r.section]) map[key][r.section] = [];
      map[key][r.section].push({ description: r.display_description, price: r.bbd_price });
    });
    return map;
  }, [allRows]);

  const SECTION_TO_CATALOG_TYPE: Record<string, string> = {
    rx_prices: "rx",
    stock_prices: "stock",
    supplies_prices: "buysell",
  };

  const fmtPrice = (n: number | null) => n != null ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";

  /* ── Document-style CSS (matches QuotePdfExport pattern) ── */
  const docStyles: React.CSSProperties = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#1a202c",
    fontSize: "10px",
    lineHeight: 1.5,
    background: "white",
  };

  return (
    <div className="border-l flex flex-col h-full" style={{ borderColor: "hsl(var(--border))", width: 420, minWidth: 420 }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30" style={{ borderColor: "hsl(var(--border))" }}>
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">PDF Preview</span>
        <span className="text-[9px] text-muted-foreground ml-auto">Live · {includedSections.length} sections</span>
      </div>
      <ScrollArea className="flex-1 bg-muted/20">
        <div className="p-4">
          {/* Paper shadow container */}
          <div className="rounded shadow-lg border" style={{ ...docStyles, borderColor: "#e2e8f0" }}>

            {/* ── COVER PAGE ── */}
            <div
              className="flex flex-col items-center justify-center text-center text-white"
              style={{
                background: `linear-gradient(135deg, ${template.gradient_color_start || "#1e4db7"}, ${template.gradient_color_end || "#0f2a5e"})`,
                minHeight: 280,
                padding: "40px 24px",
                borderRadius: "4px 4px 0 0",
              }}
            >
              {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="h-10 mb-4 object-contain" />}
              <h1 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px", letterSpacing: "0.5px" }}>
                {template.cover_title || template.name}
              </h1>
              {template.cover_subtitle && (
                <p style={{ fontSize: "11px", opacity: 0.85, marginBottom: "16px" }}>{template.cover_subtitle}</p>
              )}
              {settings?.company_name && (
                <div style={{ marginTop: "auto", paddingTop: "24px", opacity: 0.6, fontSize: "9px" }}>
                  <div>{settings.company_name}</div>
                  {settings.tel && <div>{settings.tel} · {settings.email}</div>}
                </div>
              )}
            </div>

            {/* ── TABLE OF CONTENTS PAGE ── */}
            {includedSections.length > 0 && (
              <div style={{ padding: "24px", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#2b6cb0", marginBottom: "12px", borderBottom: "2px solid #2b6cb0", paddingBottom: "6px" }}>
                  Table of Contents
                </div>
                {includedSections.map((s, i) => {
                  const vName = s.pricelist_version_id ? versions.find((v) => v.id === s.pricelist_version_id)?.name : null;
                  const art = s.article_id ? articles.find((a) => String(a.id) === String(s.article_id)) : null;
                  const label = s.section_type === "knowledge_article"
                    ? (s.custom_title || art?.title || "Article")
                    : getSectionLabel(s.section_type);
                  return (
                    <div key={s.id ?? i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px dotted #e2e8f0" }}>
                      <span style={{ color: "#2d3748", fontSize: "10px" }}>
                        {i + 1}. {label}{vName ? ` — ${vName}` : ""}
                      </span>
                      <span style={{ color: "#a0aec0", fontSize: "9px", fontFamily: "monospace" }}>{i + 2}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── SECTION PAGES ── */}
            {includedSections.map((s, i) => {
              const art = s.section_type === "knowledge_article"
                ? articles.find((a) => String(a.id) === String(s.article_id))
                : null;
              const label = s.section_type === "knowledge_article"
                ? (s.custom_title || art?.title || "Knowledge Article")
                : getSectionLabel(s.section_type);
              const isPricing = ["rx_prices", "stock_prices", "supplies_prices"].includes(s.section_type);

              // Get real data for pricing sections
              const catalogType = SECTION_TO_CATALOG_TYPE[s.section_type];
              const dataKey = s.pricelist_version_id ? `${s.pricelist_version_id}-${catalogType}` : null;
              const sectionData = dataKey ? rowsByVersionType[dataKey] : null;
              const sectionKeys = sectionData ? Object.keys(sectionData) : [];

              return (
                <div key={s.id ?? i} style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
                  {/* Section header bar */}
                  <div style={{
                    background: "#2b6cb0",
                    color: "white",
                    padding: "6px 12px",
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "12px",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}>
                    <span>{getSectionIcon(s.section_type)}</span>
                    {label}
                    {s.format_choice && (
                      <span style={{ marginLeft: "auto", fontSize: "8px", opacity: 0.8, textTransform: "none", fontWeight: 400 }}>
                        ({s.format_choice})
                      </span>
                    )}
                  </div>

                  {/* Pricing table with real data */}
                  {isPricing && sectionKeys.length > 0 ? (
                    <div>
                      {sectionKeys.map((sectionName) => (
                        <div key={sectionName} style={{ marginBottom: "12px" }}>
                          <div style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "#718096", marginBottom: "4px", paddingBottom: "2px", borderBottom: "1px solid #e2e8f0" }}>
                            {sectionName} ({sectionData![sectionName].length})
                          </div>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: "left", padding: "4px 6px", fontSize: "8px", fontWeight: 600, textTransform: "uppercase", color: "#4a5568", background: "#f7fafc", borderBottom: "1px solid #e2e8f0" }}>Description</th>
                                <th style={{ textAlign: "right", padding: "4px 6px", fontSize: "8px", fontWeight: 600, textTransform: "uppercase", color: "#4a5568", background: "#f7fafc", borderBottom: "1px solid #e2e8f0", width: "70px" }}>Price (BBD)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sectionData![sectionName].map((row, idx) => (
                                <tr key={idx}>
                                  <td style={{ padding: "3px 6px", fontSize: "9px", borderBottom: "1px solid #edf2f7", color: "#2d3748" }}>{row.description}</td>
                                  <td style={{ padding: "3px 6px", fontSize: "9px", borderBottom: "1px solid #edf2f7", textAlign: "right", fontFamily: "'SF Mono', monospace", color: "#1a202c", fontWeight: 500 }}>
                                    ${fmtPrice(row.price)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ) : isPricing && !s.pricelist_version_id ? (
                    <div style={{ textAlign: "center", padding: "16px", color: "#a0aec0", fontSize: "9px", fontStyle: "italic" }}>
                      Select a pricelist version to see pricing data
                    </div>
                  ) : isPricing ? (
                    <div style={{ textAlign: "center", padding: "16px", color: "#a0aec0", fontSize: "9px", fontStyle: "italic" }}>
                      No pricing rows found for this version
                    </div>
                  ) : null}

                  {/* Knowledge article content */}
                  {art && (
                    <div>
                      {art.description && (
                        <p style={{ fontSize: "9px", color: "#718096", fontStyle: "italic", marginBottom: "8px" }}>{art.description}</p>
                      )}
                      <div style={{ fontSize: "9px", color: "#2d3748", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {art.content?.slice(0, 600)}{(art.content?.length ?? 0) > 600 ? "…" : ""}
                      </div>
                    </div>
                  )}

                  {/* Fixed section placeholder */}
                  {!isPricing && !art && (
                    <div style={{ padding: "12px", background: "#f7fafc", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                      <p style={{ fontSize: "9px", color: "#718096", fontStyle: "italic" }}>
                        {label} content will be rendered from company settings and templates.
                      </p>
                    </div>
                  )}

                  {/* Page number */}
                  <div style={{ textAlign: "center", marginTop: "12px", fontSize: "8px", color: "#a0aec0" }}>
                    Page {i + 2}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {includedSections.length === 0 && (
              <div style={{ padding: "40px 24px", textAlign: "center", color: "#a0aec0", fontSize: "10px" }}>
                Add sections from the palette to see the catalog preview.
              </div>
            )}

            {/* ── FOOTER ── */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", textAlign: "center", fontSize: "8px", color: "#a0aec0", borderRadius: "0 0 4px 4px", background: "#f7fafc" }}>
              {settings?.company_name && <div>{settings.company_name} — {settings?.slogan}</div>}
              {settings?.tel && <div style={{ marginTop: "2px" }}>{settings.tel} · {settings.email}</div>}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

/* ═══════════════════ Section Row in Editor ═══════════════════ */
const SectionRow = ({ section, index, total, versions, articles, onUpdate, onRemove, onMoveUp, onMoveDown }: {
  section: CatalogSection;
  index: number;
  total: number;
  versions: { id: number; name: string; format_type: string | null }[];
  articles: { id: string; title: string; category: string; content?: string; description?: string }[];
  onUpdate: (id: number, updates: Partial<CatalogSection>) => void;
  onRemove: (id: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) => {
  const isPricing = ["rx_prices", "stock_prices", "supplies_prices"].includes(section.section_type);
  const isKnowledge = section.section_type === "knowledge_article";

  return (
    <div className="border rounded-lg p-3 bg-background group" style={{ borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} disabled={index === total - 1}>
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
        <span className="text-sm">{getSectionIcon(section.section_type)}</span>
        <span className="text-xs font-medium flex-1 text-foreground">{getSectionLabel(section.section_type)}</span>
        <Checkbox
          checked={section.is_included !== false}
          onCheckedChange={(checked) => section.id && onUpdate(section.id, { is_included: !!checked })}
        />
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => section.id && onRemove(section.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Pricing section options */}
      {isPricing && (
        <div className="mt-2 pl-14 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Pricelist:</Label>
            <Select
              value={section.pricelist_version_id ? String(section.pricelist_version_id) : ""}
              onValueChange={(v) => section.id && onUpdate(section.id, { pricelist_version_id: Number(v) })}
            >
              <SelectTrigger className="h-7 text-[11px] w-48">
                <SelectValue placeholder="Select pricelist…" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)} className="text-xs">{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {section.section_type === "rx_prices" && (
            <RadioGroup
              value={section.format_choice || "list"}
              onValueChange={(v) => section.id && onUpdate(section.id, { format_choice: v })}
              className="flex gap-3"
            >
              <div className="flex items-center gap-1">
                <RadioGroupItem value="matrix" id={`fmt-matrix-${section.id}`} className="h-3 w-3" />
                <Label htmlFor={`fmt-matrix-${section.id}`} className="text-[10px]">Matrix</Label>
              </div>
              <div className="flex items-center gap-1">
                <RadioGroupItem value="list" id={`fmt-list-${section.id}`} className="h-3 w-3" />
                <Label htmlFor={`fmt-list-${section.id}`} className="text-[10px]">List</Label>
              </div>
            </RadioGroup>
          )}
        </div>
      )}

      {/* Knowledge article selector */}
      {isKnowledge && (
        <div className="mt-2 pl-14 space-y-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Article (public Knowledge Base only)</Label>
            <Select
              value={section.article_id ? String(section.article_id) : ""}
              onValueChange={(v) => section.id && onUpdate(section.id, { article_id: Number(v) })}
            >
              <SelectTrigger className="h-7 text-[11px] w-72">
                <SelectValue placeholder="Select article…" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const grouped: Record<string, typeof articles> = {};
                  articles.forEach((a) => {
                    const cat = a.category || "Uncategorized";
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(a);
                  });
                  return Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</div>
                      {items.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                          {a.title}
                        </SelectItem>
                      ))}
                    </div>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Custom Title Override (optional)</Label>
            <Input
              className="h-7 text-xs w-72 mt-0.5"
              placeholder={articles.find((a) => String(a.id) === String(section.article_id))?.title || "Use original title"}
              value={section.custom_title ?? ""}
              onChange={(e) => section.id && onUpdate(section.id, { custom_title: e.target.value || null })}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════ Editor Tab ═══════════════════ */
const EditorTab = ({ template, onExit }: { template: CatalogTemplate | null; onExit: () => void }) => {
  const { updateMutation } = useCatalogTemplates();
  const { data: versions = [] } = useAllPricelistVersions();
  const { data: articles = [] } = useHelpArticlesForCatalog();
  const { data: settings } = useCompanySettings();
  const { toast } = useToast();

  const [name, setName] = useState(template?.name ?? "");
  const [coverTitle, setCoverTitle] = useState(template?.cover_title ?? "");
  const [coverSubtitle, setCoverSubtitle] = useState(template?.cover_subtitle ?? "");
  const [gradStart, setGradStart] = useState(template?.gradient_color_start ?? "#1e4db7");
  const [gradEnd, setGradEnd] = useState(template?.gradient_color_end ?? "#0f2a5e");

  const { data: sections = [], addSection, updateSection, removeSection, reorderSections } = useCatalogSectionsEditor(template?.id);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCoverTitle(template.cover_title ?? "");
      setCoverSubtitle(template.cover_subtitle ?? "");
      setGradStart(template.gradient_color_start ?? "#1e4db7");
      setGradEnd(template.gradient_color_end ?? "#0f2a5e");
    }
  }, [template]);

  const handleSave = async () => {
    if (!template) return;
    try {
      await updateMutation.mutateAsync({
        id: template.id,
        name,
        cover_title: coverTitle,
        cover_subtitle: coverSubtitle,
        gradient_color_start: gradStart,
        gradient_color_end: gradEnd,
      });
      toast({ title: "Template saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAddSection = async (sectionType: string) => {
    if (!template) return;
    const maxSort = sections.reduce((max, s) => Math.max(max, s.sort_order ?? 0), 0);
    try {
      await addSection.mutateAsync({
        catalog_template_id: template.id,
        section_type: sectionType,
        sort_order: maxSort + 1,
        is_included: true,
        pricelist_version_id: null,
        format_choice: sectionType === "rx_prices" ? "list" : null,
        article_id: null,
        custom_title: null,
      });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateSection = async (id: number, updates: Partial<CatalogSection>) => {
    try {
      await updateSection.mutateAsync({ id, ...updates });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleRemoveSection = async (id: number) => {
    try {
      await removeSection.mutateAsync(id);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const reordered = [...sections];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const updates = reordered.map((s, i) => ({ id: s.id!, sort_order: i }));
    try {
      await reorderSections.mutateAsync(updates);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const liveTemplate: CatalogTemplate = template
    ? { ...template, name, cover_title: coverTitle, cover_subtitle: coverSubtitle, gradient_color_start: gradStart, gradient_color_end: gradEnd }
    : { id: 0, name: "", cover_title: null, cover_subtitle: null, gradient_color_start: null, gradient_color_end: null, created_at: null, updated_at: null, created_by: null };

  if (!template) {
    return (
      <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">
        Select or create a catalog from the Catalogs tab to start editing.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b mb-3" style={{ borderColor: "hsl(var(--border))" }}>
        <h2 className="text-sm font-semibold text-foreground truncate">
          Editing: {name || "Untitled"}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { handleSave().then(() => onExit()); }}>
            Save &amp; Exit to Catalogs List
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>Save Template</Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => { handleSave(); toast({ title: "Published" }); }}>
            Save &amp; Publish
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-0 min-h-0">
        {/* Left: Palette */}
        <div className="w-48 shrink-0 border-r overflow-auto pr-2 space-y-3" style={{ borderColor: "hsl(var(--border))" }}>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Pricing
            </h4>
            {PRICING_SECTIONS.map((s) => (
              <button
                key={s.type}
                className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-muted/50 flex items-center gap-1.5 transition-colors text-foreground"
                onClick={() => handleAddSection(s.type)}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> Content
            </h4>
            <button
              className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-muted/50 flex items-center gap-1.5 transition-colors text-foreground"
              onClick={() => handleAddSection("knowledge_article")}
            >
              📖 Knowledge Article
            </button>
            <p className="text-[9px] text-muted-foreground px-2 mt-1 leading-relaxed">
              Knowledge articles are pulled from Website Content → Knowledge Base (public ones only).
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Fixed Sections
            </h4>
            {FIXED_SECTIONS.map((s) => (
              <button
                key={s.type}
                className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-muted/50 flex items-center gap-1.5 transition-colors text-foreground"
                onClick={() => handleAddSection(s.type)}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Cover + Section Builder */}
        <div className="flex-1 overflow-auto px-4 space-y-4 min-w-0">
          {/* Cover Settings */}
          <div className="border rounded-lg p-4" style={{ borderColor: "hsl(var(--border))" }}>
            <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" /> Cover Settings
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Catalog Name</Label>
                <Input className="h-7 text-xs mt-0.5" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label className="text-[10px]">Cover Title</Label>
                <Input className="h-7 text-xs mt-0.5" value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">Cover Subtitle</Label>
                <Input className="h-7 text-xs mt-0.5" value={coverSubtitle} onChange={(e) => setCoverSubtitle(e.target.value)} />
              </div>
              <div className="flex items-center gap-3 col-span-2">
                <div>
                  <Label className="text-[10px]">Gradient Start</Label>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input type="color" value={gradStart} onChange={(e) => setGradStart(e.target.value)} className="h-7 w-8 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
                    <Input className="h-7 text-[10px] w-20 font-mono" value={gradStart} onChange={(e) => setGradStart(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px]">Gradient End</Label>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input type="color" value={gradEnd} onChange={(e) => setGradEnd(e.target.value)} className="h-7 w-8 rounded border cursor-pointer" style={{ borderColor: "hsl(var(--border))" }} />
                    <Input className="h-7 text-[10px] w-20 font-mono" value={gradEnd} onChange={(e) => setGradEnd(e.target.value)} />
                  </div>
                </div>
                <div className="flex-1 rounded-md h-7 ml-2" style={{ background: `linear-gradient(90deg, ${gradStart}, ${gradEnd})` }} />
              </div>
            </div>
          </div>

          {/* Section Builder */}
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" /> Sections ({sections.length})
            </h3>
            {sections.length === 0 ? (
              <div className="border border-dashed rounded-lg py-8 text-center text-xs text-muted-foreground" style={{ borderColor: "hsl(var(--border))" }}>
                Click sections from the palette on the left to add them here.
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map((s, i) => (
                  <SectionRow
                    key={s.id ?? i}
                    section={s}
                    index={i}
                    total={sections.length}
                    versions={versions}
                    articles={articles}
                    onUpdate={handleUpdateSection}
                    onRemove={handleRemoveSection}
                    onMoveUp={() => handleMove(i, -1)}
                    onMoveDown={() => handleMove(i, 1)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <EditorLivePreview
          template={liveTemplate}
          sections={sections}
          versions={versions}
          articles={articles}
          settings={settings}
        />
      </div>
    </div>
  );
};

/* ═══════════════════ Main Page ═══════════════════ */
const CatalogPublisherPage = () => {
  const [tab, setTab] = useState("catalogs");
  const [editingTemplate, setEditingTemplate] = useState<CatalogTemplate | null>(null);

  const handleEdit = (t: CatalogTemplate) => {
    setEditingTemplate(t);
    setTab("editor");
  };

  return (
    <div className="p-4 flex flex-col h-full overflow-hidden">
      <h1 className="text-lg font-semibold mb-3" style={{ color: "hsl(215 30% 15%)" }}>📖 Catalog Publisher</h1>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="h-8 p-0.5 gap-0.5 shrink-0" style={{ background: "hsl(215 10% 93%)", borderRadius: "4px" }}>
          <TabsTrigger value="catalogs" className="text-xs h-7 px-3 data-[state=active]:shadow-none flex items-center gap-1.5" style={{ borderRadius: "3px" }}>
            <BookOpen className="h-3.5 w-3.5" /> Catalogs
          </TabsTrigger>
          <TabsTrigger value="editor" className="text-xs h-7 px-3 data-[state=active]:shadow-none flex items-center gap-1.5" style={{ borderRadius: "3px" }}>
            <Pencil className="h-3.5 w-3.5" /> Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogs" className="mt-3 flex-1 flex min-h-0">
          <CatalogsTab onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="editor" className="mt-3 flex-1 flex flex-col min-h-0 overflow-hidden">
          <EditorTab template={editingTemplate} onExit={() => setTab("catalogs")} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CatalogPublisherPage;
