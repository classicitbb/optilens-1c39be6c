import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { useCatalogTemplates, useCatalogAssignments, useCustomersList, type CatalogTemplate } from "@/hooks/useCatalogTemplates";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import NewCatalogDialog from "@/components/admin/NewCatalogDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Copy, Users, FileDown, BookOpen } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generateCatalogPdf } from "@/features/admin/catalog-editor-v2/utils/generateCatalogPdf";

/* ─── Types ─── */
type SortField = "updated_at" | "name" | "customers" | "sections";

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

const useSectionCounts = () => {
  return useQuery({
    queryKey: ["catalog-section-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_sections").select("catalog_template_id");
      if (error) throw error;
      const counts: Record<number, number> = {};
      (data ?? []).forEach((row: any) => {
        counts[row.catalog_template_id] = (counts[row.catalog_template_id] || 0) + 1;
      });
      return counts;
    },
  });
};

const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const getCatalogSubtitle = (rawSubtitle: string | null | undefined) => {
  if (!rawSubtitle) return "";
  try {
    const parsed = JSON.parse(rawSubtitle) as { subtitle?: string };
    return typeof parsed?.subtitle === "string" ? parsed.subtitle : "";
  } catch {
    return rawSubtitle;
  }
};

const getStatusBadgeClasses = (status: string | null | undefined) => {
  const normalized = (status ?? "draft").toLowerCase();
  if (normalized === "published") return "bg-green-500/10 text-green-700 border-green-500/20";
  if (normalized === "canvas_ready") return "bg-blue-500/10 text-blue-700 border-blue-500/20";
  return "bg-amber-500/10 text-amber-700 border-amber-500/20";
};

const getStatusLabel = (status: string | null | undefined) => {
  const normalized = (status ?? "draft").toLowerCase();
  if (normalized === "published") return "Published";
  if (normalized === "canvas_ready") return "In Canvas";
  return "Draft";
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
  const { data: templates = [], isLoading, deleteMutation, duplicateMutation } = useCatalogTemplates();
  const { data: counts = {} } = useAssignmentCounts();
  const { data: sectionCounts = {} } = useSectionCounts();
  const { data: settings } = useCompanySettings();
  const { canEditFeature } = useRolePermissions();
  const canEdit = canEditFeature("catalog-publisher");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [assignTarget, setAssignTarget] = useState<CatalogTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogTemplate | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = templates;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(s) || (t.cover_title ?? "").toLowerCase().includes(s));
    }
    return [...list].sort((a, b) => {
      if (sortField === "name") return a.name.localeCompare(b.name);
      if (sortField === "customers") return (counts[b.id] ?? 0) - (counts[a.id] ?? 0);
      if (sortField === "sections") return (sectionCounts[b.id] ?? 0) - (sectionCounts[a.id] ?? 0);
      return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
    });
  }, [templates, search, sortField, counts, sectionCounts]);

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
        <AdminPageHeader icon={BookOpen} title="Lens and Supply Catalogs" />
        {canEdit && (
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }}
            onClick={() => setNewDialogOpen(true)}
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
        <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
          {[
            { key: "updated_at" as const, label: "Recent" },
            { key: "name" as const, label: "Name" },
            { key: "customers" as const, label: "Customers" },
            { key: "sections" as const, label: "Sections" },
          ].map((option) => (
            <Button
              key={option.key}
              type="button"
              variant={sortField === option.key ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortField(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">No catalogs found. Click "New catalog" to create one.</p>
          </div>
        ) : (
          filtered.map((template) => {
            const customerCount = counts[template.id] ?? 0;
            const sectionCount = sectionCounts[template.id] ?? 0;
            const subtitle = getCatalogSubtitle(template.cover_subtitle);
            const statusLabel = getStatusLabel(template.status);
            const coverTitle = template.cover_title || template.name;
            const gradientStart = template.gradient_color_start || "#2c4f7e";
            const gradientEnd = template.gradient_color_end || "#173b73";

            return (
              <div
                key={template.id}
                className="overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => navigate(`/admin/pricing/publisher/${template.id}`)}
                >
                  <div
                    className="flex h-32 flex-col justify-end px-5 py-4"
                    style={{ background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }}
                  >
                    <div className="text-base font-semibold text-white">{coverTitle}</div>
                    <div className="mt-1 text-xs text-white/75">{subtitle || fmtDate(template.updated_at)}</div>
                  </div>
                </button>

                <div className="flex flex-col gap-3 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">{template.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Last edited {fmtDate(template.updated_at)}</div>
                    </div>
                    <Badge variant="outline" className={`h-5 text-[10px] ${getStatusBadgeClasses(template.status)}`}>
                      {statusLabel}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{sectionCount} section{sectionCount === 1 ? "" : "s"}</span>
                    <span>&middot;</span>
                    <span>{customerCount} customer{customerCount === 1 ? "" : "s"}</span>
                  </div>

                  {canEdit && (
                    <div className="flex gap-2 border-t pt-3">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleDuplicate(template)}>
                        <Copy className="mr-1 h-3 w-3" /> Duplicate
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAssignTarget(template)}>
                        <Users className="mr-1 h-3 w-3" /> Assign
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleDownloadPdf(template)}>
                        <FileDown className="mr-1 h-3 w-3" /> PDF
                      </Button>
                      <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(template)}>
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AssignDialog template={assignTarget} open={!!assignTarget} onClose={() => setAssignTarget(null)} />
      <NewCatalogDialog
        open={newDialogOpen}
        onOpenChange={setNewDialogOpen}
        defaultCoverTitle={settings?.company_name ?? "Product Catalog"}
        defaultCoverSubtitle={settings?.slogan ?? ""}
      />

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
