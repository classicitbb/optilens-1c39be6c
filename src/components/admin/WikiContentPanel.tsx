import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, Eye, FilePenLine, Save, Upload, Undo2, XCircle, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WikiCategory } from "@/data/wikiContent";
import HelpFeedbackButtons from "./HelpFeedbackButtons";
import RichTextEditor from "./RichTextEditor";
import WikiArticleRenderer from "./WikiArticleRenderer";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import { useToast } from "@/hooks/use-toast";
import type { BlogCanonicalContent } from "@/components/blog/BlogPostRenderer";
import { toCanonicalDocument, validateCanonicalDocument } from "@/lib/wikiCanonical";
import { Badge } from "@/components/ui/badge";

interface WikiContentPanelProps {
  categories: WikiCategory[];
  activeArticleId: string | null;
  editingArticleId?: string | null;
  canEdit?: boolean;
  onEditArticle?: (article: { id: string; title: string; content: string }) => void;
  onEditingChange?: (articleId: string | null) => void;
  isCategoryVisible?: (categoryId: string) => boolean;
  wikiHeadings: { id: string; title: string }[];
}

const WikiContentPanel = ({ categories, activeArticleId, editingArticleId, canEdit, onEditArticle, onEditingChange, isCategoryVisible, wikiHeadings }: WikiContentPanelProps) => {
  const displayCategories = categories.filter((category) => category.articles.length > 0 && (isCategoryVisible ? isCategoryVisible(category.id) : true));
  const [isPreview, setIsPreview] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: wikiHeadings[0]?.id ?? "", status: "draft" as "draft" | "published" | "archived", note: "" });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const { toast } = useToast();
  const { upsertArticle, fetchVersions, restoreVersion, canPublish } = useHelpArticles();

  let activeCategory: WikiCategory | undefined;
  let activeArticle: { id: string; title: string; content: string; body_json?: BlogCanonicalContent; status?: "draft" | "published" | "archived"; version_number?: number } | undefined;

  for (const cat of displayCategories) {
    const found = cat.articles.find((a: any) => a.id === activeArticleId);
    if (found) {
      activeCategory = cat;
      activeArticle = found as any;
      break;
    }
  }

  const isEditing = Boolean(editingArticleId) && (editingArticleId === activeArticleId || editingArticleId === "new");

  useEffect(() => {
    if (isEditing) {
      setForm({
        title: activeArticle?.title ?? "",
        content: activeArticle?.content ?? "",
        category: activeCategory?.id ?? wikiHeadings[0]?.id ?? "",
        status: (activeArticle as any)?.status ?? "draft",
        note: "",
      });
      setIsPreview(false);
    }
  }, [isEditing, activeArticleId, activeArticle?.title, activeArticle?.content, activeCategory?.id, wikiHeadings]);

  useEffect(() => {
    if (!isEditing) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        if (!form.title.trim()) {
          setSaveState("idle");
          return;
        }
        await upsertArticle({
          id: editingArticleId && editingArticleId !== "new" ? editingArticleId : undefined,
          title: form.title,
          content: form.content,
          category: form.category,
          page_slug: "knowledge/wiki",
          context_slugs: ["knowledge/wiki"],
          status: form.status,
          change_note: "Autosave",
          version_number: (activeArticle as any)?.version_number,
        } as any);
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 1400);
    return () => clearTimeout(t);
  }, [form.title, form.content, form.category, form.status, isEditing, editingArticleId, activeArticle]);

  const handleSaveDraft = async () => {
    await upsertArticle({
      id: editingArticleId && editingArticleId !== "new" ? editingArticleId : undefined,
      title: form.title,
      content: form.content,
      category: form.category,
      page_slug: "knowledge/wiki",
      context_slugs: ["knowledge/wiki"],
      status: "draft",
      change_note: form.note || "Saved draft",
      version_number: (activeArticle as any)?.version_number,
    } as any);
    toast({ title: "Draft saved" });
  };

  const handlePublish = async () => {
    const doc = toCanonicalDocument(form.content);
    const validation = validateCanonicalDocument(doc);
    if (!validation.valid) {
      toast({ title: "Cannot publish", description: validation.message, variant: "destructive" });
      return;
    }
    if (!canPublish) {
      toast({ title: "Publishing permission required", variant: "destructive" });
      return;
    }
    await upsertArticle({
      id: editingArticleId && editingArticleId !== "new" ? editingArticleId : undefined,
      title: form.title,
      content: form.content,
      category: form.category,
      page_slug: "knowledge/wiki",
      context_slugs: ["knowledge/wiki"],
      status: "published",
      change_note: form.note || "Published",
      version_number: (activeArticle as any)?.version_number,
    } as any);
    toast({ title: "Article published" });
    onEditingChange?.(null);
  };

  const handleUnpublish = async () => {
    if (!editingArticleId || editingArticleId === "new") return;
    await upsertArticle({
      id: editingArticleId,
      title: form.title,
      content: form.content,
      category: form.category,
      page_slug: "knowledge/wiki",
      context_slugs: ["knowledge/wiki"],
      status: "draft",
      change_note: "Unpublished",
      version_number: (activeArticle as any)?.version_number,
    } as any);
    toast({ title: "Article unpublished" });
  };

  const handleRollback = async () => {
    if (!editingArticleId || editingArticleId === "new") return;
    const versions = await fetchVersions(editingArticleId);
    const target = versions[1];
    if (!target) {
      toast({ title: "No previous version" });
      return;
    }
    await restoreVersion({ articleId: editingArticleId, version: target });
    toast({ title: `Rolled back to v${target.version_number}` });
  };

  if (!activeArticle && editingArticleId !== "new") {
    return <div className="flex-1 flex items-center justify-center bg-background"><p className="text-sm text-muted-foreground">Select an article from the sidebar.</p></div>;
  }

  return (
    <ScrollArea className="flex-1 bg-background">
      <div className="max-w-3xl mx-auto p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{activeCategory?.title ?? "New Article"}</span>
            <span>/</span>
            <span className="text-foreground">{isEditing ? form.title || "Untitled" : activeArticle?.title}</span>
            {!isEditing && (activeArticle as any)?.status && <Badge variant="secondary" className="text-[10px]">{(activeArticle as any).status}</Badge>}
          </div>
          {canEdit && !isEditing && activeArticle && onEditArticle && (
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit article" onClick={() => { onEditArticle(activeArticle!); onEditingChange?.(activeArticle.id); }}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>

        {isEditing ? (
          <>
            <div className="flex items-center gap-2">
              <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Article title" className="h-9 text-base font-semibold" />
              <Button variant="outline" size="sm" onClick={() => setIsPreview((prev) => !prev)} className="gap-1.5">
                <Eye className="h-3.5 w-3.5" /> {isPreview ? "Return to Editing" : "Preview"}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {saveState === "saving" ? "Autosaving…" : saveState === "saved" ? "All changes saved" : "Autosave idle"}
            </div>

            {isPreview ? (
              <div className="border rounded-lg p-4">
                <WikiArticleRenderer bodyJson={toCanonicalDocument(form.content)} emptyMessage="Nothing to preview yet." />
              </div>
            ) : (
              <RichTextEditor content={form.content} onChange={(value) => setForm((prev) => ({ ...prev, content: value }))} placeholder="Write wiki content..." minHeight="380px" />
            )}

            <Input value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Optional change note" className="h-8 text-xs" />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSaveDraft}><Save className="h-3.5 w-3.5" />Save Draft</Button>
              <Button size="sm" className="gap-1.5" onClick={handlePublish}><Upload className="h-3.5 w-3.5" />Publish</Button>
              {editingArticleId && editingArticleId !== "new" && <Button size="sm" variant="outline" className="gap-1.5" onClick={handleUnpublish}><FilePenLine className="h-3.5 w-3.5" />Unpublish</Button>}
              {editingArticleId && editingArticleId !== "new" && <Button size="sm" variant="outline" className="gap-1.5" onClick={handleRollback}><Undo2 className="h-3.5 w-3.5" />Rollback</Button>}
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => onEditingChange?.(null)}><XCircle className="h-3.5 w-3.5" />Cancel editing</Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-foreground tracking-tight">{activeArticle?.title}</h1>
            <WikiArticleRenderer bodyJson={(activeArticle as any)?.body_json} legacyContent={activeArticle?.content} className="text-sm" emptyMessage="No content yet." />
            <div className="pt-6"><HelpFeedbackButtons articleId={activeArticle!.id} pageSlug="wiki" /></div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};

export default WikiContentPanel;
