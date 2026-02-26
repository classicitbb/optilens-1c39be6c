import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCatalogTemplates, useCatalogAssignments, useCustomersList, type CatalogTemplate } from "@/hooks/useCatalogTemplates";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Copy, Pencil, Users, FileDown, ArrowUpDown, ChevronUp, ChevronDown, BookOpen } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─── Types ─── */
type SortField = "name" | "updated_at" | "customers";
type SortDir = "asc" | "desc";

/* ─── Assignment counts ─── */
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

const fmt = (n: number | null) => n != null ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ═══════════════════ PDF Generator ═══════════════════ */
const generateCatalogPdf = async (template: CatalogTemplate, settings: any) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

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

  const { data: versions } = await supabase
    .from("pricelist_versions").select("id, name").order("id", { ascending: true }).limit(1);
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

    doc.addPage();
    doc.setTextColor(30, 77, 183);
    doc.setFontSize(18);
    doc.text("Table of Contents", 20, 30);
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    const sKeys = Object.keys(sections);
    sKeys.forEach((s, i) => { doc.text(`${i + 1}. ${s}`, 25, 48 + i * 8); });

    for (const sectionName of sKeys) {
      doc.addPage();
      doc.setFillColor(30, 77, 183);
      doc.rect(0, 0, pw, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(sectionName, 15, 10);
      autoTable(doc, {
        startY: 20,
        head: [["Description", "Price (BBD)"]],
        body: sections[sectionName].map((r) => [r.description, r.price != null ? `$${r.price.toFixed(2)}` : "—"]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 77, 183], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 1: { halign: "right", cellWidth: 30 } },
        margin: { left: 15, right: 15 },
      });
    }

    const { data: addons } = await supabase.from("addons").select("name, price").eq("is_active", true).order("sort_order");
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

  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i - 1} of ${pages - 1}`, pw / 2, ph - 8, { align: "center" });
    if (settings?.company_name) doc.text(settings.company_name, 15, ph - 8);
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

  const assignmentKey = useMemo(
    () => JSON.stringify(assignments.map((a) => a.customer_id).filter(Boolean).sort()),
    [assignments]
  );

  useEffect(() => {
    const ids = JSON.parse(assignmentKey) as number[];
    setSelected(new Set(ids));
  }, [assignmentKey]);

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

/* ═══════════════════ Main List Page ═══════════════════ */
const CatalogPublisherPage = () => {
  const { data: templates = [], isLoading, createMutation, deleteMutation, duplicateMutation } = useCatalogTemplates();
  const { data: counts = {} } = useAssignmentCounts();
  const { data: settings } = useCompanySettings();
  const { canEditFeature } = useRolePermissions();
  const canEdit = canEditFeature("catalog-publisher");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
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
      toast({ title: "Catalog created" });
      navigate(`/admin/pricing/publisher/${created.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Deleted" });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <AdminPageHeader icon={BookOpen} title="Catalog Publisher" />
        {canEdit && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }}
            onClick={handleNew}
            disabled={createMutation.isPending}
          >
            <Plus className="h-3.5 w-3.5" /> New Catalog
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "hsl(215 15% 55%)" }} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search catalogs…"
            className="h-7 text-xs pl-7"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded" style={{ borderColor: "hsl(215 15% 85%)" }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs h-8 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                <span className="flex items-center gap-1">Name <SortIcon field="name" /></span>
              </TableHead>
              <TableHead className="text-xs h-8 cursor-pointer select-none" onClick={() => toggleSort("updated_at")}>
                <span className="flex items-center gap-1">Last Edited <SortIcon field="updated_at" /></span>
              </TableHead>
              <TableHead className="text-xs h-8 text-center cursor-pointer select-none" onClick={() => toggleSort("customers")}>
                <span className="flex items-center gap-1 justify-center"># Customers <SortIcon field="customers" /></span>
              </TableHead>
              <TableHead className="text-xs h-8">Status</TableHead>
              {canEdit && <TableHead className="text-xs h-8 w-40">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs py-8" style={{ color: "hsl(215 15% 55%)" }}>
                  No catalogs found. Click "New Catalog" to create one.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => {
                const custCount = counts[t.id] ?? 0;
                return (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/pricing/publisher/${t.id}`)}
                  >
                    <TableCell className="text-xs font-medium py-1.5">{t.name}</TableCell>
                    <TableCell className="text-xs py-1.5" style={{ color: "hsl(215 15% 55%)" }}>{fmtDate(t.updated_at)}</TableCell>
                    <TableCell className="text-xs py-1.5 text-center">
                      <Badge variant="outline" className={`text-[10px] h-5 ${custCount > 0 ? "bg-primary/10 text-primary border-primary/30" : ""}`}>
                        {custCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs py-1.5">
                      <Badge variant="outline" className="text-[10px] h-5 bg-green-500/10 text-green-600 border-green-500/30">
                        Draft
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-xs py-1.5">
                        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => navigate(`/admin/pricing/publisher/${t.id}`)}>
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

export default CatalogPublisherPage;
