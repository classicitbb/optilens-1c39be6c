import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { useHelpArticles } from "@/hooks/useHelpArticles";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { ADMIN_CONTEXT_OPTIONS } from "@/lib/adminContexts";
import RichTextEditor from "./RichTextEditor";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { canViewContextSlug } from "@/lib/wikiPermissions";

interface WikiArticleEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: {
    id?: string;
    title: string;
    content: string;
    category?: string;
    page_slug?: string;
    context_slugs?: string[];
    sort_order?: number;
  } | null;
  wikiHeadings: { id: string; title: string }[];
  onSaved?: () => void;
}

const WikiArticleEditDialog = ({
  open,
  onOpenChange,
  article,
  wikiHeadings,
  onSaved,
}: WikiArticleEditDialogProps) => {
  const { upsertArticle } = useHelpArticles();
  const { canView } = useRolePermissions();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: article?.id ?? "",
    title: article?.title ?? "",
    content: article?.content ?? "",
    category: article?.category ?? wikiHeadings[0]?.id ?? "",
    context_slugs: article?.context_slugs?.length ? article.context_slugs : [article?.page_slug ?? "knowledge/wiki"],
    sort_order: article?.sort_order ?? 0,
  });

  useEffect(() => {
    setForm({
      id: article?.id ?? "",
      title: article?.title ?? "",
      content: article?.content ?? "",
      category: article?.category ?? wikiHeadings[0]?.id ?? "",
      context_slugs: article?.context_slugs?.length ? article.context_slugs : [article?.page_slug ?? "knowledge/wiki"],
      sort_order: article?.sort_order ?? 0,
    });
  }, [article, wikiHeadings]);

  const visibleContextOptions = useMemo(
    () => ADMIN_CONTEXT_OPTIONS.filter((option) => canViewContextSlug(option.value, canView)),
    [canView]
  );

  const toggleContext = (slug: string) => {
    setForm((prev) => {
      const hasSlug = prev.context_slugs.includes(slug);
      if (hasSlug) {
        const remaining = prev.context_slugs.filter((entry) => entry !== slug);
        return { ...prev, context_slugs: remaining.length > 0 ? remaining : ["all"] };
      }
      return { ...prev, context_slugs: [...prev.context_slugs, slug] };
    });
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await upsertArticle({
        id: form.id || undefined,
        title: form.title,
        content: form.content,
        page_slug: form.context_slugs[0] ?? "all",
        context_slugs: form.context_slugs,
        sort_order: form.sort_order,
        category: form.category,
      } as any);
      toast({ title: form.id ? "Article updated" : "Article created" });
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      console.error("Wiki article save error:", err);
      toast({ title: "Error saving article", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-[100dvh] max-w-none sm:h-[92vh] sm:w-[94vw] sm:max-w-6xl lg:max-w-7xl flex flex-col p-0 gap-0 rounded-none sm:rounded-lg">
        <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-sm font-semibold">
            {form.id ? "Edit Article" : "New Article"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 min-h-0">
          <div>
            <Label className="text-xs font-medium">Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-8 text-xs mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium">Wiki Heading</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select heading…" />
                </SelectTrigger>
                <SelectContent>
                  {wikiHeadings.map((h) => (
                    <SelectItem key={h.id} value={h.id} className="text-xs">
                      {h.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Context Pages</Label>
              <div className="mt-1 border border-border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                {visibleContextOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={form.context_slugs.includes(option.value)}
                      onCheckedChange={() => toggleContext(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Sort Order</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="h-8 text-xs w-20 mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium mb-1 block">Content</Label>
              <RichTextEditor
                content={form.content}
                onChange={(value) => setForm({ ...form, content: value })}
                placeholder="Write wiki content..."
                minHeight="320px"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-1 block">Preview</Label>
              <div className="border border-border rounded-lg p-3 min-h-[320px] max-h-[420px] overflow-y-auto prose prose-sm max-w-none [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:text-sm [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4">
                <div dangerouslySetInnerHTML={{ __html: form.content || "<p class='text-muted-foreground'>Nothing to preview yet.</p>" }} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 sm:px-5 py-3 border-t border-border shrink-0 bg-background sticky bottom-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : "Save Article"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WikiArticleEditDialog;
