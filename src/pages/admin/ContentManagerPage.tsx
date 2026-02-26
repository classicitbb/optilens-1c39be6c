import { useState, useMemo, lazy, Suspense } from "react";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import {
  useContentArticles,
  ContentArticle,
  ContentType,
  ContentVisibility,
  VISIBILITY_OPTIONS,
  CONTENT_TYPE_OPTIONS,
} from "@/hooks/useContentArticles";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const RichTextEditor = lazy(() => import("@/components/admin/RichTextEditor"));
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Save, X, Search, Eye, EyeOff,
  BookOpen, HelpCircle, FileText, Scale, Globe,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

const TAB_CONFIG: { value: ContentType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "knowledge", label: "Knowledge Base", icon: BookOpen, description: "Public-facing articles for the website knowledge base" },
  { value: "faq", label: "FAQ", icon: HelpCircle, description: "Frequently asked questions shown on the knowledge base page" },
  { value: "legal", label: "Legal Pages", icon: Scale, description: "Privacy policy, terms & conditions, copyright text, and other legal content" },
  { value: "wiki", label: "Internal Wiki", icon: FileText, description: "Internal help articles for admin panel contextual help" },
];

const LEGAL_SLUGS = [
  { value: "copyright", label: "Copyright / Footer Text" },
  { value: "privacy-policy", label: "Privacy Policy" },
  { value: "terms-conditions", label: "Terms & Conditions" },
  { value: "return-policy", label: "Return Policy" },
  { value: "disclaimer", label: "Disclaimer" },
  { value: "cookie-policy", label: "Cookie Policy" },
];

const KB_CATEGORIES = [
  "Lens Materials",
  "Lens Designs",
  "Lens Coatings",
  "Specialty Lenses",
  "Ordering & Delivery",
  "Pricing & Payments",
  "General",
];

const ContentManagerPage = () => {
  const { canEdit, isAdmin } = useAdminRole();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ContentType>("knowledge");
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<Partial<ContentArticle> | null>(null);

  const { articles, upsertArticle, deleteArticle, isSaving } = useContentArticles(activeTab);

  const filtered = useMemo(() => {
    if (!searchTerm) return articles;
    const lower = searchTerm.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        a.description.toLowerCase().includes(lower) ||
        a.category.toLowerCase().includes(lower)
    );
  }, [articles, searchTerm]);

  const grouped = useMemo(() => {
    const map = new Map<string, ContentArticle[]>();
    for (const a of filtered) {
      const key = a.category || "Uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [filtered]);

  const handleNew = () => {
    setEditing({
      title: "",
      content: "",
      description: "",
      page_slug: activeTab === "legal" ? "copyright" : activeTab === "wiki" ? "all" : "knowledge",
      category: activeTab === "knowledge" ? "General" : activeTab === "faq" ? "FAQ" : "",
      content_type: activeTab,
      visibility: activeTab === "wiki" ? "internal" : "public",
      sort_order: 0,
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!editing || !editing.title?.trim()) return;
    try {
      await upsertArticle({
        id: editing.id,
        title: editing.title,
        content: editing.content || "",
        description: editing.description || "",
        page_slug: editing.page_slug || "all",
        category: editing.category || "",
        content_type: editing.content_type || activeTab,
        visibility: editing.visibility || "internal",
        sort_order: editing.sort_order ?? 0,
        is_active: editing.is_active ?? true,
      });
      toast({ title: editing.id ? "Article updated" : "Article created" });
      setEditing(null);
    } catch {
      toast({ title: "Error saving article", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article permanently?")) return;
    try {
      await deleteArticle(id);
      toast({ title: "Article deleted" });
    } catch {
      toast({ title: "Error deleting", variant: "destructive" });
    }
  };

  const handleToggleActive = async (article: ContentArticle) => {
    try {
      await upsertArticle({
        ...article,
        is_active: !article.is_active,
      });
      toast({ title: article.is_active ? "Unpublished" : "Published" });
    } catch {
      toast({ title: "Error toggling", variant: "destructive" });
    }
  };

  const visibilityBadge = (v: ContentVisibility) => {
    const opt = VISIBILITY_OPTIONS.find((o) => o.value === v);
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${opt?.color || "bg-muted-foreground"}`} />
        {opt?.label || v}
      </Badge>
    );
  };

  // Editor form
  if (editing) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-foreground">
            {editing.id ? "Edit Article" : "New Article"}
          </h1>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(null)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        <ScrollArea className="flex-1 bg-background">
          <div className="max-w-3xl mx-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Title *</label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Category</label>
                {activeTab === "knowledge" ? (
                  <Select
                    value={editing.category || "General"}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KB_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editing.category || ""}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    className="h-8 text-xs"
                    placeholder={activeTab === "faq" ? "FAQ" : "Category group"}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Description / Summary</label>
              <Input
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="h-8 text-xs"
                placeholder="Short description shown in lists and previews"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Visibility</label>
                <Select
                  value={editing.visibility || "internal"}
                  onValueChange={(v) => setEditing({ ...editing, visibility: v as ContentVisibility })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISIBILITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {activeTab === "legal" ? (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Legal Page Type</label>
                  <Select
                    value={editing.page_slug || "copyright"}
                    onValueChange={(v) => setEditing({ ...editing, page_slug: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGAL_SLUGS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Content Type</label>
                  <Select
                    value={editing.content_type || activeTab}
                    onValueChange={(v) => setEditing({ ...editing, content_type: v as ContentType })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Sort Order</label>
                <Input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })}
                  className="h-8 text-xs w-20"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={editing.is_active ?? true}
                onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
              />
              <span className="text-xs text-foreground">
                {editing.is_active ? "Published (active)" : "Unpublished (inactive)"}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                Content
              </label>
              <Suspense fallback={<div className="h-[300px] border border-border rounded-lg animate-pulse bg-muted/20" />}>
                <RichTextEditor
                  content={editing.content || ""}
                  onChange={(html) => setEditing({ ...editing, content: html })}
                  placeholder="Write a description..."
                  minHeight="300px"
                />
              </Suspense>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={isSaving}>
                <Save className="h-3.5 w-3.5" /> {isSaving ? "Saving…" : "Save Article"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // List view
  const tabConfig = TAB_CONFIG.find((t) => t.value === activeTab)!;
  const TabIcon = tabConfig.icon;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <AdminPageHeader icon={Globe} title="Website Content" />
          {canEdit && (
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleNew}>
              <Plus className="h-3 w-3" /> New {tabConfig.label.replace(/s$/, "")}
            </Button>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ContentType); setSearchTerm(""); }}>
          <TabsList className="h-8">
            {TAB_CONFIG.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-xs gap-1.5">
                <t.icon className="h-3 w-3" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-7 text-xs"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          <TabIcon className="inline h-3 w-3 mr-1" />
          {tabConfig.description}
        </p>
      </div>

      <ScrollArea className="flex-1 bg-background">
        <div className="p-4 space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <TabIcon className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No {tabConfig.label.toLowerCase()} articles yet.</p>
              {canEdit && (
                <Button size="sm" className="mt-3 gap-1.5" onClick={handleNew}>
                  <Plus className="h-3 w-3" /> Create First Article
                </Button>
              )}
            </div>
          )}

          {Array.from(grouped.entries()).map(([category, categoryArticles]) => (
            <div key={category}>
              <h3 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 px-1">
                {category} <span className="text-muted-foreground/60">({categoryArticles.length})</span>
              </h3>
              <div className="space-y-1.5">
                {categoryArticles.map((a) => (
                  <div
                    key={a.id}
                    className="border border-border rounded-lg px-3 py-2.5 flex items-center gap-3 hover:bg-muted/40 transition-colors"
                  >
                    <button
                      onClick={() => canEdit && handleToggleActive(a)}
                      className="shrink-0"
                      title={a.is_active ? "Click to unpublish" : "Click to publish"}
                      disabled={!canEdit}
                    >
                      {a.is_active ? (
                        <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-[13px] font-medium truncate ${a.is_active ? "text-foreground" : "text-muted-foreground line-through"}`}>
                          {a.title}
                        </p>
                        {visibilityBadge(a.visibility as ContentVisibility)}
                        {!a.is_active && <Badge variant="secondary" className="text-[9px]">Draft</Badge>}
                      </div>
                      {a.description && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{a.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing({ ...a })}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ContentManagerPage;
