import { useState, lazy, Suspense } from "react";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useHelpArticles, HelpArticle } from "@/hooks/useHelpArticles";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
const RichTextEditor = lazy(() => import("@/components/admin/RichTextEditor"));
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SLUGS = [
  { value: "all", label: "All Pages" },
  { value: "catalog", label: "Product Catalog" },
  { value: "reference", label: "Reference Data" },
  { value: "imports", label: "Imports" },
  { value: "rx-lens-prices", label: "RX Lens Prices" },
  { value: "stock-lens-prices", label: "Stock Lens Prices" },
  { value: "supplies-prices", label: "Supplies Prices" },
  { value: "quotations", label: "Quotations" },
  { value: "costings/shipments", label: "Import Costings" },
  { value: "users", label: "Users" },
  { value: "parameters", label: "Settings" },
  { value: "wiki", label: "Wiki" },
];

const HelpArticleEditor = () => {
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const { upsertArticle, deleteArticle, refetchAll, allArticles } = useHelpArticles();
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Partial<HelpArticle> | null>(null);

  const handleLoad = async () => {
    await refetchAll();
    setLoaded(true);
  };

  const handleNew = () => {
    setEditing({ title: "", content: "", page_slug: "all", sort_order: 0 });
  };

  const handleEdit = (article: HelpArticle) => {
    setEditing({ ...article });
  };

  const handleSave = async () => {
    if (!editing || !editing.title?.trim() || !editing.page_slug) return;
    try {
      await upsertArticle({
        id: editing.id,
        title: editing.title,
        content: editing.content || "",
        page_slug: editing.page_slug,
        sort_order: editing.sort_order ?? 0,
      });
      toast({ title: editing.id ? "Article updated" : "Article created" });
      setEditing(null);
      await refetchAll();
    } catch {
      toast({ title: "Error saving article", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this help article?")) return;
    try {
      await deleteArticle(id);
      toast({ title: "Article deleted" });
      await refetchAll();
    } catch {
      toast({ title: "Error deleting article", variant: "destructive" });
    }
  };

  if (!canEdit) return null;

  if (!loaded) {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground">Manage contextual help articles that appear in the Help panel across admin pages.</p>
        <Button size="sm" onClick={handleLoad}>Load Help Articles</Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{editing.id ? "Edit Article" : "New Article"}</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(null)}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Title</label>
            <Input
              value={editing.title || ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Page</label>
            <Select value={editing.page_slug || "all"} onValueChange={(v) => setEditing({ ...editing, page_slug: v })}>
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SLUGS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Sort Order</label>
            <Input
              type="number"
              value={editing.sort_order ?? 0}
              onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
              className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-200 w-20"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
              Content
            </label>
            <Suspense fallback={<div className="h-[200px] border border-border rounded-lg animate-pulse bg-muted/20" />}>
              <RichTextEditor
                content={editing.content || ""}
                onChange={(html) => setEditing({ ...editing, content: html })}
                placeholder="Write a description..."
                minHeight="200px"
              />
            </Suspense>
          </div>
        </div>

        <Button size="sm" className="gap-1.5" onClick={handleSave}>
          <Save className="h-3.5 w-3.5" /> Save Article
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Help Articles</h3>
          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleNew}>
            <Plus className="h-3 w-3" /> New Article
          </Button>
        </div>

        {allArticles.length === 0 && (
          <p className="text-xs text-slate-500">No help articles yet.</p>
        )}

        {allArticles.map((a) => (
          <div
            key={a.id}
            className="border border-slate-700/60 rounded-lg p-3 flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-200 truncate">{a.title}</p>
              <p className="text-[11px] text-slate-500">
                Page: {PAGE_SLUGS.find((s) => s.value === a.page_slug)?.label || a.page_slug} · Order: {a.sort_order}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(a)}>
                <Pencil className="h-3 w-3 text-slate-400" />
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="h-3 w-3 text-red-400" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default HelpArticleEditor;
