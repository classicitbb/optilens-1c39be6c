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

/* ─── Help Articles for Knowledge section ─── */
const useHelpArticlesForCatalog = () => {
  return useQuery({
    queryKey: ["help-articles-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("id, title, category, visibility")
        .eq("is_active", true)
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
  articles: { id: string; title: string; category: string }[];
  settings: any;
}) => {
  const includedSections = sections.filter((s) => s.is_included !== false);

  return (
    <div className="border-l flex flex-col h-full" style={{ borderColor: "hsl(var(--border))", width: 380, minWidth: 380 }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30" style={{ borderColor: "hsl(var(--border))" }}>
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Live Preview</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2.5">
          {/* Cover */}
          <div
            className="rounded-lg p-5 text-white flex flex-col items-center justify-center text-center"
            style={{
              background: `linear-gradient(135deg, ${template.gradient_color_start || "#1e4db7"}, ${template.gradient_color_end || "#0f2a5e"})`,
              minHeight: 180,
            }}
          >
            {settings?.logo_url && <img src={settings.logo_url} alt="Logo" className="h-8 mb-2 object-contain" />}
            <h2 className="text-base font-bold mb-0.5">{template.cover_title || template.name}</h2>
            {template.cover_subtitle && <p className="text-[10px] opacity-80">{template.cover_subtitle}</p>}
            {settings?.company_name && <p className="text-[9px] mt-2 opacity-50">{settings.company_name} · {settings?.tel}</p>}
          </div>

          {/* TOC */}
          {includedSections.length > 0 && (
            <div className="border rounded-lg p-2.5" style={{ borderColor: "hsl(var(--border))" }}>
              <h3 className="text-[10px] font-bold mb-1.5 uppercase tracking-wider text-primary">Table of Contents</h3>
              {includedSections.map((s, i) => {
                const vName = s.pricelist_version_id ? versions.find((v) => v.id === s.pricelist_version_id)?.name : null;
                const artTitle = s.article_id ? articles.find((a) => String(a.id) === String(s.article_id))?.title : null;
                const label = s.section_type === "knowledge_article" ? (artTitle || "Article") : getSectionLabel(s.section_type);
                return (
                  <div key={s.id ?? i} className="flex items-center justify-between text-[10px] py-0.5 text-muted-foreground">
                    <span className="truncate mr-2">{label}{vName ? ` (${vName})` : ""}</span>
                    <span className="text-[9px] tabular-nums">{i + 2}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Section previews */}
          {includedSections.map((s, i) => {
            const label = s.section_type === "knowledge_article"
              ? articles.find((a) => String(a.id) === String(s.article_id))?.title || "Knowledge Article"
              : getSectionLabel(s.section_type);
            const isPricing = ["rx_prices", "stock_prices", "supplies_prices"].includes(s.section_type);
            return (
              <div key={s.id ?? i} className="border rounded-lg p-2.5" style={{ borderColor: "hsl(var(--border))" }}>
                <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-primary/30">
                  <span className="text-[10px]">{getSectionIcon(s.section_type)}</span>
                  <h3 className="text-[10px] font-bold uppercase tracking-wide text-foreground">{label}</h3>
                  {s.format_choice && <Badge variant="outline" className="text-[8px] h-3.5 px-1">{s.format_choice}</Badge>}
                </div>
                {isPricing ? (
                  <div className="space-y-0.5">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex justify-between text-[9px] text-muted-foreground py-0.5 border-b last:border-0" style={{ borderColor: "hsl(var(--border))" }}>
                        <span className="bg-muted/50 rounded h-2.5 w-32" />
                        <span className="bg-muted/50 rounded h-2.5 w-12" />
                      </div>
                    ))}
                    <p className="text-[8px] text-muted-foreground text-center pt-0.5">Pricing data from pricelist</p>
                  </div>
                ) : (
                  <p className="text-[9px] text-muted-foreground italic">Content section</p>
                )}
              </div>
            );
          })}

          {includedSections.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-6">Add sections from the palette to see preview</p>
          )}
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
  articles: { id: string; title: string; category: string }[];
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
        <div className="mt-2 pl-14">
          <Select
            value={section.article_id ? String(section.article_id) : ""}
            onValueChange={(v) => section.id && onUpdate(section.id, { article_id: Number(v) })}
          >
            <SelectTrigger className="h-7 text-[11px] w-72">
              <SelectValue placeholder="Select article…" />
            </SelectTrigger>
            <SelectContent>
              {articles.map((a) => (
                <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                  <span className="text-muted-foreground mr-1">[{a.category}]</span> {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
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
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onExit}>Exit to Catalogs</Button>
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
