import { useState, useMemo } from "react";
import { useCatalogTemplates, useCatalogAssignments, useCustomersList, type CatalogTemplate } from "@/hooks/useCatalogTemplates";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Copy, Pencil, BookOpen, Users, FileDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/* ────────────────── Assignment counts (bulk) ────────────────── */
const useAssignmentCounts = () => {
  return useQuery({
    queryKey: ["catalog-assignment-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_assignments")
        .select("catalog_template_id");
      if (error) throw error;
      const counts: Record<number, number> = {};
      (data ?? []).forEach((r: any) => {
        counts[r.catalog_template_id] = (counts[r.catalog_template_id] || 0) + 1;
      });
      return counts;
    },
  });
};

/* ────────────────── Preview Pane ────────────────── */
const CatalogPreviewPane = ({ template, onClose }: { template: CatalogTemplate; onClose: () => void }) => {
  return (
    <div className="border-l flex flex-col h-full" style={{ borderColor: "hsl(215 25% 88%)", width: 420, minWidth: 420 }}>
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "hsl(215 25% 88%)" }}>
        <span className="text-xs font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Preview</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {/* Cover page mock */}
        <div
          className="rounded-lg p-8 text-white flex flex-col items-center justify-center text-center"
          style={{
            background: `linear-gradient(135deg, ${template.gradient_color_start || "#1e4db7"}, ${template.gradient_color_end || "#0f2a5e"})`,
            minHeight: 280,
          }}
        >
          <h2 className="text-xl font-bold mb-2">{template.cover_title || template.name}</h2>
          {template.cover_subtitle && (
            <p className="text-sm opacity-80">{template.cover_subtitle}</p>
          )}
        </div>

        {/* TOC placeholder */}
        <div className="mt-4 border rounded-lg p-4" style={{ borderColor: "hsl(215 25% 88%)" }}>
          <h3 className="text-xs font-semibold mb-3" style={{ color: "hsl(215 30% 15%)" }}>
            TABLE OF CONTENTS
          </h3>
          <div className="space-y-2">
            {["Cover Page", "RX Lens Pricing", "Stock Lens Pricing", "Add-Ons & Extras", "Terms & Conditions"].map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                <span>{s}</span>
                <span>{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sample content page */}
        <div className="mt-4 border rounded-lg p-4" style={{ borderColor: "hsl(215 25% 88%)" }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: "hsl(215 30% 15%)" }}>
            RX LENS PRICING
          </h3>
          <div className="space-y-1">
            {["Single Vision Clear", "Bifocal Clear", "Progressive Clear"].map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b" style={{ color: "hsl(215 15% 50%)", borderColor: "hsl(215 25% 92%)" }}>
                <span>{item}</span>
                <span className="font-mono">—</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ────────────────── Assign Dialog ────────────────── */
const AssignDialog = ({ template, open, onClose }: { template: CatalogTemplate | null; open: boolean; onClose: () => void }) => {
  const { data: customers = [] } = useCustomersList();
  const { data: assignments = [], setAssignments } = useCatalogAssignments(template?.id);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Sync when assignments load — using useEffect pattern
  useState(() => {
    // initial sync handled below
  });
  
  // Effect-like sync via key change
  const assignmentKey = assignments.map(a => a.customer_id).join(",");
  useMemo(() => {
    if (assignments.length > 0) {
      setSelected(new Set(assignments.map((a) => a.customer_id!).filter(Boolean)));
    }
  }, [assignmentKey]);

  const handleSave = async () => {
    if (!template) return;
    try {
      await setAssignments.mutateAsync({ templateId: template.id, customerIds: Array.from(selected) });
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
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Assign "{template?.name}" to Customers</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {customers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No customers found</p>
          ) : (
            customers.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5">
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                {c.name}
              </label>
            ))
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={setAssignments.isPending}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ────────────────── Catalogs Tab ────────────────── */
const CatalogsTab = ({ onEdit }: { onEdit: (t: CatalogTemplate) => void }) => {
  const { data: templates = [], isLoading, createMutation, deleteMutation, duplicateMutation } = useCatalogTemplates();
  const { data: counts = {} } = useAssignmentCounts();
  const { canEditFeature } = useRolePermissions();
  const canEdit = canEditFeature("catalog-publisher" as any);
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<CatalogTemplate | null>(null);
  const [assignTarget, setAssignTarget] = useState<CatalogTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogTemplate | null>(null);

  const filtered = useMemo(() => {
    if (!search) return templates;
    const s = search.toLowerCase();
    return templates.filter((t) => t.name.toLowerCase().includes(s));
  }, [templates, search]);

  const handleNew = async () => {
    try {
      const created = await createMutation.mutateAsync({ name: "Untitled Catalog" });
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

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 space-y-3 overflow-auto">
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
                <TableHead className="h-8">Name</TableHead>
                <TableHead className="h-8">Last Edited</TableHead>
                <TableHead className="h-8 text-center"># Customers</TableHead>
                <TableHead className="h-8">Status</TableHead>
                {canEdit && <TableHead className="h-8 w-36" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center text-xs py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-xs py-8 text-muted-foreground">No catalogs found. Click "New Catalog" to create one.</TableCell></TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow
                    key={t.id}
                    className={`cursor-pointer hover:bg-muted/50 text-xs ${preview?.id === t.id ? "bg-muted/30" : ""}`}
                    onClick={() => setPreview(t)}
                  >
                    <TableCell className="py-1.5 font-medium">{t.name}</TableCell>
                    <TableCell className="py-1.5">{fmtDate(t.updated_at)}</TableCell>
                    <TableCell className="py-1.5 text-center">
                      <Badge variant="outline" className="text-[10px]">{counts[t.id] || 0}</Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                        Draft
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="py-1.5">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => onEdit(t)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Assign to Customers" onClick={() => setAssignTarget(t)}>
                            <Users className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicate" onClick={() => handleDuplicate(t)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Download PDF" onClick={() => toast({ title: "PDF export coming soon" })}>
                            <FileDown className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Delete" onClick={() => setDeleteTarget(t)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
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
            <AlertDialogDescription>This will permanently delete "{deleteTarget?.name}" and its customer assignments.</AlertDialogDescription>
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

/* ────────────────── Editor Tab (placeholder for next prompt) ────────────────── */
const EditorTab = ({ template, onExit }: { template: CatalogTemplate | null; onExit: () => void }) => {
  const { updateMutation } = useCatalogTemplates();
  const { toast } = useToast();
  const [name, setName] = useState(template?.name ?? "");
  const [coverTitle, setCoverTitle] = useState(template?.cover_title ?? "");
  const [coverSubtitle, setCoverSubtitle] = useState(template?.cover_subtitle ?? "");

  const handleSave = async () => {
    if (!template) return;
    try {
      await updateMutation.mutateAsync({ id: template.id, name, cover_title: coverTitle, cover_subtitle: coverSubtitle });
      toast({ title: "Saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Select or create a catalog from the Catalogs tab to start editing.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
          Editing: {template.name}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onExit}>Exit to Catalogs</Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSave} disabled={updateMutation.isPending}>Save Template</Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => { handleSave(); toast({ title: "Published (placeholder)" }); }}>
            Save &amp; Publish
          </Button>
        </div>
      </div>

      {/* Basic editor fields */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="text-xs font-medium mb-1 block">Template Name</label>
          <Input className="h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Cover Title</label>
          <Input className="h-8 text-xs" value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium mb-1 block">Cover Subtitle</label>
          <Input className="h-8 text-xs" value={coverSubtitle} onChange={(e) => setCoverSubtitle(e.target.value)} />
        </div>
      </div>

      {/* Cover preview */}
      <div
        className="rounded-lg p-8 text-white flex flex-col items-center justify-center text-center max-w-2xl"
        style={{
          background: `linear-gradient(135deg, ${template.gradient_color_start || "#1e4db7"}, ${template.gradient_color_end || "#0f2a5e"})`,
          minHeight: 200,
        }}
      >
        <h2 className="text-lg font-bold mb-1">{coverTitle || name || "Untitled"}</h2>
        {coverSubtitle && <p className="text-sm opacity-80">{coverSubtitle}</p>}
      </div>

      <p className="text-xs text-muted-foreground italic">
        Full section builder (drag & drop pricelist sections, articles, cover customization) will be available in the next update.
      </p>
    </div>
  );
};

/* ────────────────── Main Page ────────────────── */
const CatalogPublisherPage = () => {
  const [tab, setTab] = useState("catalogs");
  const [editingTemplate, setEditingTemplate] = useState<CatalogTemplate | null>(null);

  const handleEdit = (t: CatalogTemplate) => {
    setEditingTemplate(t);
    setTab("editor");
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>📖 Catalog Publisher</h1>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-8 p-0.5 gap-0.5" style={{ background: "hsl(215 10% 93%)", borderRadius: "4px" }}>
          <TabsTrigger value="catalogs" className="text-xs h-7 px-3 data-[state=active]:shadow-none flex items-center gap-1.5" style={{ borderRadius: "3px" }}>
            <BookOpen className="h-3.5 w-3.5" /> Catalogs
          </TabsTrigger>
          <TabsTrigger value="editor" className="text-xs h-7 px-3 data-[state=active]:shadow-none flex items-center gap-1.5" style={{ borderRadius: "3px" }}>
            <Pencil className="h-3.5 w-3.5" /> Editor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogs" className="mt-3">
          <CatalogsTab onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="editor" className="mt-3">
          <EditorTab template={editingTemplate} onExit={() => setTab("catalogs")} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CatalogPublisherPage;
