import { useState, useMemo, lazy, Suspense, useEffect } from "react";
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
const BlogPostsManager = lazy(() => import("@/components/admin/BlogPostsManager"));
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus, Pencil, Trash2, Save, X, Search, Eye, EyeOff,
  BookOpen, HelpCircle, FileText, Scale, Globe, LayoutList,
  Newspaper,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { ADMIN_CONTEXT_OPTIONS } from "@/lib/adminContexts";
import { useSearchParams } from "react-router";

type ContentManagerTab = ContentType | "all" | "blog";

const TAB_CONFIG: { value: ContentManagerTab; label: string; icon: React.ElementType; description: string }[] = [
  { value: "all", label: "All Articles", icon: LayoutList, description: "All content articles across every type" },
  { value: "knowledge", label: "Knowledge Base", icon: BookOpen, description: "Public-facing articles for the website knowledge base" },
  { value: "blog", label: "Blog Posts", icon: Newspaper, description: "Editorial blog posts and newsletters for /blog and Knowledge Base discovery" },
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ContentManagerTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editing, setEditing] = useState<Partial<ContentArticle> | null>(null);
  const requestedTab = searchParams.get("tab") as ContentManagerTab | null;
  const requestedArticleId = searchParams.get("articleId");

  const contentTypeFilter = activeTab === "all" || activeTab === "blog" ? undefined : activeTab;
  const { articles, upsertArticle, deleteArticle, isSaving } = useContentArticles(contentTypeFilter);

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
    const effectiveType = (activeTab === "all" || activeTab === "blog") ? "wiki" : activeTab;
    setEditing({
      title: "",
      content: "",
      description: "",
      page_slug: effectiveType === "legal" ? "copyright" : effectiveType === "wiki" ? "all" : "knowledge",
      category: effectiveType === "knowledge" ? "General" : effectiveType === "faq" ? "FAQ" : "",
      content_type: effectiveType,
      visibility: effectiveType === "wiki" ? "internal" : "public",
      sort_order: 0,
      is_active: true,
      context_slugs: [],
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
        content_type: editing.content_type || "wiki",
        visibility: editing.visibility || "internal",
        sort_order: editing.sort_order ?? 0,
        is_active: editing.is_active ?? true,
        context_slugs: editing.context_slugs ?? [],
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

  const editingContextSlugs = editing?.context_slugs ?? [];

  useEffect(() => {
    if (!requestedTab) return;
    if (TAB_CONFIG.some((tab) => tab.value === requestedTab) && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, requestedTab]);

  useEffect(() => {
    if (!requestedArticleId || editing || activeTab === "blog") return;
    const match = articles.find((article) => article.id === requestedArticleId);
    if (!match) return;
    setEditing({ ...match });
    const next = new URLSearchParams(searchParams);
    next.delete("articleId");
    setSearchParams(next, { replace: true });
  }, [activeTab, articles, editing, requestedArticleId, searchParams, setSearchParams]);

  if (activeTab === "blog" && !editing) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <AdminPageHeader icon={Globe} title="Content CMS" />
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentManagerTab)}>
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
        </div>
        <Suspense fallback={<div className="flex-1 animate-pulse bg-muted/20" />}>
          <BlogPostsManager canEdit={canEdit} isAdmin={isAdmin} />
        </Suspense>
      </div>
    );
  }

  // Editor form
  if (editing) {
    const editContentType = editing.content_type || "wiki";
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
                {editContentType === "knowledge" ? (
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
                    placeholder="Category group"
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
              {editContentType === "legal" ? (
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
                    value={editContentType}
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

            {/* Help Assignment / Context Slugs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground block">Help Assignments (context pages)</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 text-[10px]">
                      Assign to pages
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 max-h-80 overflow-y-auto p-3" align="end">
                    <div className="space-y-1">
                      {ADMIN_CONTEXT_OPTIONS.map((option) => {
                        const checked = editingContextSlugs.includes(option.value);
                        return (
                          <label
                            key={option.value}
                            className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40 cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(nextChecked) => {
                                const current = editingContextSlugs;
                                const updated = nextChecked
                                  ? [...new Set([...current, option.value])]
                                  : current.filter((v) => v !== option.value);
                                setEditing({ ...editing, context_slugs: updated });
                              }}
                            />
                            <div>
                              <p className="text-xs font-medium text-foreground">{option.label}</p>
                              <p className="text-[10px] text-muted-foreground">{option.path}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap gap-1">
                {editingContextSlugs.length > 0 ? (
                  editingContextSlugs.map((slug) => {
                    const opt = ADMIN_CONTEXT_OPTIONS.find((o) => o.value === slug);
                    return (
                      <Badge key={slug} variant="secondary" className="text-[10px]">
                        {opt?.label ?? slug}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-[10px] text-muted-foreground">No help assignments</span>
                )}
              </div>
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
          <AdminPageHeader icon={Globe} title="Content CMS" />
          {canEdit && (
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={handleNew}>
              <Plus className="h-3 w-3" /> New Article
            </Button>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ContentManagerTab); setSearchTerm(""); }}>
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
                        {activeTab === "all" && (
                          <Badge variant="outline" className="text-[9px]">
                            {CONTENT_TYPE_OPTIONS.find((o) => o.value === a.content_type)?.label ?? a.content_type}
                          </Badge>
                        )}
                        {!a.is_active && <Badge variant="secondary" className="text-[9px]">Draft</Badge>}
                        {a.context_slugs.length > 0 && a.context_slugs[0] !== "all" && (
                          <Badge variant="secondary" className="text-[9px]">
                            {a.context_slugs.length} assignment{a.context_slugs.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
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
